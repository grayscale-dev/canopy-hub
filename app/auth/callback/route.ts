import { type NextRequest, NextResponse } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  const nextPath = next && next.startsWith("/") ? next : "/home"
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https"
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(nextPath, origin))
}
