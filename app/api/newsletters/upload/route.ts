import { NextResponse } from "next/server"

import {
  buildNewsletterFileName,
  NEWSLETTER_BUCKET,
  NEWSLETTER_MONTHS,
  type NewsletterMonth,
} from "@/lib/newsletters"
import { userHasPermissionCode } from "@/lib/permissions"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

function isNewsletterMonth(value: string): value is NewsletterMonth {
  return NEWSLETTER_MONTHS.includes(value as NewsletterMonth)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const canUpload = await userHasPermissionCode({
    supabase,
    userId: user.id,
    code: "newsletters.upload",
  })

  if (!canUpload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const monthValue = formData.get("month")
  const yearValue = formData.get("year")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 })
  }

  const isPdfName = file.name.toLowerCase().endsWith(".pdf")
  const isPdfMime = file.type === "application/pdf" || file.type === ""
  if (!isPdfName || !isPdfMime) {
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 })
  }

  if (typeof monthValue !== "string" || !isNewsletterMonth(monthValue)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 })
  }

  if (typeof yearValue !== "string") {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 })
  }

  const year = Number.parseInt(yearValue, 10)
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 })
  }

  const targetFileName = buildNewsletterFileName(monthValue, year)
  const { error } = await supabase
    .storage
    .from(NEWSLETTER_BUCKET)
    .upload(targetFileName, file, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, fileName: targetFileName })
}
