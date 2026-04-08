"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <Button variant="outline" onClick={handleSignOut} disabled={isLoading}>
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  )
}
