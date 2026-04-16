"use client"

import * as React from "react"
import { Loader2Icon, PlayIcon } from "lucide-react"

import { runAllQlikSyncsAction } from "@/app/settings/actions"
import { Button } from "@/components/ui/button"

interface SyncStatus {
  ok: boolean
  message: string
}

export function AdvancedSyncCard() {
  const [status, setStatus] = React.useState<SyncStatus | null>(null)
  const [isRunning, startTransition] = React.useTransition()

  function handleRunSync() {
    setStatus(null)

    startTransition(async () => {
      try {
        const result = await runAllQlikSyncsAction()
        setStatus(result)
      } catch (error) {
        setStatus({
          ok: false,
          message:
            error instanceof Error ? error.message : "Unable to run Qlik syncs.",
        })
      }
    })
  }

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Advanced</h2>
        <p className="text-sm text-muted-foreground">
          Manually trigger all enabled Qlik source syncs from{" "}
          <code>qlik_source_configs</code>.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={handleRunSync}
          disabled={isRunning}
          className="gap-2"
        >
          {isRunning ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <PlayIcon className="h-4 w-4" />
          )}
          {isRunning ? "Running All Qlik Syncs..." : "Run All Qlik Syncs"}
        </Button>
      </div>

      {status ? (
        <div
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            status.ok
              ? "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {status.message}
        </div>
      ) : null}
    </div>
  )
}
