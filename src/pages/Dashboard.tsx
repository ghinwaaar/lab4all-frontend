// src/pages/Dashboard.tsx
import React from "react";
import CreateClassroomForm from "../ui/CreateClassroomForm";
import JoinClassroomCard from "../ui/JoinClassroomCard";
import MyClassrooms from "../ui/MyClassrooms";
import { useAuth } from "../lib/auth-context";

export default function Dashboard() {
  const { user, tokens, logout } = useAuth();
  const isTeacher = (user?.role ?? "").toLowerCase() === "instructor";

  if (!tokens?.AccessToken) {
    return (
      <div className="centered">
        <div className="card" style={{ maxWidth: 480 }}>
          <h1 className="h1">You’re not signed in</h1>
          <p className="muted">Please log in to access your dashboard.</p>
          <div className="space" />
          <a className="btn" href="/login">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div className="h1" style={{ fontSize: 24, margin: 0 }}>Dashboard</div>
          <div className="small">
            Signed in as <span className="code">{user?.email ?? "unknown"}</span>
            {" — role: "}
            <b>{user?.role ?? "n/a"}</b>
          </div>
        </div>
        <button className="btn-outline" onClick={logout}>Logout</button>
      </div>

      {/* Main */}
      <div className="grid grid-3">
        {isTeacher ? <CreateClassroomForm /> : <JoinClassroomCard />}

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <h3 style={{ marginTop: 0 }}>My Classrooms</h3>
          <MyClassrooms isTeacher={isTeacher} />
        </div>
      </div>
    </div>
  );
}
