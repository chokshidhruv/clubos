import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser()
  if (!clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, slug, description, university } = await req.json()

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
  }

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!slugRegex.test(slug)) {
    return NextResponse.json({ error: "Invalid slug format" }, { status: 400 })
  }

  const existing = await db.workspace.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 })
  }

  // ensure user exists in our db
  let dbUser = await db.user.findUnique({ where: { id: clerkUser.id } })
  if (!dbUser) {
    dbUser = await db.user.create({
      data: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0].emailAddress,
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
        image: clerkUser.imageUrl,
      },
    })
  }

  const workspace = await db.workspace.create({
    data: {
      name,
      slug,
      description: description || null,
      university: university || null,
      createdById: dbUser.id,
      members: {
        create: {
          userId: dbUser.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      },
    },
  })

  return NextResponse.json(workspace)
}