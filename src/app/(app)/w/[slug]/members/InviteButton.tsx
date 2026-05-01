"use client"

import { useState } from "react"

export default function InviteButton({
  workspaceId,
}: {
  workspaceId: string
}) {
  const [inviteUrl, setInviteUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateInvite() {
    setLoading(true)
    const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "MEMBER" }),
    })
    const data = await res.json()
    setInviteUrl(data.inviteUrl)
    setLoading(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      {inviteUrl ? (
        <>
          <input
            readOnly
            value={inviteUrl}
            className="border rounded px-3 py-1.5 text-xs w-64 bg-gray-50"
          />
          <button
            onClick={copyLink}
            className="text-xs bg-black text-white px-3 py-1.5 rounded"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </>
      ) : (
        <button
          onClick={generateInvite}
          disabled={loading}
          className="text-sm bg-black text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          {loading ? "Generating..." : "Invite Member"}
        </button>
      )}
    </div>
  )
}