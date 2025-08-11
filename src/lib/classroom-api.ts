// lib/classroom-api.ts

// Env first; fall back to your DEV stage
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com/dev"

export type Classroom = {
  classroomID: string
  classroomName: string
  school?: string        // some responses include school name
  schoolId?: string      // some responses include schoolId
  createdAt: string
  teacherName?: string
  joinCode?: string
}

export type Member = {
  id?: string            // or userId/sub depending on backend
  email?: string
  firstName?: string
  lastName?: string
  given_name?: string
  family_name?: string
  grade?: string
  school?: string
  schoolId?: string
  role?: "student" | "instructor"
}

async function req<T>(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers || {}),
    },
    mode: "cors",
    cache: opts.method === "GET" ? "no-store" : "no-cache",
  })

  const text = await res.text()
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
  return (text ? JSON.parse(text) : null) as T
}

export const classroomAPI = {
  /** POST /classroom/create -> { message, classroomID, joinCode? } */
  create(token: string, body: { classroomName: string }) {
    return req<{ message: string; classroomID: string; joinCode?: string }>(
      "/classroom/create",
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { Authorization: `Bearer ${token}` },
      }
    )
  },

  /** GET /classroom/list -> Classroom[] */
  listMine(token: string) {
    return req<Classroom[]>("/classroom/list", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  /** POST /classroom/members -> { members: Member[] } */
  members(token: string, classroomID: string) {
    return req<{ members: Member[] }>("/classroom/members", {
      method: "POST",
      body: JSON.stringify({ classroomID }),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  /** POST /classroom/join -> { message } */
  join(token: string, joinCode: string) {
    return req<{ message: string }>("/classroom/join", {
      method: "POST",
      body: JSON.stringify({ joinCode }),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  /** DELETE /classroom/membership  body: { classroomID } */
  leave(token: string, classroomID: string) {
    return req<{ message: string }>("/classroom/membership", {
      method: "DELETE",
      body: JSON.stringify({ classroomID }),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  /** POST /classroom/kick  body: { classroomID, studentId } (instructor) */
  kick(token: string, classroomID: string, studentId: string) {
    return req<{ message: string }>("/classroom/kick", {
      method: "POST",
      body: JSON.stringify({ classroomID, studentId }),
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
