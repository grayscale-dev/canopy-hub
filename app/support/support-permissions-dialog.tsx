"use client"

import { Settings2Icon } from "lucide-react"

import { PermissionsTable } from "@/app/settings/[section]/permissions-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type {
  Permission,
  PermissionDirectoryUser,
  PermissionUser,
} from "@/lib/permissions-data"

export function SupportPermissionsDialog({
  permissions,
  permissionUsers,
  permissionDirectoryUsers,
  loadError = null,
}: {
  permissions: Permission[]
  permissionUsers: PermissionUser[]
  permissionDirectoryUsers: PermissionDirectoryUser[]
  loadError?: string | null
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon-sm" aria-label="Open support permissions">
          <Settings2Icon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,76rem)]">
        <DialogHeader>
          <DialogTitle>Support Permissions</DialogTitle>
          <DialogDescription>
            Manage permissions that apply to the Support page.
          </DialogDescription>
        </DialogHeader>
        {loadError ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            {loadError}
          </div>
        ) : (
          <PermissionsTable
            permissions={permissions}
            permissionUsers={permissionUsers}
            permissionDirectoryUsers={permissionDirectoryUsers}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
