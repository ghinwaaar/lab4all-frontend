// lib/school-api.ts
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com/dev"

export type School = {
  schoolId: string
  name: string
  countryCode?: string
  city?: string
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

export const schoolAPI = {
  /** POST /school/register (instructor) */
  register(token: string, body: { name: string; countryCode: string; city: string; schoolId: string }) {
    return req<School>("/school/register", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  /** GET /schools (optionally filter with ?countryCode=XX&city=YYY) */
  list(params?: { countryCode?: string; city?: string }) {
    const qs = new URLSearchParams()
    if (params?.countryCode) qs.set("countryCode", params.countryCode)
    if (params?.city) qs.set("city", params.city)
    const suffix = qs.toString() ? `?${qs.toString()}` : ""
    return req<{ schools: School[]; nextToken?: string | null }>(`/schools${suffix}`, { method: "GET" })
  },

  /** GET /schools/{schoolId} */
  get(schoolId: string) {
    return req<School>(`/schools/${encodeURIComponent(schoolId)}`, { method: "GET" })
  },
}
