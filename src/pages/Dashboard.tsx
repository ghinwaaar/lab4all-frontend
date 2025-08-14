// src/pages/Dashboard.tsx
import React, { useState } from "react";
import CreateClassroomForm from "../ui/CreateClassroomForm";
import JoinClassroomCard from "../ui/JoinClassroomCard";
import MyClassrooms from "../ui/MyClassrooms";
import { useAuth } from "../lib/auth-context";
import "./Dashboard.css";

export default function Dashboard() {
  const { user, tokens, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const isTeacher = (user?.role ?? "").toLowerCase() === "instructor";

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
              <circle cx="12" cy="12" r="3"/>
              <path d="m12 1 0 6m0 6 0 6"/>
              <path d="m1 12 6 0m6 0 6 0"/>
            </svg>
          </div>
          <h1 className="dashboard-not-signed-title">Access Required</h1>
          <p className="dashboard-not-signed-text">Please log in to access your Virtual Lab dashboard.</p>
          <a className="dashboard-not-signed-btn" href="/login">
            <span>Go to Login</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-background-decoration">
        <div className="dashboard-floating-shape dashboard-shape-1"></div>
        <div className="dashboard-floating-shape dashboard-shape-2"></div>
        <div className="dashboard-floating-shape dashboard-shape-3"></div>
        <div className="dashboard-floating-shape dashboard-shape-4"></div>
      </div>

      <div className="dashboard-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-header-info">
              <h1 className="dashboard-title">Virtual Lab Dashboard</h1>
              <div className="dashboard-user-info">
                <span className="dashboard-greeting">Welcome back,</span>
                <span className="dashboard-user-email">{user?.email ?? "unknown"}</span>
                <div className="dashboard-role-badge">
                  <span className="dashboard-role-text">{user?.role ?? "n/a"}</span>
                </div>
              </div>
            </div>
            <button className="dashboard-logout-btn" onClick={logout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Stats Section */}
        <section className="dashboard-stats-section">
          <div className="dashboard-stats-grid">
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-stat-icon-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Classrooms</h3>
                <p className="dashboard-stat-subtitle">
                  {isTeacher ? "Manage your classes" : "Join active labs"}
                </p>
              </div>
            </div>
            
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-stat-icon-secondary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Experiments</h3>
                <p className="dashboard-stat-subtitle">
                  {isTeacher ? "Create lab activities" : "Complete assignments"}
                </p>
              </div>
            </div>
            
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon dashboard-stat-icon-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                  <polyline points="9,11 12,14 15,11"/>
                  <line x1="12" y1="4" x2="12" y2="14"/>
                </svg>
              </div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Progress</h3>
                <p className="dashboard-stat-subtitle">
                  {isTeacher ? "Track student results" : "View your achievements"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-main-grid">
            {/* Action Card */}
            <div className="dashboard-action-section">
              <div className="dashboard-action-card">
                <div className="dashboard-action-header">
                  <h2 className="dashboard-action-title">
                    {isTeacher ? "Create New Classroom" : "Join Classroom"}
                  </h2>
                  <p className="dashboard-action-subtitle">
                    {isTeacher 
                      ? "Set up a new virtual laboratory space for your students"
                      : "Enter a classroom code to join your instructor's lab"
                    }
                  </p>
                </div>
                <div className="dashboard-action-content">
                  {isTeacher ? (
                    <CreateClassroomForm onCreated={() => setRefreshKey(k => k + 1)} />
                  ) : (
                    <JoinClassroomCard onJoined={() => setRefreshKey(k => k + 1)} />
                  )}
                </div>
              </div>
            </div>

            {/* Classrooms Section */}
            <div className="dashboard-classrooms-section">
              <div className="dashboard-classrooms-card">
                <div className="dashboard-classrooms-header">
                  <div className="dashboard-classrooms-title-group">
                    <h2 className="dashboard-classrooms-title">My Classrooms</h2>
                    <div className="dashboard-classrooms-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                  </div>
                  <p className="dashboard-classrooms-subtitle">
                    {isTeacher 
                      ? "Manage and monitor your teaching spaces"
                      : "Access your enrolled laboratory sessions"
                    }
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
    </div>
  );
}