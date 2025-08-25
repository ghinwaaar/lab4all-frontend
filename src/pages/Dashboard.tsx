import React, { useEffect, useRef, useState } from "react";
import CreateClassroomForm from "../ui/CreateClassroomForm";
import JoinClassroomCard from "../ui/JoinClassroomCard";
import MyClassrooms from "../ui/MyClassrooms";
import { useAuth } from "../lib/auth-context";
import "./Dashboard.css";

type ModalKind = "experiments" | "progress" | null;

export default function Dashboard() {
  const { user, tokens, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<{ msg: string; tone?: "ok" | "info" | "warn" } | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  const isTeacher = (user?.role ?? "").toLowerCase() === "instructor";

  // Refs for smooth scrolling / highlight
  const actionRef = useRef<HTMLDivElement | null>(null);
  const classesRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string, tone: "ok" | "info" | "warn" = "ok") => {
    setToast({ msg, tone });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 2800);
  };

  const scrollToEl = (el?: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // brief highlight
    el.classList.add("dash-pulse-outline");
    window.setTimeout(() => el.classList.remove("dash-pulse-outline"), 1400);
  };

  const onStatClick = (kind: "classrooms" | "experiments" | "progress") => {
    if (kind === "classrooms") {
      scrollToEl(classesRef.current);
      // focus join input for students
      if (!isTeacher) {
        const joinInput = document.querySelector<HTMLInputElement>('input[placeholder="Enter join code"]');
        joinInput?.focus();
      }
    } else if (kind === "experiments") {
      setModal("experiments");
    } else {
      setModal("progress");
    }
  };

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
      {/* background */}
      <div className="dashboard-background-decoration">
        <div className="dashboard-floating-shape dashboard-shape-1"></div>
        <div className="dashboard-floating-shape dashboard-shape-2"></div>
        <div className="dashboard-floating-shape dashboard-shape-3"></div>
        <div className="dashboard-floating-shape dashboard-shape-4"></div>
      </div>

      {/* toast */}
      {toast && (
        <div className={`dash-toast dash-toast-${toast.tone || "ok"}`} role="status" aria-live="polite">
          {toast.msg}
        </div>
      )}

      {/* modals */}
      {modal && (
        <div className="dash-modal-backdrop" onClick={() => setModal(null)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {modal === "experiments" ? (
              <>
                <div className="dash-modal-head">
                  <h3>Experiments</h3>
                  <button className="dash-icon-btn" onClick={() => setModal(null)} aria-label="Close">✕</button>
                </div>
                <p className="dash-modal-sub">Spin up a quick practice experiment to see how the lab feels.</p>
                <div className="dash-modal-body">
                  <ul className="dash-list">
                    <li>⚗️ Density of liquids (sim)</li>
                    <li>🔬 Microscope focus practice</li>
                    <li>🧪 Acid–base indicator test</li>
                  </ul>
                </div>
                <div className="dash-modal-foot">
                  <button
                    className="dash-cta"
                    onClick={() => {
                      setModal(null);
                      // Here you’d push to your experiments route when ready
                      showToast("Demo experiment launched (stub) 🎉", "info");
                    }}
                  >
                    Start demo experiment
                  </button>
                  <button className="dash-ghost" onClick={() => setModal(null)}>Close</button>
                </div>
              </>
            ) : (
              <>
                <div className="dash-modal-head">
                  <h3>Your Progress</h3>
                  <button className="dash-icon-btn" onClick={() => setModal(null)} aria-label="Close">✕</button>
                </div>
                <p className="dash-modal-sub">
                  {isTeacher ? "Class activity overview (sample data)" : "Here’s a snapshot of your recent activity (sample)."}
                </p>
                <div className="dash-kpis">
                  <div className="dash-kpi">
                    <div className="dash-kpi-num">{isTeacher ? "3" : "7"}</div>
                    <div className="dash-kpi-label">{isTeacher ? "Active classes" : "Completed tasks"}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-num">{isTeacher ? "68%" : "92%"}</div>
                    <div className="dash-kpi-label">{isTeacher ? "Avg. submission rate" : "Avg. score"}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-num">{isTeacher ? "24" : "4h 12m"}</div>
                    <div className="dash-kpi-label">{isTeacher ? "Students this week" : "Time in lab (wk)"}</div>
                  </div>
                </div>
                <div className="dash-modal-foot">
                  <button className="dash-ghost" onClick={() => setModal(null)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* content */}
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
            <button className="dashboard-stat-card dash-click"
              onClick={() => onStatClick("classrooms")}
              aria-label="Go to My Classrooms">
              <div className="dashboard-stat-icon dashboard-stat-icon-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Classrooms</h3>
                <p className="dashboard-stat-subtitle">{isTeacher ? "Manage your classes" : "Join active labs"}</p>
              </div>
            </button>

            <button className="dashboard-stat-card dash-click"
              onClick={() => onStatClick("experiments")}
              aria-haspopup="dialog">
              <div className="dashboard-stat-icon dashboard-stat-icon-secondary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Experiments</h3>
                <p className="dashboard-stat-subtitle">{isTeacher ? "Create lab activities" : "Complete assignments"}</p>
              </div>
            </button>

            <button className="dashboard-stat-card dash-click"
              onClick={() => onStatClick("progress")}
              aria-haspopup="dialog">
              <div className="dashboard-stat-icon dashboard-stat-icon-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                  <polyline points="9,11 12,14 15,11"/>
                  <line x1="12" y1="4" x2="12" y2="14"/>
                </svg>
              </div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Progress</h3>
                <p className="dashboard-stat-subtitle">{isTeacher ? "Track student results" : "View your achievements"}</p>
              </div>
            </button>
          </div>
        </section>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-main-grid">
            {/* Action Card */}
            <div className="dashboard-action-section" ref={actionRef}>
              <div className="dashboard-action-card">
                <div className="dashboard-action-header">
                  <h2 className="dashboard-action-title">
                    {isTeacher ? "Create New Classroom" : "Join Classroom"}
                  </h2>
                  <p className="dashboard-action-subtitle">
                    {isTeacher
                      ? "Set up a new virtual laboratory space for your students"
                      : "Enter a classroom code to join your instructor's lab"}
                  </p>
                </div>
                <div className="dashboard-action-content">
                  {isTeacher ? (
                    <CreateClassroomForm
                      onCreated={() => {
                        setRefreshKey((k) => k + 1);
                        showToast("Classroom created ✅", "ok");
                        scrollToEl(classesRef.current);
                      }}
                    />
                  ) : (
                    <JoinClassroomCard
                      onJoined={() => {
                        setRefreshKey((k) => k + 1);
                        showToast("Joined classroom 🎉", "ok");
                        scrollToEl(classesRef.current);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Classrooms Section */}
            <div className="dashboard-classrooms-section" ref={classesRef}>
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
                      : "Access your enrolled laboratory sessions"}
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
