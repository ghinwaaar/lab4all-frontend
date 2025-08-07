// API client for your Cognito backend
const API_BASE_URL = "https://2g4pre33th.execute-api.us-east-1.amazonaws.com/prod"

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
  private async makeRequest<T>(endpoint: string, data?: any, method = "POST", token?: string): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      })

      // Log response for debugging
      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers)

      const result = await response.json()

      if (!response.ok) {
        console.error("API Error:", result)
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      return result
    } catch (error) {
      console.error("Fetch error:", error)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to connect to server. Please check CORS settings.")
      }
      throw error
    }
  }

  async signup(data: SignupData): Promise<{ message: string }> {
    return this.makeRequest("/auth/register", data)
  }

  async login(data: LoginData): Promise<AuthTokens> {
    return this.makeRequest("/auth/login", data)
  }

  async confirmSignup(data: ConfirmData): Promise<{ message: string }> {
    return this.makeRequest("/auth/confirm", data)
  }

  async getProfile(token: string): Promise<UserProfile> {
    return this.makeRequest("/auth/profile", undefined, "GET", token)
  }
}

export const authAPI = new AuthAPI()
