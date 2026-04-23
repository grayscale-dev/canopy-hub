import { getServiceClient } from "../_shared/db.ts";
import { getEnv } from "../_shared/env.ts";
import { log } from "../_shared/logger.ts";
import type { DispatchFailure } from "../_shared/types.ts";
import { jsonResponse } from "../_shared/utils.ts";

interface DispatchSourceConfig {
  id: string;
  sync_key: string;
  is_enabled: boolean;
}

interface SyncChunkResponse {
  success?: boolean;
  hasMore?: boolean;
  nextStartAt?: number | null;
  error?: string | null;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

function assertSchedulerBearer(req: Request): void {
  const env = getEnv();
  const auth = req.headers.get("authorization") ?? "";
  const internalExpected = `Bearer ${env.INTERNAL_FUNCTION_BEARER_TOKEN}`;
  const serviceRoleExpected = `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`;

  if (auth === internalExpected || auth === serviceRoleExpected) {
    return;
  }

  throw new Response(
    JSON.stringify({ error: "Unauthorized" }),
    {
      status: 401,
      headers: { "content-type": "application/json" },
    },
  );
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const workers: Promise<void>[] = [];
  const queue = [...items];

  const run = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  };

  for (let i = 0; i < Math.max(1, concurrency); i++) {
    workers.push(run());
  }

  await Promise.all(workers);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    assertSchedulerBearer(req);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: getErrorMessage(err) }, 401);
  }

  const env = getEnv();
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("qlik_source_configs")
    .select("id,sync_key,is_enabled")
    .eq("is_enabled", true)
    .order("sync_key", { ascending: true });

  if (error) {
    return jsonResponse({ error: `Unable to load enabled source configs: ${error.message}` }, 500);
  }

  const sourceConfigs = (data ?? []) as DispatchSourceConfig[];
  const failures: DispatchFailure[] = [];
  let dispatched = 0;
  let chunkInvocations = 0;

  const endpoint = `${env.SUPABASE_URL}/functions/v1/qlik-sync-source`;

  await runWithConcurrency(sourceConfigs, env.DISPATCH_CONCURRENCY, async (source) => {
    try {
      let nextStartAt = 0;
      let attempts = 0;
      const maxChunkAttempts = 200;

      while (attempts < maxChunkAttempts) {
        attempts += 1;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${env.INTERNAL_FUNCTION_BEARER_TOKEN}`,
          },
          body: JSON.stringify({ sourceConfigId: source.id, startAt: nextStartAt }),
        });

        chunkInvocations += 1;

        if (!res.ok) {
          const text = await res.text();
          failures.push({
            sourceConfigId: source.id,
            syncKey: source.sync_key,
            status: res.status,
            error: text.slice(0, 500),
          });
          return;
        }

        const payload = (await res.json().catch(() => null)) as SyncChunkResponse | null;

        if (payload?.success === false) {
          failures.push({
            sourceConfigId: source.id,
            syncKey: source.sync_key,
            error: payload.error?.slice(0, 500) || "Chunk sync failed.",
          });
          return;
        }

        if (!payload?.hasMore) {
          dispatched += 1;
          return;
        }

        if (typeof payload.nextStartAt !== "number" || payload.nextStartAt <= nextStartAt) {
          failures.push({
            sourceConfigId: source.id,
            syncKey: source.sync_key,
            error: "Chunk sync reported hasMore=true with invalid nextStartAt.",
          });
          return;
        }

        nextStartAt = payload.nextStartAt;
      }

      failures.push({
        sourceConfigId: source.id,
        syncKey: source.sync_key,
        error: "Exceeded max chunk attempts before completion.",
      });
    } catch (err) {
      failures.push({
        sourceConfigId: source.id,
        syncKey: source.sync_key,
        error: getErrorMessage(err),
      });
    }
  });

  log("info", "qlik-dispatch-daily completed", {
    totalFound: sourceConfigs.length,
    totalDispatched: dispatched,
    totalChunkInvocations: chunkInvocations,
    failureCount: failures.length,
  });

  return jsonResponse({
    totalConfigsFound: sourceConfigs.length,
    totalDispatched: dispatched,
    totalChunkInvocations: chunkInvocations,
    dispatchFailures: failures,
  });
});
