"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewWorkspacePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault() // stop the broswer's default behaviour which would refresh page

    setLoading(true)
    setError("")

    //form info
    const form = e.currentTarget
    const name = (form.elements.namedItem("name") as HTMLInputElement).value
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value
    const university = (form.elements.namedItem("university") as HTMLInputElement).value

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")

    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, description, university }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Something went wrong")
      setLoading(false)
      return
    }

    router.push(`/w/${data.slug}/dashboard`)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-8">Create a Workspace</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Club Name</label>
            <input
              name="name"
              required
              placeholder="McMaster Software Engineering Club"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              placeholder="What does your club do?"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">University</label>
            <input
              name="university"
              placeholder="McMaster University"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-md text-sm disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Workspace"}
          </button>
        </form>
      </div>
    </div>
  )
}