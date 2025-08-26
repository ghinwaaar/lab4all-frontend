// src/App.tsx
import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Signup from "./pages/Signup";
import Confirm from "./pages/Confirm";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./pages/ProtectedRoute";

// Keep only Titration
const Titration = lazy(() => import("./experiments/Titration.jsx")); // or ./experiments/Titration

function FullscreenLab({ children }: { children: React.ReactNode }) {
  return <div style={{ width: "100vw", height: "100vh" }}>{children}</div>;
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/confirm" element={<Confirm />} />
      <Route path="/login" element={<Login />} />

      {/* Dashboard (protected) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Titration Lab (PUBLIC, full-screen) */}
      <Route
        path="/lab/titration"
        element={
          <Suspense fallback={<div style={{ padding: 20 }}>Loading lab…</div>}>
            <FullscreenLab>
              <Titration />
            </FullscreenLab>
          </Suspense>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
