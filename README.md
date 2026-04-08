# Canopy Hub

Next.js app with shadcn/ui and Supabase wiring.

## Supabase setup

1. Copy `.env.example` to `.env.local`.
2. Set your project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase clients

- Browser client: `lib/supabase/client.ts`
- Server client: `lib/supabase/server.ts`

Example in a Server Component:

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from("your_table").select("*").limit(10)

  if (error) {
    return <pre>{error.message}</pre>
  }

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

## Adding shadcn components

```bash
pnpm dlx shadcn@latest add button input card
```
