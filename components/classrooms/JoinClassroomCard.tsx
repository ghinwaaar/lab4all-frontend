"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { classroomAPI } from "@/lib/classroom-api"
import { useAuth } from "@/lib/auth-context"

export default function JoinClassroomCard({ onJoined }: { onJoined?: () => void }) {
  const { tokens } = useAuth()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>("")
  const [error, setError] = useState<string>("")

  const join = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokens?.AccessToken) return setError("Not authenticated.")
    setLoading(true); setError(""); setMsg("")
    try {
      await classroomAPI.join(tokens.AccessToken, code.trim())
      setMsg("Joined successfully!")
      setCode("")
      onJoined?.()
    } catch (err: any) {
      setError(err.message || "Invalid or expired code")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-600/50 bg-slate-800/80 p-6 shadow-xl backdrop-blur-sm">
      <h3 className="mb-4 text-xl font-semibold text-white">Join a Classroom</h3>

      {error && (
        <Alert variant="destructive" className="mb-4 bg-red-900/50">
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}
      {msg && (
        <Alert className="mb-4 border-green-700 bg-green-900/40">
          <AlertDescription className="text-green-200">{msg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={join} className="flex gap-3">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter join code"
          className="bg-slate-700/50 text-white placeholder-slate-400 focus-visible:ring-blue-400"
          required
        />
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Join
        </Button>
      </form>
    </div>
  )
}
