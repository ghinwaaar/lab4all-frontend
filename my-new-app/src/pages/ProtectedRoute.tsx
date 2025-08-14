import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../lib//auth-context"
import { Loader2 } from "lucide-react"

type ProtectedRouteProps = { children: ReactNode }

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto" />
          <h2 className="text-2xl font-semibold text-white mt-4">Loading Virtual Lab</h2>
          <p className="text-slate-400 mt-1">Preparing your laboratory environment…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // redirect to /login and remember where the user wanted to go
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
