import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const user = await requireUser()
  const { token } = await params

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { workspace: true },
  })

  if (!invitation) notFound()

  if (invitation.acceptedAt || invitation.revokedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Link no longer valid</h1>
          <p className="text-gray-500 text-sm">
            This invite has already been used or revoked.
          </p>
        </div>
      </div>
    )
  }

  if (new Date() > invitation.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Invite expired</h1>
          <p className="text-gray-500 text-sm">
            Ask the workspace admin to send a new invite.
          </p>
        </div>
      </div>
    )
  }

  const existingMember = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
      },
    },
  })

  if (existingMember) {
    redirect(`/w/${invitation.workspace.slug}/dashboard`)
  }

  await db.workspaceMember.create({
    data: {
      workspaceId: invitation.workspaceId,
      userId: user.id,
      role: invitation.role,
      status: "ACTIVE",
    },
  })

  await db.invitation.update({
    where: { token },
    data: {
      acceptedAt: new Date(),
      acceptedById: user.id,
    },
  })

  redirect(`/w/${invitation.workspace.slug}/dashboard`)
}