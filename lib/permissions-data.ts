import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export interface Permission {
  id: string
  name: string
  page: string
  code: string
}

export interface PermissionUser {
  permissionId: string
  userId: string
  email: string | null
  fullName: string | null
}

export interface PermissionDirectoryUser {
  userId: string
  email: string | null
  fullName: string | null
}

export async function fetchPermissions(): Promise<Permission[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("permissions")
    .select("id,name,page,code")
    .order("name", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Permission[]
}

interface PermissionUserRow {
  permission_id: string
  user_id: string
  email: string | null
  full_name: string | null
}

interface PermissionDirectoryUserRow {
  user_id: string
  email: string | null
  full_name: string | null
}

export async function fetchPermissionUsers(): Promise<PermissionUser[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("list_permission_users")

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as PermissionUserRow[]).map((row) => ({
    permissionId: row.permission_id,
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
  }))
}

export async function fetchPermissionDirectoryUsers(): Promise<
  PermissionDirectoryUser[]
> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("list_permission_directory_users")

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as PermissionDirectoryUserRow[]).map((row) => ({
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
  }))
}
