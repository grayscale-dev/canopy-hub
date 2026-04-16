import { type NextRequest, NextResponse } from "next/server"

import { POLICIES_BUCKET } from "@/lib/policies"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const fileName = request.nextUrl.searchParams.get("file")?.trim() ?? ""
  if (!fileName) {
    return NextResponse.json({ error: "Invalid file name." }, { status: 400 })
  }

  const { data, error } = await supabase
    .storage
    .from(POLICIES_BUCKET)
    .createSignedUrl(fileName, 60 * 10)

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to open policy." },
      { status: 400 }
    )
  }

  return NextResponse.redirect(data.signedUrl)
}
