"use client"

import {
  ArrowLeftIcon,
  BookTextIcon,
  PencilIcon,
  UploadIcon,
  X,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload"
import { Input } from "@/components/ui/input"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import type { PolicyFileSummary } from "@/lib/policies"

type ModalView = "open" | "upload"

function toOpenHref(fileName: string) {
  return `/policies/open?file=${encodeURIComponent(fileName)}`
}

export function PoliciesSidebarLauncher({
  policies,
  canManage,
}: {
  policies: PolicyFileSummary[]
  canManage: boolean
}) {
  const router = useRouter()
  const currentYear = new Date().getFullYear()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [modalView, setModalView] = useState<ModalView>("open")
  const [selectedFileName, setSelectedFileName] = useState<string>(
    policies[0]?.fileName ?? ""
  )

  const [isRenameMode, setIsRenameMode] = useState(false)
  const [renameDisplayName, setRenameDisplayName] = useState<string>("")
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renameSuccess, setRenameSuccess] = useState<string | null>(null)

  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [isEmployeeHandbook, setIsEmployeeHandbook] = useState(false)
  const [handbookYear, setHandbookYear] = useState<string>(String(currentYear))
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  const handbookYearOptions = useMemo(() => {
    const options: number[] = []
    for (let year = currentYear + 1; year >= currentYear - 10; year -= 1) {
      options.push(year)
    }
    return options
  }, [currentYear])

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.fileName === selectedFileName) ?? null,
    [policies, selectedFileName]
  )

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const selectedFile = uploadFiles[0]
    if (!selectedFile) {
      setUploadError("Select a file first.")
      setUploadSuccess(null)
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("is_handbook", String(isEmployeeHandbook))
      if (isEmployeeHandbook) {
        formData.append("handbook_year", handbookYear)
      }

      const response = await fetch("/api/policies/upload", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; fileName?: string }
        | null

      if (!response.ok) {
        setUploadError(payload?.error ?? "Upload failed.")
        setUploadSuccess(null)
        return
      }

      setUploadSuccess(`Uploaded ${payload?.fileName ?? "policy"}.`)
      setUploadFiles([])
      setIsEmployeeHandbook(false)
      setIsRenameMode(false)
      setRenameDisplayName("")
      setRenameError(null)
      setRenameSuccess(null)
      router.refresh()
    } catch {
      setUploadError("Upload failed.")
      setUploadSuccess(null)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFileName) {
      setRenameError("Select a policy first.")
      setRenameSuccess(null)
      return
    }

    setIsRenaming(true)
    setRenameError(null)
    setRenameSuccess(null)

    try {
      const formData = new FormData()
      formData.append("old_file_name", selectedFileName)
      formData.append("new_display_name", renameDisplayName)

      const response = await fetch("/api/policies/rename", {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; fileName?: string }
        | null

      if (!response.ok) {
        setRenameError(payload?.error ?? "Rename failed.")
        setRenameSuccess(null)
        return
      }

      setRenameSuccess("Policy renamed.")
      setIsRenameMode(false)
      setRenameDisplayName("")
      setSelectedFileName(payload?.fileName ?? "")
      router.refresh()
    } catch {
      setRenameError("Rename failed.")
      setRenameSuccess(null)
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={(nextOpen) => {
        setIsDialogOpen(nextOpen)
        if (nextOpen) {
          setModalView("open")
          setUploadFiles([])
          setUploadError(null)
          setUploadSuccess(null)
          setIsRenameMode(false)
          setRenameDisplayName("")
          setRenameError(null)
          setRenameSuccess(null)
          if (!selectedFileName && policies[0]?.fileName) {
            setSelectedFileName(policies[0].fileName)
          }
        }
      }}
    >
      <SidebarMenuItem>
        <DialogTrigger asChild>
          <SidebarMenuButton
            type="button"
            className="cursor-pointer"
            tooltip="Policies"
          >
            <BookTextIcon />
            <span className="group-data-[collapsible=icon]:hidden">Policies</span>
          </SidebarMenuButton>
        </DialogTrigger>
      </SidebarMenuItem>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{modalView === "open" ? "Policies" : "Upload Policy"}</DialogTitle>
          {modalView === "open" ? (
            <DialogDescription>
              Select and open a policy. Policy names are shown without file extensions.
            </DialogDescription>
          ) : (
            <DialogDescription>
              Upload a new policy file. Enable handbook mode to force the Employee
              Handbook filename.
            </DialogDescription>
          )}
        </DialogHeader>

        {modalView === "open" ? (
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label htmlFor="policy-select" className="text-sm font-medium">
                Policies
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  id="policy-select"
                  value={selectedFileName}
                  onChange={(event) => {
                    setSelectedFileName(event.target.value)
                    setIsRenameMode(false)
                    setRenameDisplayName("")
                    setRenameError(null)
                    setRenameSuccess(null)
                  }}
                  className="h-10 flex-1 rounded-lg border bg-background pl-3 pr-9 text-sm"
                  disabled={policies.length === 0}
                >
                  {policies.length === 0 ? (
                    <option value="">No policies available</option>
                  ) : (
                    policies.map((policy) => (
                      <option key={policy.fileName} value={policy.fileName}>
                        {policy.displayName}
                      </option>
                    ))
                  )}
                </select>

                {canManage ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 sm:shrink-0"
                    onClick={() => {
                      setModalView("upload")
                      setUploadFiles([])
                      setUploadError(null)
                      setUploadSuccess(null)
                    }}
                  >
                    <UploadIcon />
                    Upload
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedPolicy ? (
                <Button asChild>
                  <a href={toOpenHref(selectedFileName)} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </Button>
              ) : (
                <Button disabled>Open</Button>
              )}
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedPolicy}
                  onClick={() => {
                    if (!selectedPolicy) {
                      return
                    }
                    setIsRenameMode(true)
                    setRenameDisplayName(selectedPolicy.displayName)
                    setRenameError(null)
                    setRenameSuccess(null)
                  }}
                >
                  <PencilIcon />
                  Rename
                </Button>
              ) : null}
              <span className="text-xs text-muted-foreground">Opens in a new tab.</span>
            </div>

            {canManage && isRenameMode ? (
              <form onSubmit={handleRename} className="grid gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">Rename Policy</p>
                <Input
                  value={renameDisplayName}
                  onChange={(event) => setRenameDisplayName(event.target.value)}
                  placeholder="Enter a new policy name"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={!renameDisplayName.trim() || isRenaming}>
                    {isRenaming ? "Saving..." : "Save Name"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsRenameMode(false)
                      setRenameDisplayName("")
                      setRenameError(null)
                      setRenameSuccess(null)
                    }}
                  >
                    Cancel
                  </Button>
                  {renameError ? (
                    <p className="text-sm text-destructive">{renameError}</p>
                  ) : null}
                  {renameSuccess ? (
                    <p className="text-sm text-emerald-600">{renameSuccess}</p>
                  ) : null}
                </div>
              </form>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleUpload} className="grid gap-3">
            <FileUpload
              value={uploadFiles}
              onValueChange={(files) => {
                setUploadFiles(files)
                setUploadError(null)
                setUploadSuccess(null)
              }}
              onFileReject={(_, message) => {
                setUploadError(message)
                setUploadSuccess(null)
              }}
              maxFiles={1}
              maxSize={50 * 1024 * 1024}
              className="w-full"
            >
              <FileUploadDropzone>
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="flex items-center justify-center rounded-full border p-2.5">
                    <UploadIcon className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Drag & drop policy file here</p>
                  <p className="text-xs text-muted-foreground">
                    Or click to browse (max 1 file, up to 50MB)
                  </p>
                </div>
                <FileUploadTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-2 w-fit">
                    Browse file
                  </Button>
                </FileUploadTrigger>
              </FileUploadDropzone>
              <FileUploadList>
                {uploadFiles.map((file) => (
                  <FileUploadItem key={file.name} value={file}>
                    <FileUploadItemPreview />
                    <FileUploadItemMetadata />
                    <FileUploadItemDelete asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <X className="size-4" />
                      </Button>
                    </FileUploadItemDelete>
                  </FileUploadItem>
                ))}
              </FileUploadList>
            </FileUpload>

            <div className="grid gap-3 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isEmployeeHandbook}
                  onChange={(event) => setIsEmployeeHandbook(event.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                Is employee handbook
              </label>

              {isEmployeeHandbook ? (
                <div className="grid gap-1 sm:max-w-[220px]">
                  <label htmlFor="handbook-year" className="text-sm font-medium">
                    Handbook Year
                  </label>
                  <select
                    id="handbook-year"
                    value={handbookYear}
                    onChange={(event) => setHandbookYear(event.target.value)}
                    className="h-10 rounded-lg border bg-background pl-3 pr-9 text-sm"
                  >
                    {handbookYearOptions.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={uploadFiles.length === 0 || isUploading}>
                {isUploading ? "Uploading..." : "Upload Policy"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalView("open")
                  setUploadError(null)
                  setUploadSuccess(null)
                }}
              >
                <ArrowLeftIcon />
                Back
              </Button>
              {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
              {uploadSuccess ? <p className="text-sm text-emerald-600">{uploadSuccess}</p> : null}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
