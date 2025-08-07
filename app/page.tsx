"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Scientific Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <img src="/images/chromosomes.png" alt="" className="absolute top-8 left-8 w-16 h-16 opacity-30" />
        <img src="/images/atom.png" alt="" className="absolute top-12 right-12 w-20 h-20 opacity-25" />
        <img src="/images/female-scientist.png" alt="" className="absolute bottom-16 left-16 w-32 h-32 opacity-20" />
        <img src="/images/male-scientist.png" alt="" className="absolute bottom-16 right-16 w-32 h-32 opacity-20" />
        <div className="absolute top-32 left-1/4 text-slate-400 text-sm opacity-30 font-mono">E = mc²</div>
        <div className="absolute bottom-32 right-1/4 text-slate-400 text-xs opacity-25 font-mono">H₂O</div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">Virtual Lab</h1>
          <p className="text-xl text-slate-300 mb-12">
            Welcome to the future of scientific learning. Access virtual experiments, collaborate with peers, and
            explore the wonders of science.
          </p>

          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-lg rounded-lg"
            >
              Sign In to Lab
            </Button>
            <Button
              onClick={() => router.push("/auth/signup")}
              variant="outline"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-lg rounded-lg"
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
