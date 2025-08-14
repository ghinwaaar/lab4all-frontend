// lib/classroom-api.ts
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type Classroom = {
  classroomID: string;
  classroomName: string;
  school?: string;
  schoolId?: string;
  createdAt: string;
  teacherName?: string;
  joinCode?: string;
};

export type Member = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  given_name?: string;
  family_name?: string;
  grade?: string;
  school?: string;
  schoolId?: string;
  role?: "student" | "instructor";
};

async function req<T>(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers || {}),
    },
    cache: opts.method === "GET" ? "no-store" : "no-cache",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return (text ? JSON.parse(text) : null) as T;
}

export const classroomAPI = {
  create(token: string, body: { classroomName: string }) {
    return req<{ message: string; classroomID: string; joinCode?: string }>(
      "/classroom/create",
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  listMine(token: string) {
    return req<Classroom[]>("/classroom/list", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  members(token: string, classroomID: string) {
    return req<{ members: Member[] }>("/classroom/members", {
      method: "POST",
      body: JSON.stringify({ classroomID }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  join(token: string, joinCode: string) {
    return req<{ message: string }>("/classroom/join", {
      method: "POST",
      body: JSON.stringify({ joinCode }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  leave(token: string, classroomID: string) {
    return req<{ message: string }>("/classroom/membership", {
      method: "DELETE",
      body: JSON.stringify({ classroomID }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  kick(token: string, classroomID: string, studentId: string) {
    return req<{ message: string }>("/classroom/kick", {
      method: "POST",
      body: JSON.stringify({ classroomID, studentId }),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
