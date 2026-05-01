import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const user = await requireUser()
  const { slug } = await params

  const workspace = await db.workspace.findUnique({
    where: { slug },
  })

  if (!workspace) notFound()

  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
  })

  if (!member || member.status !== "ACTIVE") redirect("/workspaces")

  const navItems = [
    { label: "Dashboard", href: `/w/${slug}/dashboard` },
    { label: "Events", href: `/w/${slug}/events` },
    { label: "Documents", href: `/w/${slug}/documents` },
    { label: "Sponsors", href: `/w/${slug}/sponsors` },
    { label: "Tasks", href: `/w/${slug}/tasks` },
    { label: "Members", href: `/w/${slug}/members` },
    { label: "Handoff", href: `/w/${slug}/handoff` },
    { label: "Settings", href: `/w/${slug}/settings` },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-56 border-r bg-gray-50 flex flex-col p-4 gap-1">
        {/* Workspace name */}
        <div className="mb-4">
          <Link href="/workspaces" className="text-xs text-gray-400 hover:text-black">
            ← All workspaces
          </Link>
          <h2 className="font-bold text-sm mt-2 truncate">{workspace.name}</h2>
          <span className="text-xs text-gray-400">{member.role}</span>
        </div>

        {/* Nav links */}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm px-3 py-2 rounded hover:bg-gray-200 transition text-gray-700"
          >
            {item.label}
          </Link>
        ))}

        {/* Bottom */}
        <div className="mt-auto pt-4 border-t">
          <Link
            href="/workspaces"
            className="text-xs text-gray-400 hover:text-black"
          >
            Switch workspace
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}