import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { can } from "@/lib/permissions"
import { randomBytes } from "crypto"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const clerkUser = await currentUser()
  if (!clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workspaceId } = await params
  const { role } = await req.json()

  const dbUser = await db.user.findUnique({ where: { id: clerkUser.id } })
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const allowed = await can(dbUser.id, workspaceId, "workspace.invite")
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invitation = await db.invitation.create({
    data: {
      workspaceId,
      token,
      role: role ?? "MEMBER",
      expiresAt,
      createdById: dbUser.id,
    },
  })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`

  return NextResponse.json({ inviteUrl, token: invitation.token })
}