"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { AuthTokens } from "./auth-api"

interface User {
  email: string
  firstName?: string
  lastName?: string
  school?: string
  role?: "student" | "instructor"
  grade?: string
}

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (tokens: AuthTokens, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load auth state from localStorage on mount
    const savedTokens = localStorage.getItem("auth_tokens")
    const savedUser = localStorage.getItem("auth_user")

    if (savedTokens && savedUser) {
      try {
        setTokens(JSON.parse(savedTokens))
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error("Error parsing saved auth data:", error)
        localStorage.removeItem("auth_tokens")
        localStorage.removeItem("auth_user")
      }
    }

    setIsLoading(false)
  }, [])

  const login = (newTokens: AuthTokens, newUser: User) => {
    setTokens(newTokens)
    setUser(newUser)
    localStorage.setItem("auth_tokens", JSON.stringify(newTokens))
    localStorage.setItem("auth_user", JSON.stringify(newUser))
  }

  const logout = () => {
    setTokens(null)
    setUser(null)
    localStorage.removeItem("auth_tokens")
    localStorage.removeItem("auth_user")
  }

  const value = {
    user,
    tokens,
    isAuthenticated: !!tokens,
    isLoading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

