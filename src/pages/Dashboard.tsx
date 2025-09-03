// src/pages/Dashboard.tsx
import React, { useState } from "react";
import CreateClassroomForm from "../ui/CreateClassroomForm";
import JoinClassroomCard from "../ui/JoinClassroomCard";
import MyClassrooms from "../ui/MyClassrooms";
import ProfileMenu from "../ui/ProfileMenu";
import RegisterSchoolModal from "../ui/RegisterSchoolModal";
import { useAuth } from "../lib/auth-context";
import "./Dashboard.css";

export default function Dashboard() {
  const { user, tokens } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRegisterSchool, setShowRegisterSchool] = useState(false);

  const isTeacher = (user?.role ?? "").toLowerCase() === "instructor";

  // Friendly display name (no email)
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const displayName = fullName || (isTeacher ? "Instructor" : "Student");

  if (!tokens?.AccessToken) {
    return (
      <div className="dashboard-not-signed-container">
        <div className="dashboard-background-decoration">
          <div className="dashboard-floating-shape dashboard-shape-1"></div>
          <div className="dashboard-floating-shape dashboard-shape-2"></div>
          <div className="dashboard-floating-shape dashboard-shape-3"></div>
        </div>
        <div className="dashboard-not-signed-card">
          <div className="dashboard-not-signed-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="m12 1 0 6m0 6 0 6" />
              <path d="m1 12 6 0m6 0 6 0" />
            </svg>
          </div>
          <h1 className="dashboard-not-signed-title">Access Required</h1>
          <p className="dashboard-not-signed-text">Please log in to access your Virtual Lab dashboard.</p>
          <a className="dashboard-not-signed-btn" href="/login">
            <span>Go to Login</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* background */}
      <div className="dashboard-background-decoration">
        <div className="dashboard-floating-shape dashboard-shape-1"></div>
        <div className="dashboard-floating-shape dashboard-shape-2"></div>
        <div className="dashboard-floating-shape dashboard-shape-3"></div>
        <div className="dashboard-floating-shape dashboard-shape-4"></div>
      </div>

      {/* content */}
      <div className="dashboard-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-header-info">
              <h1 className="dashboard-title">Virtual Lab Dashboard</h1>
              <div className="dashboard-user-info">
                <span className="dashboard-greeting">Welcome back,</span>
                <span className="dashboard-user-email">{displayName}</span>
                <div className="dashboard-role-badge">
                  <span className="dashboard-role-text">{user?.role ?? "n/a"}</span>
                </div>
              </div>
            </div>

            {/* Profile menu component (also exposes Register School for instructors) */}
            <ProfileMenu onRegisterSchool={() => setShowRegisterSchool(true)} />
          </div>
        </header>

        {/* Role-specific hero / action area */}
        <main className="dashboard-main">
          <div className="dashboard-main-grid">
            {/* Left column: Role section */}
            <div className="dashboard-action-section">
              <div className="dashboard-action-card">
                {isTeacher ? (
                  <>
                    <div className="dashboard-action-header">
                      <h2 className="dashboard-action-title">Create New Classroom</h2>
                      <p className="dashboard-action-subtitle">
                        Set up a new virtual laboratory for your students. Once created, share the code with your class.
                      </p>
                    </div>
                    <div className="dashboard-action-content">
                      <CreateClassroomForm
                        onCreated={() => {
                          setRefreshKey((k) => k + 1);
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dashboard-action-header">
                      <h2 className="dashboard-action-title">Join a Classroom</h2>
                      <p className="dashboard-action-subtitle">
                        Got a class code from your teacher? Paste it below to join instantly. If you don’t see any classes yet,
                        no worries—your teacher might add you soon. Bring your curiosity—your next experiment is just around the corner! 
                      </p>
                    </div>
                    <div className="dashboard-action-content">
                      {/* Student join with code */}
                      <JoinClassroomCard
                        onJoined={() => {
                          setRefreshKey((k) => k + 1);
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right column: My Classrooms */}
            <div className="dashboard-classrooms-section">
              <div className="dashboard-classrooms-card">
                <div className="dashboard-classrooms-header">
                  <div className="dashboard-classrooms-title-group">
                    <h2 className="dashboard-classrooms-title">My Classrooms</h2>
                    <div className="dashboard-classrooms-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                  </div>
                  <p className="dashboard-classrooms-subtitle">
                    {isTeacher ? "Manage and monitor your teaching spaces" : "Access the virtual labs you're part of"}
                  </p>
                </div>

                <div className="dashboard-classrooms-content">
                  <MyClassrooms isTeacher={isTeacher} refreshKey={refreshKey} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Register School Modal (visible only when triggered; useful for instructors) */}
      {showRegisterSchool && (
        <RegisterSchoolModal open={showRegisterSchool} onClose={() => setShowRegisterSchool(false)} />
      )}
    </div>
  );
}
