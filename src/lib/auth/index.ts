import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export async function getCurrentUser() {
  const clerkUser = await currentUser()

  if (!clerkUser) return null

  const dbUser = await db.user.findUnique({
    where: { id: clerkUser.id },
  })

  if (!dbUser) {
    await db.user.create({
      data: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0].email,
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
        image: clerkUser.imageUrl,
      },
    })
  }

  return dbUser
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  return user
}