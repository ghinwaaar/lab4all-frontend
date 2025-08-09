"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import CreateClassroomForm from "@/components/classrooms/CreateClassroomForm"
import JoinClassroomCard from "@/components/classrooms/JoinClassroomCard"
import MyClassrooms from "@/components/classrooms/MyClassrooms"

export default function DashboardPage() {
  const { user } = useAuth()
  const [role, setRole] = useState<"student" | "instructor">("student")

  useEffect(() => {
    const r = (user?.role as "student" | "instructor") ?? "student"
    setRole(r)
  }, [user])

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-300">Signed in as <span className="text-white">{user?.email}</span> ({role})</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {role === "instructor" ? (
            <>
              <CreateClassroomForm onCreated={() => { /* you could refresh list via a key or context */ }} />
              <div className="rounded-2xl border border-slate-600/50 bg-slate-800/50 p-6">
                <h3 className="mb-4 text-xl font-semibold text-white">My Classrooms</h3>
                <MyClassrooms isTeacher />
              </div>
            </>
          ) : (
            <>
              <JoinClassroomCard onJoined={() => { /* refresh list */ }} />
              <div className="rounded-2xl border border-slate-600/50 bg-slate-800/50 p-6">
                <h3 className="mb-4 text-xl font-semibold text-white">My Classrooms</h3>
                <MyClassrooms isTeacher={false} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
