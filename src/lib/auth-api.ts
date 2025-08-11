// lib/auth-api.ts

// Use env var first; fall back to your DEV stage
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com/dev"

export interface SignupData {
  email: string
  password: string
  firstName: string
  lastName: string
  school: string
  role: "student" | "instructor"
  grade: string
}

export interface LoginData {
  email: string
  password: string
}

export interface ConfirmData {
  email: string
  code: string
}

export interface AuthTokens {
  AccessToken: string
  IdToken: string
  RefreshToken: string
  TokenType: string
  ExpiresIn: number
}

export interface UserProfile {
  email: string
  firstName?: string
  lastName?: string
  school?: string
  role?: "student" | "instructor"
  grade?: string
}

export interface ApiError {
  error: string
  details?: any
}

class AuthAPI {
  private async makeRequest<T>(
    endpoint: string,
    data?: any,
    method = "POST",
    token?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        mode: "cors",
        cache: method === "GET" ? "no-store" : "no-cache",
      })

      const raw = await res.text()
      const parsed = raw ? safeJson(raw) : null

      if (!res.ok) {
        const msg =
          (parsed && (parsed.error || parsed.message)) ||
          raw ||
          `HTTP ${res.status} ${res.statusText}`
        throw new Error(msg)
      }

      return (parsed as unknown) as T
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error(
          "Network error: request was blocked or failed (check CORS and API availability)."
        )
      }
      throw err
    }
  }

  signup(data: SignupData): Promise<{ message: string }> {
    return this.makeRequest("/auth/register", data)
  }

  login(data: LoginData): Promise<AuthTokens> {
    return this.makeRequest("/auth/login", data)
  }

  confirmSignup(data: ConfirmData): Promise<{ message: string }> {
    return this.makeRequest("/auth/confirm", data)
  }

  getProfile(token: string): Promise<UserProfile> {
    return this.makeRequest("/auth/profile", undefined, "GET", token)
  }
}

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return { message: s }
  }
}

export const authAPI = new AuthAPI()
