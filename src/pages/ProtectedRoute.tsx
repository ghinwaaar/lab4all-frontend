"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
        {/* Background Scientific Elements */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <img 
            src="/images/atom.png" 
            alt="" 
            className="absolute top-8 right-8 w-16 opacity-20 hidden md:block animate-pulse" 
          />
          <img 
            src="/images/chromosomes.png" 
            alt="" 
            className="absolute bottom-16 left-8 w-12 opacity-15 hidden md:block" 
          />
          <div className="absolute top-1/4 left-1/4 text-slate-400 text-sm opacity-25 font-mono hidden lg:block">
            Loading...
          </div>
          <div className="absolute bottom-1/3 right-1/4 text-slate-400 text-xs opacity-20 font-mono hidden lg:block">
            Virtual Lab
          </div>
        </div>

        {/* Loading Content */}
        <div className="relative z-10 text-center">
          <div className="mb-6">
            <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-blue-400 mx-auto" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            Loading Virtual Lab
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Preparing your laboratory environment...
          </p>
          
          {/* Loading progress dots */}
          <div className="flex justify-center mt-6 space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}