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
