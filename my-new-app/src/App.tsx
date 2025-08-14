import { Routes, Route, Navigate, Link } from "react-router-dom"
import Signup from "./pages/Signup"
import Confirm from "./pages/Confirm"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import ProtectedRoute from "./pages/ProtectedRoute"

export default function App() {

  return (
    <>

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}
