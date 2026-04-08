import { createHash } from "node:crypto";

const QLIK_DATE_BASE_UTC_MS = Date.UTC(1899, 11, 30);

interface QlikCellLike {
  qText?: unknown;
  qNum?: unknown;
  qIsNull?: unknown;
}

function asCellLike(value: unknown): QlikCellLike | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if ("qText" in candidate || "qNum" in candidate || "qIsNull" in candidate) {
    return candidate as QlikCellLike;
  }
  return null;
}

function getCellText(value: unknown): string | null {
  const cell = asCellLike(value);
  if (!cell) {
    if (typeof value === "string") return value.trim() || null;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    return null;
  }

  if (cell.qIsNull === true) return null;
  if (typeof cell.qText === "string") {
    const t = cell.qText.trim();
    return t.length ? t : null;
  }
  if (typeof cell.qNum === "number" && Number.isFinite(cell.qNum)) return String(cell.qNum);
  return null;
}

function getCellNum(value: unknown): number | null {
  const cell = asCellLike(value);
  if (cell) {
    if (cell.qIsNull === true) return null;
    if (typeof cell.qNum === "number" && Number.isFinite(cell.qNum)) return cell.qNum;
    if (typeof cell.qText === "string") {
      const parsed = Number(cell.qText.replace(/,/g, "").trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeColumnName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function toText(value: unknown): string {
  const result = getCellText(value);
  return result ?? "";
}

export function toNullableText(value: unknown): string | null {
  return getCellText(value);
}

export function toNumber(value: unknown): number | null {
  return getCellNum(value);
}

export function toNumberPreferText(value: unknown): number | null {
  const text = getCellText(value);
  if (text) {
    const parsed = Number(text.replace(/,/g, "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }

  return getCellNum(value);
}

export function toInteger(value: unknown): number | null {
  const n = getCellNum(value);
  if (n === null) return null;
  return Math.trunc(n);
}

export function toBoolean(value: unknown): boolean | null {
  const n = getCellNum(value);
  if (n !== null) {
    if (n === 1) return true;
    if (n === 0) return false;
  }

  const t = getCellText(value);
  if (!t) return null;
  const normalized = t.trim().toLowerCase();
  if (["true", "t", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "f", "no", "n", "0"].includes(normalized)) return false;
  return null;
}

function qlikNumToDate(num: number): Date {
  return new Date(QLIK_DATE_BASE_UTC_MS + num * 86400000);
}

export function toDate(value: unknown): string | null {
  const t = getCellText(value);
  if (t) {
    const parsed = new Date(t);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  const n = getCellNum(value);
  if (n === null) return null;
  return qlikNumToDate(Math.trunc(n)).toISOString().slice(0, 10);
}

export function toTimestamp(value: unknown): string | null {
  const t = getCellText(value);
  if (t) {
    const parsed = new Date(t);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const n = getCellNum(value);
  if (n === null) return null;
  return qlikNumToDate(n).toISOString();
}

export function toTextArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const out = value.map((v) => String(v).trim()).filter(Boolean);
    return out.length ? out : null;
  }

  const t = getCellText(value);
  if (!t) return null;

  if (t.startsWith("[") && t.endsWith("]")) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) {
        const out = parsed.map((v) => String(v).trim()).filter(Boolean);
        return out.length ? out : null;
      }
    } catch {
      // Fall through to delimited parsing.
    }
  }

  const items = t
    .split(/[;,|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return items.length ? items : null;
}

function stableStringify(input: unknown): string {
  if (input === null || typeof input !== "object") return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map((i) => stableStringify(i)).join(",")}]`;

  const entries = Object.entries(input as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);

  return `{${entries.join(",")}}`;
}

export function stableHash(input: unknown): string {
  const h = createHash("sha256");
  h.update(stableStringify(input));
  return h.digest("hex");
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
