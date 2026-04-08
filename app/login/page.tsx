import Image from "next/image"
import { redirect } from "next/navigation"

import { GoogleSignInButton } from "@/app/login/google-sign-in-button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import packageJson from "@/package.json"

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/home")
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Image
          src="/logo.png"
          alt="Canopy Hub logo"
          width={120}
          height={40}
          className="mx-auto mb-6 h-10 w-auto dark:hidden"
          priority
        />
        <Image
          src="/logo-light.png"
          alt="Canopy Hub logo"
          width={120}
          height={40}
          className="mx-auto mb-6 hidden h-10 w-auto dark:block"
          priority
        />
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Login to your account</CardTitle>
            <CardDescription>
              Sign in with your Google account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleSignInButton className="w-full" />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Version {packageJson.version}
        </p>
      </div>
    </main>
  )
}
