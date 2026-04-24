import { Skeleton } from "@/components/ui/skeleton"

export function AppRouteLoading() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r p-4 lg:block">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="mt-8 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>

          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </main>
    </div>
  )
}
