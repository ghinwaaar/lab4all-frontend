"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { Alert, AlertDescription } from "../ui/alert"
import { authAPI, type SignupData } from "../lib/auth-api"
import { Loader2 } from "lucide-react"

export default function SignupForm() {
  /* ────────────────── state ────────────────── */
  const searchParams = useSearchParams()
  const defaultRole =
    (searchParams.get("role") as "student" | "instructor") ?? "student"

  const [formData, setFormData] = useState<SignupData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    school: "",
    role: defaultRole,
    grade: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  /* ─────────────── handlers ─────────────── */
  const handleInputChange = (field: keyof SignupData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await authAPI.signup(formData)
      setSuccess(true)
      router.push(`/auth/confirm?email=${encodeURIComponent(formData.email)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setIsLoading(false)
    }
  }

  /* ────────────── success view ────────────── */
  if (success) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-600/50 bg-slate-800/90 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-sm">
          <h2 className="mb-4 text-xl sm:text-2xl font-bold text-white">Check your email</h2>
          <p className="text-sm sm:text-base text-slate-300">
            We&apos;ve sent a confirmation code to{" "}
            <span className="font-semibold text-white break-words">{formData.email}</span>
          </p>
        </div>
      </div>
    )
  }

  /* ────────────── signup form ────────────── */
  return (
    <div className="fixed inset-0 w-full h-full overflow-auto bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
      {/* background ornaments */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <img
          src="/images/atom.png"
          alt=""
          className="absolute top-4 left-4 sm:top-8 sm:left-8 hidden w-16 sm:w-20 opacity-20 md:block"
        />
        <img
          src="/images/female-scientist.png"
          alt=""
          className="absolute top-16 right-8 sm:top-24 sm:right-16 hidden w-24 sm:w-32 opacity-25 lg:block"
        />
        <img
          src="/images/chromosomes.png"
          alt=""
          className="absolute bottom-16 left-8 sm:bottom-24 sm:left-16 hidden w-12 sm:w-14 opacity-25 md:block"
        />
        <div className="absolute top-20 left-1/4 sm:top-36 hidden font-mono text-xs sm:text-sm text-slate-400 opacity-30 md:block">
          H₂SO₄
        </div>
        <div className="absolute bottom-20 right-1/4 sm:bottom-36 hidden font-mono text-xs text-slate-400 opacity-25 md:block">
          C₆H₁₂O₆
        </div>
      </div>

      {/* centered card */}
      <div className="relative z-10 min-h-full flex items-center justify-center p-4 sm:p-6 py-8 sm:py-12">
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
          <header className="mb-6 sm:mb-8 text-center">
            <h1 className="mb-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Join Virtual Lab
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Create your{" "}
              <span className="font-semibold text-white">{formData.role}</span>{" "}
              account
            </p>
          </header>

          <div className="rounded-2xl border border-slate-600/50 bg-slate-800/90 p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* error banner */}
              {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                  <AlertDescription className="text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* first / last name */}
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">
                    First name
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    className="h-10 sm:h-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">
                    Last name
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    className="h-10 sm:h-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                    required
                  />
                </div>
              </div>

              {/* email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="name@example.com"
                  className="h-10 sm:h-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                  required
                />
              </div>

              {/* password */}
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
                  minLength={8}
                />
              </div>

              {/* school */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  School
                </label>
                <Input
                  value={formData.school}
                  onChange={(e) => handleInputChange("school", e.target.value)}
                  placeholder="Enter your school name"
                  className="h-10 sm:h-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                  required
                />
              </div>

              {/* role + grade */}
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">
                    Role
                  </label>
                  <Select
                    value={formData.role}
                    onValueChange={(val) =>
                      handleInputChange("role", val as "student" | "instructor")
                    }
                  >
                    <SelectTrigger className="h-10 sm:h-12 bg-slate-700/50 border-slate-600 text-white focus-visible:ring-blue-400 focus-visible:border-blue-400">
                      <SelectValue placeholder="Choose role" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-300">
                    Grade
                  </label>
                  <Input
                    value={formData.grade}
                    onChange={(e) =>
                      handleInputChange("grade", e.target.value)
                    }
                    placeholder="e.g. 10th, 11th, 12th"
                    className="h-10 sm:h-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                    required
                  />
                </div>
              </div>

              {/* submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="mt-6 h-10 sm:h-12 w-full bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                )}
                Create account
              </Button>

              {/* footnote */}
              <p className="pt-4 text-center text-xs sm:text-sm text-slate-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="font-medium text-blue-400 underline hover:text-blue-300 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}