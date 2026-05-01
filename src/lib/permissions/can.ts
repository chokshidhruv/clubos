import { db } from "@/lib/db"

export type Action =
  | "workspace.manage"
  | "workspace.invite"
  | "workspace.change_roles"
  | "workspace.remove_members"
  | "event.create"
  | "event.edit"
  | "event.assign_roles"
  | "event.delete"
  | "task.create"
  | "task.assign"
  | "task.complete_own"
  | "task.complete_any"
  | "document.create"
  | "document.edit"
  | "document.delete"
  | "document.view_executives_only"
  | "document.view_sponsorship_only"
  | "document.view_finance_only"
  | "sponsor.create"
  | "sponsor.edit"
  | "sponsor.view"
  | "sponsor.note"
  | "handoff.create"
  | "handoff.edit"
  | "handoff.view"
  | "activity.view"
  | "members.view"

type WorkspaceRole = "OWNER" | "PRESIDENT" | "EXECUTIVE" | "MEMBER" | "VIEWER"

const ROLE_PERMISSIONS: Record<WorkspaceRole, Action[]> = {
  OWNER: [
    "workspace.manage",
    "workspace.invite",
    "workspace.change_roles",
    "workspace.remove_members",
    "event.create",
    "event.edit",
    "event.assign_roles",
    "event.delete",
    "task.create",
    "task.assign",
    "task.complete_own",
    "task.complete_any",
    "document.create",
    "document.edit",
    "document.delete",
    "document.view_executives_only",
    "document.view_sponsorship_only",
    "document.view_finance_only",
    "sponsor.create",
    "sponsor.edit",
    "sponsor.view",
    "sponsor.note",
    "handoff.create",
    "handoff.edit",
    "handoff.view",
    "activity.view",
    "members.view",
  ],
  PRESIDENT: [
    "workspace.manage",
    "workspace.invite",
    "workspace.change_roles",
    "workspace.remove_members",
    "event.create",
    "event.edit",
    "event.assign_roles",
    "event.delete",
    "task.create",
    "task.assign",
    "task.complete_own",
    "task.complete_any",
    "document.create",
    "document.edit",
    "document.delete",
    "document.view_executives_only",
    "document.view_sponsorship_only",
    "document.view_finance_only",
    "sponsor.create",
    "sponsor.edit",
    "sponsor.view",
    "sponsor.note",
    "handoff.create",
    "handoff.edit",
    "handoff.view",
    "activity.view",
    "members.view",
  ],
  EXECUTIVE: [
    "workspace.invite",
    "event.create",
    "event.edit",
    "event.assign_roles",
    "task.create",
    "task.assign",
    "task.complete_own",
    "task.complete_any",
    "document.create",
    "document.edit",
    "document.view_executives_only",
    "document.view_sponsorship_only",
    "document.view_finance_only",
    "sponsor.create",
    "sponsor.edit",
    "sponsor.view",
    "sponsor.note",
    "handoff.edit",
    "handoff.view",
    "activity.view",
    "members.view",
  ],
  MEMBER: [
    "task.complete_own",
    "task.create",
    "activity.view",
    "members.view",
  ],
  VIEWER: [
    "activity.view",
    "members.view",
  ],
}

export async function can(
  userId: string,
  workspaceId: string,
  action: Action
): Promise<boolean> {
  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  if (!member || member.status !== "ACTIVE") return false

  const role = member.role as WorkspaceRole
  const allowed = ROLE_PERMISSIONS[role] ?? []

  return allowed.includes(action)
}

export async function requirePermission(
  userId: string,
  workspaceId: string,
  action: Action
): Promise<void> {
  const allowed = await can(userId, workspaceId, action)
  if (!allowed) {
    throw new Error("Forbidden")
  }
}