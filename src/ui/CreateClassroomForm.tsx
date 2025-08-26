"use client"

import { useState } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Alert, AlertDescription } from "../ui/alert"
import { Loader2, Clipboard, Check } from "lucide-react"
import { classroomAPI } from "../lib/classroom-api"
import { useAuth } from "../lib/auth-context"

export default function CreateClassroomForm({ onCreated }: { onCreated?: () => void }) {
  const { tokens } = useAuth()

  const [classroomName, setClassroomName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")

  const [createdId, setCreatedId] = useState<string>("")
  const [joinCode, setJoinCode] = useState<string>("")
  const [copied, setCopied] = useState(false)

  const canSubmit = classroomName.trim().length > 0

  // Map backend errors to friendly messages
  function humanizeError(msg: string) {
    const s = String(msg || "").toUpperCase()

    if (s.includes("MISSING_SCHOOL_ID_ON_ACCOUNT")) {
      return "Your instructor account isn’t linked to a school yet. Open the Profile menu to register your school, then sign out and sign in again."
    }
    if (s.includes("SCHOOL_NOT_FOUND")) {
      return "We couldn’t verify your school. Please sign out and sign back in, then try again."
    }
    if (s.includes("ONLY TEACHERS") || s.includes("INSTRUCTOR_ONLY")) {
      return "Only instructors can create classrooms."
    }
    if (s.includes("UNAUTHORIZED") || s.includes("401")) {
      return "Your session looks expired. Please sign in again."
    }
    return "Failed to create classroom. Please try again."
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!tokens?.IdToken) {
      setError("You need to be signed in as an instructor to create a classroom.")
      return
    }

    setLoading(true)
    setError("")
    setCreatedId("")
    setJoinCode("")
    setCopied(false)

    try {
      const res = await classroomAPI.create(tokens.IdToken, { classroomName: classroomName.trim() })
      setCreatedId(res.classroomID)
      if (res.joinCode) setJoinCode(res.joinCode)
      setClassroomName("")
      onCreated?.()
    } catch (err: any) {
      const raw = String(err?.message || "")
      setError(humanizeError(raw))
    } finally {
      setLoading(false)
    }
  }

  const copyJoinCode = async () => {
    if (!joinCode) return
    try {
      await navigator.clipboard?.writeText(joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore copy errors
    }
  }

  return (
    <div className="rounded-2xl border border-slate-600/50 bg-slate-800/80 p-6 shadow-xl backdrop-blur-sm">
      <h3 className="mb-2 text-xl font-semibold text-white">Create a Classroom</h3>
      <p className="mb-5 text-sm text-slate-300">
        Give your lab a clear name (e.g. <span className="font-semibold">“Physics 11A”</span>).
        After creating, you’ll get a <span className="font-semibold">join code</span> to share with students.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-900/50">
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm text-slate-300">Classroom name</label>
          <Input
            value={classroomName}
            onChange={(e) => setClassroomName(e.target.value)}
            className="bg-slate-700/50 text-white placeholder-slate-400 focus-visible:ring-blue-400"
            placeholder="e.g. Physics 101"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={!canSubmit || loading}
          className="h-10 bg-blue-600 hover:bg-blue-500"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create classroom
        </Button>
      </form>

      {(createdId || joinCode) && (
        <div className="mt-5 rounded-lg border border-slate-600/50 bg-slate-900/40 p-4 text-slate-200">
          <div className="mb-2 text-sm">Classroom created ✅</div>
          {createdId && (
            <div className="text-xs text-slate-400 mb-2">ID: {createdId}</div>
          )}
          {joinCode && (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                Join code: <span className="font-mono text-white">{joinCode}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8 border-slate-600 text-slate-200 hover:bg-slate-700"
                onClick={copyJoinCode}
                title="Copy code"
              >
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Clipboard className="h-4 w-4 mr-2" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Share this code with your students. They can join from their dashboard using
            <span className="font-semibold"> “Join Classroom”</span>.
          </p>
        </div>
      )}
    </div>
  )
}
