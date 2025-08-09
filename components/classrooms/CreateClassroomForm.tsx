"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { classroomAPI } from "@/lib/classroom-api"
import { useAuth } from "@/lib/auth-context"

export default function CreateClassroomForm({ onCreated }: { onCreated?: () => void }) {
  const { tokens } = useAuth()
  const [classroomName, setClassroomName] = useState("")
  const [school, setSchool] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const canSubmit = !!classroomName && !!school

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokens?.AccessToken) return setError("Not authenticated.")
    setLoading(true); setError("")
    try {
      await classroomAPI.create(tokens.AccessToken, { classroomName, school })
      setClassroomName(""); setSchool("")
      onCreated?.()
    } catch (err: any) {
      setError(err.message || "Failed to create classroom")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-600/50 bg-slate-800/80 p-6 shadow-xl backdrop-blur-sm">
      <h3 className="mb-4 text-xl font-semibold text-white">Create a Classroom</h3>
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
            placeholder="Physics 101"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-slate-300">School</label>
          <Input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="bg-slate-700/50 text-white placeholder-slate-400 focus-visible:ring-blue-400"
            placeholder="International College Beirut"
            required
          />
        </div>
        <Button type="submit" disabled={!canSubmit || loading} className="h-10 bg-blue-600 hover:bg-blue-500">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create
        </Button>
      </form>
    </div>
  )
}
