import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function LandingPage() {
  const user = await currentUser()
  if (user) redirect("/workspaces")

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b">
        <span className="font-bold text-xl">ClubOS</span>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-gray-600 hover:text-black"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm bg-black text-white px-4 py-2 rounded-md"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-block bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full mb-6">
          Built for university clubs
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          The operating system
          <br />
          for student clubs
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
          Replace the scattered mix of Drive folders, Discord messages, and
          "ask the president" with one structured workspace for your entire club.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="bg-black text-white px-6 py-3 rounded-md text-sm font-medium"
          >
            Create your workspace
          </Link>
          <Link
            href="/sign-in"
            className="text-sm text-gray-600 hover:text-black"
          >
            Sign in →
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Role-based access",
              description:
                "Workspace roles and event-specific roles. Every member knows exactly what they own.",
            },
            {
              title: "Sponsor CRM",
              description:
                "Track outreach, contact history, follow-up dates, and sponsorship tiers — all in one place.",
            },
            {
              title: "Executive handoff",
              description:
                "Preserve institutional memory across transitions. Incoming execs don't start from zero.",
            },
            {
              title: "Event management",
              description:
                "Each event gets its own space — members, roles, tasks, documents, and retrospectives.",
            },
            {
              title: "Document hub",
              description:
                "Every document has context, category, and visibility rules. No more asking where things are.",
            },
            {
              title: "Activity feed",
              description:
                "See what changed across your workspace without reading through chat history.",
            },
          ].map((feature) => (
            <div key={feature.title} className="border rounded-lg p-5">
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-8 py-6 text-center text-sm text-gray-400">
        ClubOS — built for university clubs
      </div>
    </div>
  )
}