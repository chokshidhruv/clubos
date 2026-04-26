# ClubOS

**A multi-tier architecutre workspace platform for university clubs.**

ClubOS centralizes members, event-specific roles, documents, sponsor outreach, tasks, and historical club knowledge into structured, permission-aware workspaces — replacing the scattered mix of Google Drive folders, group chats, spreadsheets, and tribal knowledge that most student organizations rely on today.

> **Status:** In active MVP development
> **Stack:** Next.js 14 · TypeScript · PostgreSQL · Prisma · Clerk · Tailwind · shadcn/ui · Vercel

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Authorization Model](#authorization-model)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Testing Strategy](#testing-strategy)
- [Engineering Highlights](#engineering-highlights)
- [Future Enhancements](#future-enhancements)

---

## The Problem

University clubs operate on tribal knowledge held by one or two senior executives. When those executives graduate, the knowledge leaves with them. Documents exist but lack context. Roles exist but aren't discoverable. Sponsor relationships exist but aren't tracked. Events happen but aren't retrospected.

The pain points are consistent across virtually every student organization:

- Files scattered across Google Drive folders, old chats, and personal accounts
- One person — usually the president — becomes the central source of truth for "where is X"
- Sponsor outreach history is fragile, often living in spreadsheets nobody updates
- A member's role changes per event (general member, marketing lead for one event, volunteer for another) — Drive permissions cannot model this
- Knowledge transfer at executive turnover is informal, incomplete, or simply doesn't happen
- Documents have no operational context: who owns this, what event it belongs to, whether it is still current

The real problem is not file storage. The real problem is **operational context, role clarity, access control, and continuity**.

---

## The Solution

ClubOS provides each club with a private workspace. Inside that workspace:

- The president invites members and assigns them workspace-level roles
- Events are first-class objects with their own members, event-specific roles, tasks, and documents
- Sponsors are tracked in a lightweight CRM with status, owner, follow-up dates, and append-only contact history
- Documents have explicit context (event, sponsor, category) and visibility rules
- An activity feed surfaces what changed across the workspace
- A handoff hub preserves institutional knowledge across executive transitions
- Search spans documents, events, and sponsor records with permission-aware results

Authorization runs through a centralized permission service that combines workspace-level roles with event-specific roles, evaluated on every server request.

---

## Key Features

### Multi-tier workspaces
Each club gets an isolated workspace accessed via a unique slug (`/w/mac-eng-soc/...`). Workspaces cannot see each other's data. A user can belong to multiple workspaces and switch between them.

### Two-dimensional role-based access control
Authorization combines two independent role systems:
- **Workspace roles:** Owner, President, Executive, Member, Viewer
- **Event-specific roles:** Event Lead, Marketing Lead, Sponsorship Lead, Finance Lead, Logistics Lead, Volunteer, Viewer

Effective permissions for an event-scoped resource are the union of both. A general member can be promoted to Marketing Lead for a single event without changing their workspace role.

### Document hub with context and visibility
Documents are not just files in folders. Each document has:
- A type (text note, external link, file upload)
- A category (general, event, sponsor, finance, marketing, handoff, meeting notes, contract, other)
- A visibility rule (everyone, executives only, event team only, sponsorship only, finance only, owner only)
- Optional links to events or sponsors

Visibility is enforced server-side on every list, search, and direct fetch.

### Sponsor CRM
Tracks company name, contact details, status (Not Contacted → Contacted → Follow-up Needed → Interested → Confirmed → Rejected), tier, owner, last contact date, and next follow-up date. Notes are append-only with author and timestamp, preserving the full conversation history across years and executive teams.

### Activity feed and audit trail
Every state-changing operation writes an entry to a single `ActivityLog` table in the same database transaction as the change itself. This serves as both the user-facing activity feed and a tamper-evident audit log — a simplified event-sourcing pattern without the operational overhead of a message broker.

### Workspace-scoped full-text search
Postgres `tsvector` columns and GIN indexes on documents, events, and sponsors. A unified search endpoint queries all three and applies permission filtering before returning results.

### Handoff hub
A workspace can publish a handoff package per academic year, containing role-specific sections (e.g., "VP Sponsorship Handoff Notes") with linked events, sponsors, and documents. Incoming executives have a structured starting point instead of a blank slate.

---

## Architecture

ClubOS uses a **client-server deployment model with a multi-tier (layered) internal architecture**, implemented as a modular monolith in Next.js. The choice of a modular monolith over microservices is deliberate: the application has clear domain boundaries, but the operational and consistency complexity of distributed systems is not justified at this scale.

### Layers

```
┌──────────────────────────────────────────────────────────┐
│  Presentation        React Server + Client Components    │
│                      shadcn/ui, Tailwind, RHF + Zod      │
├──────────────────────────────────────────────────────────┤
│  Application         Server Actions / Route Handlers     │
│                      Authentication, authorization,      │
│                      input validation                    │
├──────────────────────────────────────────────────────────┤
│  Domain Services     Business logic per module           │
│                      (workspaces, events, sponsors, ...) │
├──────────────────────────────────────────────────────────┤
│  Data Access         Prisma client (typed)               │
│                      Activity log writes                 │
├──────────────────────────────────────────────────────────┤
│  Database            PostgreSQL (Neon)                   │
│                      tsvector indexes, foreign keys      │
└──────────────────────────────────────────────────────────┘

  External: Clerk (auth) · UploadThing (files) · Resend (email)
```

### Architectural rules

1. A route handler or server action does three things in order: **authenticate, authorize, delegate** to a module service. It never contains business logic.
2. Modules expose a public interface; cross-module imports go through that interface only.
3. The data access layer is the only layer that touches the database. No raw queries leak upward.
4. Permissions are enforced at the application layer on every protected operation. The UI hiding a button is never the security boundary.
5. Mutating service functions write their state change and the corresponding `ActivityLog` entry in the same transaction.

### Module boundaries

| Module | Responsibility |
|---|---|
| Auth | Session, current user, sign-up/sign-in (Clerk integration) |
| Workspaces | Workspace lifecycle, slug uniqueness, dashboards |
| Members | Membership, invitations (token-based), role changes |
| Permissions | Single `can(userId, workspaceId, action, resource?)` function — the source of truth |
| Events | Event CRUD, event member assignment, status transitions |
| Documents | Text notes, external links, uploaded files, categories, visibility |
| Sponsors | Sponsor records, append-only notes, status pipeline |
| Tasks | Workspace-, event-, and sponsor-scoped tasks |
| Activity | Centralized event logging, activity feed queries |
| Search | Workspace-scoped, permission-filtered full-text search |
| Handoff | Yearly handoff packages with linked resources |

---

## Data Model

The schema is designed around **strict workspace scoping**: every domain entity carries a `workspaceId` and every query filters by it. Composite indexes on `(workspaceId, ...)` keep workspace-bounded queries fast as the dataset grows.

### Core entities

```
User ──┬── WorkspaceMember ──── Workspace ──┬── Invitation
       │                                    │
       │                                    ├── Event ──── EventMember
       │                                    │      │
       │                                    │      └── (tasks, documents)
       │                                    │
       │                                    ├── Document ── DocumentTag
       │                                    │
       │                                    ├── Sponsor ──── SponsorNote
       │                                    │
       │                                    ├── Task
       │                                    │
       │                                    ├── ActivityLog
       │                                    │
       │                                    └── HandoffPackage ── HandoffSection
       │
       └── (authored notes, assigned tasks, uploaded documents, ...)
```

### Design decisions

- **Soft delete via `archivedAt`** on workspaces, events, documents, and sponsors. Hard deletes are avoided to preserve audit trail integrity and enable straightforward undelete.
- **Tasks have at most one parent** — either an event or a sponsor, never both. Enforced in the service layer.
- **Sponsor notes are append-only.** Edits allowed by the original author; deletes are not. This preserves contact history across years.
- **Compound unique constraints** on `(workspaceId, userId)` for memberships and `(eventId, userId)` for event memberships enforce one-membership-per-user at the database level.
- **`ActivityLog.metadata` is JSON** — flexible enough to capture per-action context (e.g., `{ from: "CONTACTED", to: "INTERESTED" }` for a status change) without schema migrations for every new event type.
- **Full-text search** is implemented with Postgres-native `tsvector` columns and GIN indexes, designed to be replaceable with pgvector embeddings for semantic search in a future iteration.

---

## Authorization Model

Authorization is the most security-critical component of any multi-tenant application. ClubOS treats it as a first-class architectural concern.

### Single source of truth

All permission checks flow through one function:

```ts
async function can(
  userId: string,
  workspaceId: string,
  action: Action,
  resource?: { type: 'event' | 'document' | 'sponsor'; id: string }
): Promise<boolean>
```

Every server action begins with this call. There is no second path to a protected operation.

### Three layers of defense

1. **Application layer** — every Prisma query includes `workspaceId` in its where clause; every server action runs `can()` first.
2. **Permission helper layer** — the `can()` function combines workspace role, event role (if applicable), and document visibility into a single boolean.
3. **Database layer (planned)** — Postgres Row-Level Security policies as defense-in-depth. Considered for the MVP but deferred; application-layer enforcement is sufficient and operationally simpler at the current scale.

### RBAC matrix

| Action | Owner | President | Executive | Event Lead* | Member | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Manage workspace settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create event | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit event | ✅ | ✅ | ✅ | ✅ own | ❌ | ❌ |
| Upload document (general) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View `EXECUTIVES_ONLY` doc | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View `EVENT_TEAM_ONLY` doc | ✅ | ✅ | ✅ | ✅ own event | ✅ own event | ❌ |
| Manage sponsors | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create handoff package | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

*Event-specific roles grant scoped access only to the event they apply to.

The full matrix covers 8 roles × 30 actions and serves as the input to the authorization test suite.

### Invitation security

Invitation tokens are cryptographically random (32 bytes, base64url-encoded), single-use, expiring (7 days), optionally email-bound, and revocable. Acceptance is logged with the accepting user's ID for audit purposes.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server components and server actions reduce client/server contract drift; first-class TypeScript support |
| Language | TypeScript (strict) | Type safety across the full stack including database access |
| Database | PostgreSQL (via Neon) | Mature relational store; native full-text search; branchable database for preview environments |
| ORM | Prisma | Type-safe schema and query builder; excellent migration story |
| Auth | Clerk | Production-grade user management, invitations, and email verification out of the box; allowed engineering focus on the multi-tenant authorization layer |
| Styling | Tailwind CSS + shadcn/ui | Consistent design system; accessible primitives |
| Forms / Validation | React Hook Form + Zod | Shared validation schemas between client and server |
| File Storage | UploadThing | Simple integration with signed-URL semantics |
| Email | Resend | Transactional invites |
| Hosting | Vercel | Native Next.js deployment; preview environments per pull request |
| Error Monitoring | Sentry | Production observability |

---

## Project Structure

```
/app
  /(marketing)/             # Public pages
  /(auth)/                  # Clerk-handled auth routes
  /(app)/
    /workspaces/            # Workspace selection
    /w/[slug]/              # Workspace-scoped routes
      /dashboard/
      /events/
      /documents/
      /sponsors/
      /tasks/
      /members/
      /handoff/
      /settings/
/lib
  /auth/                    # Clerk wrappers, current-user helpers
  /permissions/             # Single source of truth for authorization
  /db/                      # Prisma client + extensions
  /activity/                # Activity log helper
  /search/                  # Full-text search service
  /validation/              # Shared Zod schemas
/modules
  /workspaces/
    actions.ts              # Server actions (mutations)
    queries.ts              # Data fetching (reads)
    services.ts             # Business logic
    types.ts
  /events/
  /documents/
  /sponsors/
  /tasks/
  /members/
  /handoff/
/prisma
  schema.prisma
  seed.ts                   # Realistic demo data
/tests
  /permissions/             # Authorization test suite (table-driven)
  /integration/             # Critical user flows
```

---

## Testing Strategy

Testing is prioritized by risk, not by coverage percentage.

### Authorization test suite (highest priority)
Table-driven tests against the RBAC matrix. For each cell `(role, action) → expected`, a test verifies that a user with that role attempting that action receives the expected result. Target: 60+ tests.

```ts
describe('can() — sponsors', () => {
  it.each([
    ['OWNER', 'sponsor.create', true],
    ['PRESIDENT', 'sponsor.create', true],
    ['EXECUTIVE', 'sponsor.create', true],
    ['MEMBER', 'sponsor.create', false],
    ['VIEWER', 'sponsor.create', false],
  ])('role %s, action %s → %s', async (role, action, expected) => {
    const { user, workspace } = await setupUserWithRole(role)
    expect(await can(user.id, workspace.id, action)).toBe(expected)
  })
})
```

### Integration tests
Critical end-to-end flows: invitation acceptance, event role assignment, document visibility enforcement, sponsor status changes generating activity entries.

### Manual QA
Full MVP flow walked before each release. Includes URL-bar probing for cross-tenant access attempts.

### Tooling
Vitest for unit and integration tests; a separate Postgres instance for test isolation; Prisma migrations replayed against the test database before each run.

---

## Engineering Highlights

A few decisions worth calling out for technical reviewers:

**Multi-tenancy at the application layer, with a path to RLS.** Every query is workspace-scoped through a centralized permission helper. Postgres Row-Level Security was considered as a defense-in-depth measure and intentionally deferred — application-layer enforcement is sufficient for the current scale and operationally simpler. The schema is designed to make RLS a non-breaking addition.

**Two-dimensional RBAC tested as a matrix.** Workspace roles and event-specific roles compose into effective permissions. Rather than scattering authorization checks across the codebase, all logic lives in one `can()` function tested exhaustively against a permission matrix. New actions or roles require updating the matrix and the function — nothing else.

**Database-backed event log as a unified activity feed and audit trail.** Every state-changing service function writes its mutation and the corresponding `ActivityLog` entry in a single Prisma transaction. This provides ordering and durability guarantees through Postgres alone, without the operational complexity of a message broker — a deliberate simplification appropriate for the scale.

**Full-text search designed for semantic upgrade.** Postgres `tsvector` columns and GIN indexes today; the same query interface is intended to accept pgvector embeddings for semantic search in a future iteration without changing the consumer-side API.

**Soft delete throughout.** No hard deletes in the MVP. `archivedAt` timestamps preserve audit trail integrity, enable trivial undelete, and avoid cascade-delete data loss. Default queries filter active records; "show archived" toggles surface the rest.

**Last-write-wins concurrency, explicitly chosen.** Real-time collaborative editing is not a goal. Forms save to the server, the latest write wins, and `updatedAt` is shown. Optimistic concurrency control was considered and rejected as unnecessary complexity for the use case.

---

## Future Enhancements

Items intentionally deferred from the MVP, with the schema and architecture designed to accommodate them:

- **Notifications** — email digests and in-app notification center, backed by a job queue
- **Semantic search** — pgvector embeddings on documents and sponsor notes; a permission-aware RAG assistant
- **Postgres Row-Level Security** — defense-in-depth at the database layer
- **Public club pages** — opt-in marketing pages per workspace
- **University SSO** — SAML/Shibboleth for institutional adoption
- **Calendar integration** — events to Google Calendar / iCal
- **Granular executive sub-roles** — VP Sponsorship, VP Finance, VP Marketing as first-class workspace roles
- **Workspace ownership transfer** — formal handoff of Owner role at term end
- **Mobile client** — React Native consuming the same backend

---

## License

MIT (planned)

