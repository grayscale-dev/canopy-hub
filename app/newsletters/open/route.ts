import { type NextRequest, NextResponse } from "next/server"

import { NEWSLETTER_BUCKET, parseNewsletterFileName } from "@/lib/newsletters"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const requestedFile = request.nextUrl.searchParams.get("file")?.trim() ?? ""
  const parsed = parseNewsletterFileName(requestedFile)
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid newsletter file name." },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .storage
    .from(NEWSLETTER_BUCKET)
    .createSignedUrl(parsed.fileName, 60 * 10)

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to open newsletter." },
      { status: 400 }
    )
  }

  return NextResponse.redirect(data.signedUrl)
}
