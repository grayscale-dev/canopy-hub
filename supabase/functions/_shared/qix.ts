import WebSocket from "npm:ws@8.20.0";
import { getEnv } from "./env.ts";
import type { HypercubeDataPage, QixFetchResult, QixLayout } from "./types.ts";

interface PendingRpc {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

interface FetchSourceObjectInput {
  startAt?: number;
  maxRowsPerRun?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeWsUrl(baseUrl: string, appId: string): string {
  const u = new URL(baseUrl);
  const protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${u.host}/app/${appId}`;
}

function isResultTooLargeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("(6001)") || message.toLowerCase().includes("result too large");
}

export class QixClient {
  private readonly tenantUrl: string;
  private readonly apiKey: string;
  private readonly appId: string;
  private ws: WebSocket | null = null;
  private pending = new Map<number, PendingRpc>();
  private nextId = 1;
  private readonly rpcTimeoutMs: number;
  private readonly closeTimeoutMs: number;
  private readonly connectRetries: number;

  constructor(appId: string) {
    const env = getEnv();
    this.tenantUrl = env.QLIK_TENANT_URL;
    this.apiKey = env.QLIK_API_KEY;
    this.appId = appId;
    this.rpcTimeoutMs = env.QLIK_RPC_TIMEOUT_MS;
    this.closeTimeoutMs = env.QLIK_CLOSE_TIMEOUT_MS;
    this.connectRetries = env.QLIK_CONNECT_RETRIES;
  }

  async connect(): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.connectRetries; attempt++) {
      try {
        await this.connectOnce();
        return;
      } catch (err) {
        lastError = err;
        if (attempt < this.connectRetries) {
          await sleep(300 * (attempt + 1));
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Unable to connect to QIX for app ${this.appId}`);
  }

  private async connectOnce(): Promise<void> {
    const wsUrl = makeWsUrl(this.tenantUrl, this.appId);
    const ws = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        ws.off("error", onError);
        resolve();
      };
      const onError = (err: unknown) => {
        ws.off("open", onOpen);
        reject(err);
      };

      ws.once("open", onOpen);
      ws.once("error", onError);
    });

    ws.on("message", (raw) => this.handleMessage(raw));
    ws.on("error", (err) => this.rejectPending(err));
    ws.on("close", (code) => this.rejectPending(new Error(`WebSocket closed (code ${code})`)));

    this.ws = ws;
  }

  private handleMessage(raw: WebSocket.RawData): void {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const id = msg?.id;
    if (!id || !this.pending.has(id)) return;

    const pending = this.pending.get(id);
    this.pending.delete(id);
    if (!pending) return;

    clearTimeout(pending.timeout);

    if (msg.error) {
      pending.reject(new Error(`${msg.error.message} (${msg.error.code})`));
      return;
    }

    pending.resolve(msg);
  }

  private rejectPending(reason: unknown): void {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(err);
    }
    this.pending.clear();
  }

  async rpc(handle: number, method: string, params: Record<string, unknown> = {}): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket is not open for RPC ${method}`);
    }

    const id = this.nextId++;
    const payload = { jsonrpc: "2.0", id, handle, method, params };

    const responsePromise = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`RPC ${method} timed out after ${this.rpcTimeoutMs}ms`));
      }, this.rpcTimeoutMs);

      this.pending.set(id, { resolve, reject, timeout });
    });

    this.ws.send(JSON.stringify(payload));
    return responsePromise;
  }

  async openDoc(): Promise<number> {
    const msg = await this.rpc(-1, "OpenDoc", { qDocName: this.appId });
    const docHandle = msg?.result?.qReturn?.qHandle;
    if (typeof docHandle !== "number") {
      throw new Error("OpenDoc did not return qHandle");
    }
    return docHandle;
  }

  async getObject(docHandle: number, objectId: string): Promise<{ objectHandle: number; objectType: string | null }> {
    const msg = await this.rpc(docHandle, "GetObject", { qId: objectId });
    const objectHandle = msg?.result?.qReturn?.qHandle;
    const objectType = msg?.result?.qReturn?.qType ?? null;

    if (typeof objectHandle !== "number") {
      throw new Error("GetObject did not return qHandle");
    }

    return { objectHandle, objectType };
  }

  async getLayout(objectHandle: number): Promise<{ layout: QixLayout | null; raw: unknown }> {
    const msg = await this.rpc(objectHandle, "GetLayout", {});
    return {
      layout: msg?.result?.qLayout ?? null,
      raw: msg,
    };
  }

  async getHyperCubeData(
    objectHandle: number,
    width: number,
    height: number,
    top: number,
  ): Promise<{ page: HypercubeDataPage | null; raw: unknown }> {
    const msg = await this.rpc(objectHandle, "GetHyperCubeData", {
      qPath: "/qHyperCubeDef",
      qPages: [
        {
          qTop: top,
          qLeft: 0,
          qHeight: height,
          qWidth: width,
        },
      ],
    });

    return {
      page: msg?.result?.qDataPages?.[0] ?? null,
      raw: msg,
    };
  }

  async fetchSourceObject(
    objectId: string,
    input: FetchSourceObjectInput = {},
  ): Promise<QixFetchResult> {
    const docHandle = await this.openDoc();
    const { objectHandle, objectType } = await this.getObject(docHandle, objectId);
    const { layout, raw: rawLayoutResponse } = await this.getLayout(objectHandle);

    const dataPages: HypercubeDataPage[] = [];
    const rawDataResponses: unknown[] = [];
    let dataError: string | null = null;
    let dataTruncated = false;
    let totalRows = 0;
    let startAt = 0;
    let fetchedRows = 0;
    let hasMore = false;
    let nextStartAt: number | null = null;

    const hc = layout?.qHyperCube;
    if (hc?.qSize) {
      totalRows = Math.max(0, hc.qSize.qcy ?? 0);
      const width = Math.max(1, hc.qSize.qcx ?? 1);
      const env = getEnv();
      const configuredMaxRows = env.QLIK_MAX_ROWS;
      const maxReadableRows =
        configuredMaxRows > 0 ? Math.min(totalRows, configuredMaxRows) : totalRows;
      if (configuredMaxRows > 0 && configuredMaxRows < totalRows) {
        dataTruncated = true;
      }

      const requestedStartAt = Math.max(0, Math.trunc(input.startAt ?? 0));
      startAt = Math.min(requestedStartAt, maxReadableRows);
      const effectiveMaxRowsPerRun =
        input.maxRowsPerRun && input.maxRowsPerRun > 0
          ? Math.trunc(input.maxRowsPerRun)
          : env.QLIK_MAX_ROWS_PER_RUN;
      const targetRows = Math.max(
        0,
        Math.min(maxReadableRows - startAt, effectiveMaxRowsPerRun),
      );

      const pageSize = Math.max(1, env.QLIK_PAGE_SIZE);
      let qTop = startAt;
      const qEnd = startAt + targetRows;

      while (qTop < qEnd) {
        let qHeight = Math.min(pageSize, qEnd - qTop);
        let fetched = false;

        while (!fetched) {
          try {
            const { page, raw } = await this.getHyperCubeData(objectHandle, width, qHeight, qTop);
            rawDataResponses.push(raw);
            if (page) dataPages.push(page);
            qTop += qHeight;
            fetched = true;
          } catch (err) {
            if (isResultTooLargeError(err)) {
              if (qHeight <= 1) {
                dataError = `GetHyperCubeData result too large at row ${qTop}: ${
                  err instanceof Error ? err.message : String(err)
                }`;
                dataTruncated = true;
                qTop = qEnd;
                fetched = true;
              } else {
                qHeight = Math.max(1, Math.floor(qHeight / 2));
              }
            } else {
              throw err;
            }
          }
        }
      }

      fetchedRows = Math.max(0, qTop - startAt);
      hasMore = qTop < maxReadableRows;
      nextStartAt = hasMore ? qTop : null;
    }

    return {
      objectType,
      layout,
      dataPages,
      rawLayoutResponse,
      rawDataResponses,
      dataError,
      dataTruncated,
      totalRows,
      startAt,
      fetchedRows,
      hasMore,
      nextStartAt,
    };
  }

  async close(): Promise<void> {
    if (!this.ws) return;

    if (this.ws.readyState === WebSocket.CLOSED) {
      this.ws = null;
      return;
    }

    await new Promise<void>((resolve) => {
      const ws = this.ws;
      if (!ws) return resolve();

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        ws.removeAllListeners("close");
        resolve();
      };

      const timeout = setTimeout(() => {
        finish();
      }, this.closeTimeoutMs);

      ws.once("close", () => {
        clearTimeout(timeout);
        finish();
      });

      try {
        ws.close();
      } catch {
        clearTimeout(timeout);
        finish();
      }
    });

    this.ws = null;
  }
}
