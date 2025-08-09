// lib/classroom-api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://2g4pre33th.execute-api.us-east-1.amazonaws.com/prod"

export type Classroom = {
  classroomID: string
  classroomName: string
  school: string
  createdAt: string
  teacherName?: string
  joinCode?: string
}

export type Member = {
  userId?: string
  email?: string
  given_name?: string
  family_name?: string
  grade?: string
  school?: string
  // add more if your fetchStudentInfo returns more fields
}

async function req<T>(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => "")
    throw new Error(msg || `HTTP ${res.status}`)
  }
  // 204/201 with no body
  if (res.status === 204) return null as T
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

export const classroomAPI = {
  create(token: string, body: { classroomName: string; school: string }) {
    return req<{ message: string; classroomID: string }>("/classrooms/create", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  my(token: string) {
    // backend returns an array of Classroom (minus teacherId)
    return req<Classroom[]>("/classrooms/my", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  members(token: string, classroomID: string) {
    // POST { classroomID } → { members: Member[] }
    return req<{ members: Member[] }>("/classrooms/members", {
      method: "POST",
      body: JSON.stringify({ classroomID }),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  join(token: string, joinCode: string) {
    return req<{ message: string }>("/classrooms/join", {
      method: "POST",
      body: JSON.stringify({ joinCode }),
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
