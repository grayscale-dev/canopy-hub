import { NextResponse } from "next/server"

import {
  OFFICE_FLOOR_PLAN_BUCKET,
  OFFICE_FLOOR_PLAN_FILE_NAME,
} from "@/lib/office-floor-plan"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .storage
    .from(OFFICE_FLOOR_PLAN_BUCKET)
    .createSignedUrl(OFFICE_FLOOR_PLAN_FILE_NAME, 60 * 10)

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to load Office Floor Plan image." },
      { status: 400 }
    )
  }

  return NextResponse.json({ url: data.signedUrl })
}
