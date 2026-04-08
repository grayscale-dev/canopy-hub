import { getEnv } from "./env.ts";

export function assertInternalBearer(req: Request): void {
  const env = getEnv();
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.INTERNAL_FUNCTION_BEARER_TOKEN}`;

  if (auth !== expected) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
