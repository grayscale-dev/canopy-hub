import { redirect } from "next/navigation"

export const metadata = {
  title: "Policies",
}

export default function PoliciesPage() {
  redirect("/home")
}
