"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authAPI, type ConfirmData } from "@/lib/auth-api"
import { Loader2 } from "lucide-react"

export default function ConfirmForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [formData, setFormData] = useState<ConfirmData>({
    email: searchParams.get("email") || "",
    code: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleInputChange = (field: keyof ConfirmData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await authAPI.confirmSignup(formData)
      setSuccess(true)
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    // TODO: Implement resend functionality
    console.log("Resending code...")
  }

  if (success) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-4">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-600/50 max-w-md w-full text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-green-400 mb-4">Account Confirmed!</h2>
          <p className="text-sm sm:text-base text-slate-300">Your account has been successfully confirmed. Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-auto bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
      {/* Background Scientific Elements */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <img 
          src="/images/atom.png" 
          alt="" 
          className="absolute top-6 right-6 sm:top-12 sm:right-12 w-16 h-16 sm:w-20 sm:h-20 opacity-25 hidden md:block" 
        />
        <img 
          src="/images/chromosomes.png" 
          alt="" 
          className="absolute bottom-8 left-4 sm:bottom-16 sm:left-8 w-12 h-12 sm:w-16 sm:h-16 opacity-20 hidden md:block" 
        />
        <div className="absolute top-20 left-1/4 sm:top-32 text-slate-400 text-xs sm:text-sm opacity-30 font-mono hidden md:block">
          DNA
        </div>
        <div className="absolute top-1/3 right-1/3 text-slate-400 text-xs opacity-25 font-mono hidden lg:block">
          C₁₂H₂₂O₁₁
        </div>
        <div className="absolute bottom-1/3 left-1/4 text-slate-400 text-xs opacity-30 font-mono hidden lg:block">
          H₃PO₄
        </div>
      </div>

      <div className="relative z-10 min-h-full flex items-center justify-center p-4 sm:p-6 py-8 sm:py-12">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Confirm Account</h1>
            <p className="text-sm sm:text-base text-slate-300">Enter the verification code sent to your email</p>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-600/50">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-slate-300 text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-10 sm:h-12 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-blue-400 focus-visible:border-blue-400"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-slate-300 text-sm font-medium">Confirmation Code</label>
                <Input
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="h-12 sm:h-14 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-blue-400 focus-visible:border-blue-400 text-center text-lg sm:text-xl tracking-widest font-mono"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white h-10 sm:h-12 transition-colors disabled:opacity-50 text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
                Confirm Account
              </Button>

              <div className="text-center text-xs sm:text-sm text-slate-400">
                {"Didn't receive the code? "}
                <button 
                  type="button" 
                  onClick={handleResendCode}
                  className="text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  Resend code
                </button>
              </div>

              <p className="text-center text-xs sm:text-sm text-slate-400 pt-2">
                Need help?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="font-medium text-blue-400 underline hover:text-blue-300 transition-colors"
                >
                  Back to login
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}