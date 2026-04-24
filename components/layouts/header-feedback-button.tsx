import Link from "next/link"
import { MessageSquarePlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function HeaderFeedbackButton({ className }: { className?: string }) {
  return (
    <Button asChild variant="outline" size="sm" className={cn(className)}>
      <Link
        href="https://canopyhub.featurebase.app/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageSquarePlusIcon className="size-4" />
        Submit Feedback
      </Link>
    </Button>
  )
}
