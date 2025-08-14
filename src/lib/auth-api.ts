// src/lib/auth-api.ts

// Use Vite env first; fallback to your deployed dev URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE ||
  "https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com/dev";

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "student" | "instructor";
  grade: string;
  // student can provide either of these ways to resolve school:
  schoolId?: string;
  schoolName?: string;
  countryCode?: string; // 2 letters, e.g. "LB"
  city?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ConfirmData {
  email: string;
  code: string;
}

export interface AuthTokens {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  TokenType: string;
  ExpiresIn: number;
}

export interface UserProfile {
  email: string;
  firstName?: string;
  lastName?: string;
  school?: string;
  role?: "student" | "instructor";
  grade?: string;
}

export interface ApiError {
  error: string;
  details?: any;
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return { message: s };
  }
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
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      mode: "cors",
      cache: method === "GET" ? "no-store" : "no-cache",
    });

    const raw = await res.text();
    const parsed = raw ? safeJson(raw) : null;

    if (!res.ok) {
      // surfaces messages like INVALID_INPUT, INVALID_SCHOOL_ID, etc.
      const msg =
        (parsed && (parsed.error || parsed.message)) ||
        raw ||
        `HTTP ${res.status} ${res.statusText}`;
      console.error("API Error:", msg);
      throw new Error(msg);
    }

    return (parsed as unknown) as T;
  }

  signup(data: SignupData): Promise<{ message: string }> {
    const { email, password, firstName, lastName, role, grade } = data;

    // Build exactly what your Lambda's zod schema accepts
    const body: any = { email, password, firstName, lastName, role, grade };

    if (role === "student") {
      // Prefer schoolId. If not present, fall back to name-based fields.
      if (data.schoolId) {
        body.schoolId = data.schoolId.trim();
      } else if (data.schoolName) {
        body.schoolName = data.schoolName.trim();
        if (data.countryCode) body.countryCode = data.countryCode.trim();
        if (data.city) body.city = data.city.trim();
      } else {
        throw new Error(
          "Students must provide a School ID, or a School Name (optionally with Country Code and City)."
        );
      }
    }
    // Instructors may omit school entirely; backend will return needsSchoolRegistration

    return this.makeRequest("/auth/register", body);
  }

  login(data: LoginData): Promise<AuthTokens> {
    return this.makeRequest("/auth/login", data);
  }

  confirmSignup(data: ConfirmData): Promise<{ message: string }> {
    return this.makeRequest("/auth/confirm", data);
  }

  getProfile(token: string): Promise<UserProfile> {
    return this.makeRequest("/auth/profile", undefined, "GET", token);
  }
}

export const authAPI = new AuthAPI();
