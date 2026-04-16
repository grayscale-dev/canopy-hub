import { NextResponse } from "next/server"

import {
  OFFICE_FLOOR_PLAN_BUCKET,
  OFFICE_FLOOR_PLAN_FILE_NAME,
  OFFICE_FLOOR_PLAN_UPLOAD_PERMISSION,
  isAllowedOfficeFloorPlanImage,
} from "@/lib/office-floor-plan"
import { userHasPermissionCode } from "@/lib/permissions"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

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
    code: OFFICE_FLOOR_PLAN_UPLOAD_PERMISSION,
  })

  if (!canUpload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 })
  }

  if (!isAllowedOfficeFloorPlanImage(file)) {
    return NextResponse.json(
      {
        error:
          "Only image files are allowed (JPG, JPEG, PNG, WEBP, GIF, BMP, TIFF, HEIC, HEIF).",
      },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .storage
    .from(OFFICE_FLOOR_PLAN_BUCKET)
    .upload(OFFICE_FLOOR_PLAN_FILE_NAME, file, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, fileName: OFFICE_FLOOR_PLAN_FILE_NAME })
}
