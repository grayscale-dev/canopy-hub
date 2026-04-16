"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export function GoogleSignInButton({ className }: { className?: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)

    const supabase = createSupabaseBrowserClient()
    const redirectTo = new URL("/auth/callback", window.location.origin).toString()

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: "openid email profile",
      },
    })
  }

  return (
    <Button
      className={cn(className)}
      onClick={handleSignIn}
      disabled={isLoading}
    >
      {isLoading ? "Redirecting..." : "Continue with Google"}
    </Button>
  )
}
