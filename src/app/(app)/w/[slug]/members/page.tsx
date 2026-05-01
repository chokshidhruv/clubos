import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { can } from "@/lib/permissions"
import { notFound } from "next/navigation"
import InviteButton from "./InviteButton"

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const user = await requireUser()
  const { slug } = await params

  const workspace = await db.workspace.findUnique({
    where: { slug },
    include: {
      members: {
        where: { status: "ACTIVE" },
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  })

  if (!workspace) notFound()

  const canInvite = await can(user.id, workspace.id, "workspace.invite")
  const canChangeRoles = await can(user.id, workspace.id, "workspace.change_roles")

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Members</h1>
          {canInvite && (
            <InviteButton workspaceId={workspace.id} />
          )}
        </div>

        <div className="border rounded-lg divide-y">
          {workspace.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-sm">
                  {m.user.name ?? m.user.email}
                </p>
                <p className="text-xs text-gray-400">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {m.role}
                </span>
                {canChangeRoles && m.userId !== user.id && (
                  <span className="text-xs text-gray-400 cursor-pointer hover:text-black">
                    Change role
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}