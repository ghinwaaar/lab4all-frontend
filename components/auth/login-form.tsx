"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authAPI, type LoginData } from "@/lib/auth-api"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

/* ───────────────────────── component ───────────────────────── */
export default function LoginForm() {
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()
  const router = useRouter()

  /* ──────────────── helpers ──────────────── */
  const handleInputChange = (field: keyof LoginData, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const tokens = await authAPI.login(formData)

      /* fetch profile (optional) */
      try {
        const profile = await authAPI.getProfile(tokens.AccessToken)
        login(tokens, profile)
      } catch {
        login(tokens, { email: formData.email })
      }

      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  /* ───────────────────────── ui ───────────────────────── */
  return (
    <div className="fixed inset-0 w-full h-full overflow-auto bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
      {/* ornaments (hidden on < md) */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <img
          src="/images/chromosomes.png"
          alt=""
          className="absolute top-4 left-4 sm:top-8 sm:left-8 hidden w-12 sm:w-16 opacity-30 md:block"
        />
        <img
          src="/images/atom.png"
          alt=""
          className="absolute top-6 right-6 sm:top-12 sm:right-12 hidden w-16 sm:w-20 opacity-25 md:block animate-bounce"
          style={{ animationDuration: "3s" }}
        />
        <div className="absolute top-10 left-1/4 sm:top-16 hidden font-mono text-xs sm:text-sm text-slate-400 opacity-40 md:block">
          E&nbsp;=&nbsp;mc²
        </div>
        <div className="absolute top-20 right-1/4 sm:top-32 hidden font-mono text-xs text-slate-400 opacity-30 md:block">
          H₂O&nbsp;+&nbsp;CO₂
        </div>
        <div className="absolute bottom-20 left-8 sm:bottom-32 sm:left-16 hidden font-mono text-xs sm:text-sm text-slate-400 opacity-35 md:block">
          DNA&nbsp;&#8594;&nbsp;RNA
        </div>
        <img
          src="/images/chromosomes.png"
          alt=""
          className="absolute bottom-8 right-4 sm:bottom-16 sm:right-8 hidden w-10 sm:w-12 rotate-45 opacity-20 md:block"
        />
      </div>

      {/* main layout */}
      <div className="relative z-10 min-h-full flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-6 lg:gap-12">
          {/* left art */}
          <div className="hidden xl:block flex-shrink-0 order-1 lg:order-none">
            <img
              src="/images/scientists-duo.png"
              alt="Scientists illustration"
              className="h-48 w-48 xl:h-64 xl:w-64 object-contain"
            />
          </div>

          {/* login card */}
          <div className="w-full max-w-sm sm:max-w-md flex-shrink-0 order-2 lg:order-none">
            {/* title */}
            <header className="mb-6 sm:mb-8 text-center">
              <h1 className="mb-2 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                Virtual Lab
              </h1>
              <div className="mx-auto h-1 w-16 bg-blue-400" />
            </header>

            <div className="rounded-2xl border border-slate-600/50 bg-slate-800/90 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                    <AlertDescription className="text-red-200">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      handleInputChange("email", e.target.value)
                    }
                    placeholder="name@example.com"
                    className="h-10 sm:h-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    placeholder="••••••••"
                    className="h-10 sm:h-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    type="button"
                    onClick={() => router.push("/auth/signup?role=instructor")}
                    className="flex-1 h-10 sm:h-12 rounded-lg bg-slate-600 text-white hover:bg-slate-500 transition-colors text-sm sm:text-base"
                    disabled={isLoading}
                  >
                    Teacher Login
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-10 sm:h-12 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 text-sm sm:text-base"
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    )}
                    Student Login
                  </Button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {/* TODO: forgot-pw flow */}}
                    className="text-xs sm:text-sm text-slate-400 underline hover:text-slate-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <p className="text-center text-xs sm:text-sm text-slate-400">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/signup")}
                    className="font-medium text-blue-400 underline hover:text-blue-300 transition-colors"
                  >
                    Sign up here
                  </button>
                </p>
              </form>
            </div>
          </div>

          {/* right art */}
          <div className="hidden xl:block flex-shrink-0 order-3 lg:order-none">
            <img
              src="/images/male-scientist.png"
              alt="Male scientist illustration"
              className="h-40 w-40 xl:h-48 xl:w-48 object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  )
}