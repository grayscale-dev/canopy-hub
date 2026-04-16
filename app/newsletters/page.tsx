import { redirect } from "next/navigation"

export const metadata = {
  title: "Newsletters",
}

export default function NewslettersPage() {
  redirect("/home")
}
