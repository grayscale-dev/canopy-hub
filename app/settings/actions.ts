"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { userHasPermissionCode } from "@/lib/permissions"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function getRequiredString(formData: FormData, key: string, label: string) {
  const value = getString(formData, key)
  if (!value) {
    throw new Error(`${label} is required`)
  }

  return value
}

async function getPermissionsEditorClient() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const canEditPermissions = await userHasPermissionCode({
    supabase,
    userId: user.id,
    code: "permissions.edit",
  })

  if (!canEditPermissions) {
    throw new Error("Unauthorized")
  }

  return supabase
}

export async function updatePermissionAction(formData: FormData) {
  const supabase = await getPermissionsEditorClient()
  const id = getRequiredString(formData, "permission_id", "Permission id")
  const name = getRequiredString(formData, "name", "Name")
  const page = getRequiredString(formData, "page", "Page")
  const code = getRequiredString(formData, "code", "Code")

  const { error } = await supabase
    .from("permissions")
    .update({
      name,
      page,
      code,
    })
    .eq("id", id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/settings/permissions")
}

export async function addPermissionUserAction(formData: FormData) {
  const supabase = await getPermissionsEditorClient()
  const permissionId = getRequiredString(formData, "permission_id", "Permission id")
  const userId = getRequiredString(formData, "user_id", "User id")

  const { error } = await supabase.from("user_permissions").upsert(
    {
      permission_id: permissionId,
      user_id: userId,
    },
    {
      onConflict: "user_id,permission_id",
      ignoreDuplicates: true,
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/settings/permissions")
}

export async function addPermissionUsersAction(formData: FormData) {
  const supabase = await getPermissionsEditorClient()
  const permissionId = getRequiredString(formData, "permission_id", "Permission id")
  const rawUserIds = getRequiredString(formData, "user_ids", "User ids")

  let userIds: string[] = []
  try {
    const parsed = JSON.parse(rawUserIds)
    if (Array.isArray(parsed)) {
      userIds = parsed
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    }
  } catch {
    throw new Error("Invalid user ids payload")
  }

  if (!userIds.length) {
    throw new Error("Select at least one user")
  }

  const rows = userIds.map((userId) => ({
    permission_id: permissionId,
    user_id: userId,
  }))

  const { error } = await supabase.from("user_permissions").upsert(rows, {
    onConflict: "user_id,permission_id",
    ignoreDuplicates: true,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/settings/permissions")
}

export async function removePermissionUserAction(formData: FormData) {
  const supabase = await getPermissionsEditorClient()
  const permissionId = getRequiredString(formData, "permission_id", "Permission id")
  const userId = getRequiredString(formData, "user_id", "User id")

  const { error } = await supabase
    .from("user_permissions")
    .delete()
    .eq("permission_id", permissionId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/settings/permissions")
}

interface QlikSourceConfigRow {
  id: string
  sync_key: string
  is_enabled: boolean
}

interface QlikSyncChunkResponse {
  success?: boolean
  error?: string | null
  hasMore?: boolean
  nextStartAt?: number | null
}

export interface RunAllQlikSyncsResult {
  ok: boolean
  message: string
}

export async function runAllQlikSyncsAction(): Promise<RunAllQlikSyncsResult> {
  const supabase = await getPermissionsEditorClient()

  const { data: sources, error: sourcesError } = await supabase
    .from("qlik_source_configs")
    .select("id,sync_key,is_enabled")
    .eq("is_enabled", true)
    .order("sync_key", { ascending: true })

  if (sourcesError) {
    return {
      ok: false,
      message: sourcesError.message || "Unable to load qlik_source_configs.",
    }
  }

  const enabledSources = ((sources ?? []) as QlikSourceConfigRow[]).filter(
    (source) => Boolean(source.id) && Boolean(source.sync_key)
  )

  if (enabledSources.length === 0) {
    return {
      ok: true,
      message: "No enabled Qlik source configs were found.",
    }
  }

  const failures: string[] = []
  let completedCount = 0

  for (const source of enabledSources) {
    let nextStartAt = 0
    let attempts = 0
    let sourceFailed = false
    const maxChunkAttempts = 200

    while (attempts < maxChunkAttempts) {
      attempts += 1

      const { data, error } = await supabase.functions.invoke("qlik-sync-source", {
        body: { sourceConfigId: source.id, startAt: nextStartAt },
      })

      const payload = (data ?? null) as QlikSyncChunkResponse | null

      if (error || payload?.success === false) {
        sourceFailed = true
        failures.push(
          `${source.sync_key}: ${payload?.error || error?.message || "Sync failed."}`
        )
        break
      }

      if (!payload?.hasMore) {
        completedCount += 1
        break
      }

      if (
        typeof payload.nextStartAt !== "number" ||
        payload.nextStartAt <= nextStartAt
      ) {
        sourceFailed = true
        failures.push(
          `${source.sync_key}: Invalid chunk cursor returned by edge function.`
        )
        break
      }

      nextStartAt = payload.nextStartAt
    }

    if (!sourceFailed && attempts >= maxChunkAttempts) {
      failures.push(
        `${source.sync_key}: Exceeded max chunk attempts before completion.`
      )
    }
  }

  revalidatePath("/settings/advanced")

  if (failures.length > 0) {
    const preview = failures.slice(0, 5).join(" | ")
    return {
      ok: false,
      message: `${failures.length} of ${enabledSources.length} syncs failed. ${preview}`,
    }
  }

  return {
    ok: true,
    message: `Completed ${completedCount} of ${enabledSources.length} enabled source syncs.`,
  }
}
