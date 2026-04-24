"use client"

import { useEffect } from "react"

import { FEATUREBASE_APP_ID } from "@/lib/featurebase"

type FeaturebaseBootConfig = {
  appId: string
  email?: string
  userId?: string
  name?: string
}

type FeaturebaseFn = ((method: string, config?: FeaturebaseBootConfig) => void) & {
  q?: unknown[]
}

declare global {
  interface Window {
    Featurebase?: FeaturebaseFn
  }
}

function ensureFeaturebaseSdk() {
  if (typeof window === "undefined") {
    return
  }

  if (typeof window.Featurebase !== "function") {
    const queuedFn: FeaturebaseFn = ((...args: unknown[]) => {
      queuedFn.q = queuedFn.q || []
      queuedFn.q.push(args)
    }) as FeaturebaseFn
    window.Featurebase = queuedFn
  }

  if (document.getElementById("featurebase-sdk")) {
    return
  }

  const sdkScript = document.createElement("script")
  sdkScript.id = "featurebase-sdk"
  sdkScript.src = "https://do.featurebase.app/js/sdk.js"
  sdkScript.async = true
  document.head.appendChild(sdkScript)
}

export function FeaturebaseMessenger({
  email,
  userId,
  name,
}: {
  email: string | null
  userId: string
  name: string | null
}) {
  useEffect(() => {
    ensureFeaturebaseSdk()

    const bootPayload: FeaturebaseBootConfig = {
      appId: FEATUREBASE_APP_ID,
      userId,
    }

    if (email) {
      bootPayload.email = email
    }

    if (name) {
      bootPayload.name = name
    }

    window.Featurebase?.("boot", bootPayload)
  }, [email, name, userId])

  return null
}
