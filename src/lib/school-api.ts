// src/lib/school-api.ts
const API_BASE = import.meta.env.VITE_API_BASE || "https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com/dev";

export type School = { schoolId: string; name: string; countryCode?: string; city?: string };

async function req<T>(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(opts.headers || {}) },
    mode: "cors",
    cache: opts.method === "GET" ? "no-store" : "no-cache",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return (text ? JSON.parse(text) : null) as T;
}

export const schoolAPI = {
  register(token: string, body: { name: string; countryCode: string; city: string; schoolId?: string }) {
    return req<School>("/school/register", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
