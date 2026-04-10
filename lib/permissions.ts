import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export async function userHasPermissionCode({
  supabase,
  userId,
  code,
}: {
  supabase: SupabaseServerClient
  userId: string
  code: string
}) {
  const { data: permission, error: permissionError } = await supabase
    .from("permissions")
    .select("id")
    .eq("code", code)
    .maybeSingle()

  if (permissionError) {
    throw new Error(permissionError.message)
  }

  if (!permission?.id) {
    return false
  }

  const { count, error: permissionCountError } = await supabase
    .from("user_permissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("permission_id", permission.id)

  if (permissionCountError) {
    throw new Error(permissionCountError.message)
  }

  return (count ?? 0) > 0
}
