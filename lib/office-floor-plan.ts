export const OFFICE_FLOOR_PLAN_BUCKET = "Misc"
export const OFFICE_FLOOR_PLAN_FILE_NAME = "Office Floor Plan.jpg"
export const OFFICE_FLOOR_PLAN_UPLOAD_PERMISSION = "office-floor-plan.upload"

export const OFFICE_FLOOR_PLAN_ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
] as const

export const OFFICE_FLOOR_PLAN_ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
] as const

export function isAllowedOfficeFloorPlanImage(file: File) {
  const type = file.type.toLowerCase()
  if (
    type &&
    OFFICE_FLOOR_PLAN_ALLOWED_IMAGE_MIME_TYPES.includes(
      type as (typeof OFFICE_FLOOR_PLAN_ALLOWED_IMAGE_MIME_TYPES)[number]
    )
  ) {
    return true
  }

  const fileNameLower = file.name.toLowerCase()
  return OFFICE_FLOOR_PLAN_ALLOWED_IMAGE_EXTENSIONS.some((extension) =>
    fileNameLower.endsWith(extension)
  )
}
