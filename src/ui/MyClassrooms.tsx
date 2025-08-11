"use client"

import { useEffect, useState } from "react"
import { Button } from "../ui/button"
import { Loader2, Users } from "lucide-react"
import { classroomAPI, type Classroom, type Member } from "../lib/classroom-api"
import { useAuth } from "../lib/auth-context"

export default function MyClassrooms({ isTeacher }: { isTeacher: boolean }) {
  const { tokens } = useAuth()
  const [items, setItems] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [openId, setOpenId] = useState<string | null>(null)
  const [members, setMembers] = useState<Record<string, Member[]>>({})
  const [mLoading, setMLoading] = useState<string | null>(null)

  const load = async () => {
    if (!tokens?.AccessToken) return
    setLoading(true)
    setError("")
    try {
      const data = await classroomAPI.listMine(tokens.AccessToken) // ← updated
      setItems(data ?? [])
    } catch (err: any) {
      setError(err.message || "Failed to load classrooms")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens?.AccessToken])

  const toggleMembers = async (id: string) => {
    if (openId === id) {
      setOpenId(null)
      return
    }
    if (!tokens?.AccessToken) return
    // fetch only once per classroom
    if (!members[id]) {
      setMLoading(id)
      try {
        const res = await classroomAPI.members(tokens.AccessToken, id)
        setMembers((m) => ({ ...m, [id]: res.members }))
      } catch {
        // optionally show an alert
      } finally {
        setMLoading(null)
      }
    }
    setOpenId(id)
  }

  if (loading) {
    return (
      <div className="grid place-items-center p-8 text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading classrooms…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-700/50 bg-red-900/30 p-4 text-red-200">
        {error}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-slate-300">
        No classrooms yet.
      </div>
    )
  }

  const displayName = (m: Member) => {
    const fn = m.firstName ?? m.given_name ?? ""
    const ln = m.lastName ?? m.family_name ?? ""
    if (fn || ln) return `${fn} ${ln}`.trim()
    return m.email ?? "Unknown"
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <li
          key={c.classroomID}
          className="rounded-xl border border-slate-600/50 bg-slate-800/70 p-5 shadow"
        >
          <div className="mb-2 text-lg font-semibold text-white">
            {c.classroomName}
          </div>
          <div className="text-sm text-slate-300">
            {c.school ?? c.schoolId ?? ""}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Created: {new Date(c.createdAt).toLocaleString()}
          </div>
          {isTeacher && c.joinCode && (
            <div className="mt-2 text-sm text-blue-300">
              Join code: <span className="font-mono">{c.joinCode}</span>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              className="border-slate-500 text-slate-200 hover:bg-slate-700"
              onClick={() => toggleMembers(c.classroomID)}
              disabled={mLoading === c.classroomID}
            >
              <Users className="mr-2 h-4 w-4" />
              {openId === c.classroomID
                ? "Hide members"
                : mLoading === c.classroomID
                ? "Loading…"
                : "View members"}
            </Button>
          </div>

          {openId === c.classroomID && (
            <div className="mt-4 rounded-lg border border-slate-600/50 bg-slate-900/40 p-3">
              {!members[c.classroomID]?.length ? (
                <div className="text-sm text-slate-400">No members yet.</div>
              ) : (
                <ul className="space-y-2">
                  {members[c.classroomID].map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm text-slate-200"
                    >
                      <span>{displayName(m)}</span>
                      <span className="text-slate-400">{m.grade ?? ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
