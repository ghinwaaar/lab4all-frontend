import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { classroomAPI, type Member } from "../lib/classroom-api";
import ClassMembersDrawer from "../ui/ClassMembersDrawer";
import "./Classroom.css";

type NavState = {
  classroomID?: string;
  classroomName?: string;
  teacherName?: string;
  school?: string;
  joinCode?: string;
};

export default function Classroom() {
  const { classroomID: routeId } = useParams<{ classroomID: string }>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, tokens } = useAuth();

  // ---- Seed header from navigation state (fast first paint)
  const seed = (state || {}) as NavState;
  const classId = routeId || seed.classroomID || "";

  const [header, setHeader] = useState<{
    name: string;
    teacher?: string;
    school?: string;
    joinCode?: string;
  }>(() => {
    const fallbackTeacher =
      seed.teacherName ||
      (user?.role?.toLowerCase() === "instructor"
        ? [user?.firstName, user?.lastName].filter(Boolean).join(" ")
        : undefined) ||
      "Instructor";
    return {
      name: seed.classroomName || "Classroom",
      teacher: fallbackTeacher,
      school: seed.school,
      joinCode: seed.joinCode,
    };
  });

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string>("");

  // Drawer state + optional prefetch cache
  const [membersOpen, setMembersOpen] = useState(false);
  const [prefetchedMembers, setPrefetchedMembers] = useState<Member[] | null>(null);

  // ---- Fetch authoritative details
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!tokens?.IdToken || !classId) return;
      setDetailsLoading(true);
      setDetailsError("");
      try {
        const mine = await classroomAPI.listMine(tokens.IdToken);
        const found = (mine || []).find((c) => c.classroomID === classId);
        if (!cancelled && found) {
          setHeader((prev) => ({
            name: found.classroomName || prev.name,
            teacher: found.teacherName || prev.teacher,
            school: found.school || prev.school || found.schoolId,
            joinCode: found.joinCode ?? prev.joinCode,
          }));
        }
        if (!cancelled && !found) {
          setDetailsError("You don’t have access to this classroom or it no longer exists.");
        }
      } catch (e: any) {
        if (!cancelled) {
          setDetailsError(e?.message || "Failed to load classroom details");
          console.error("[Classroom] listMine failed:", e);
        }
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [tokens?.IdToken, classId]);

  const canSeeJoinCode = useMemo(
    () => (user?.role ?? "").toLowerCase() === "instructor",
    [user?.role]
  );

  // Exactly like Dashboard: prefetch before opening for instant content
  const openMembersDrawer = async () => {
    if (!tokens?.IdToken || !classId) {
      setMembersOpen(true);
      return;
    }
    try {
      const res = await classroomAPI.members(tokens.IdToken, classId);
      setPrefetchedMembers(res.members || []);
    } catch (e) {
      console.error("[Classroom] prefetch members failed:", e);
      setPrefetchedMembers(null);
    } finally {
      setMembersOpen(true);
    }
  };

  return (
    <div className="classroom-page">
      {/* Header */}
      <header className="classroom-header">
        <div className="classroom-header-inner">
          <div className="classroom-breadcrumbs">
            <button
              className="crumb-back"
              onClick={() => navigate("/dashboard")}
              aria-label="Back to dashboard"
            >
              ← Dashboard
            </button>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{header.name}</span>
          </div>

          <div className="classroom-title-row">
            <div className="classroom-title-group">
              <h1 className="classroom-title">
                {header.name}
                {detailsLoading && (
                  <span style={{ marginLeft: 8, fontSize: 14, color: "#94a3b8" }}>
                    …loading
                  </span>
                )}
              </h1>
              <div className="classroom-meta">
                {header.teacher && (
                  <span className="meta-chip">Instructor: {header.teacher}</span>
                )}
                {header.school && <span className="meta-chip">{header.school}</span>}
                {canSeeJoinCode && header.joinCode && (
                  <span className="meta-chip chip-muted">Code: {header.joinCode}</span>
                )}
                <span className="meta-chip chip-id">ID: {classId}</span>
              </div>

              {detailsError && (
                <div style={{ marginTop: 8, color: "#fecaca", fontSize: 13 }}>
                  {detailsError}
                </div>
              )}
            </div>

            <div className="classroom-actions">
              <button className="action-btn" onClick={openMembersDrawer}>
                View members
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main split layout */}
      <main className="classroom-main">
        <section className="column column-left">
          <div className="panel">
            <div className="panel-header">
              <h2>Experiments</h2>
              <span className="panel-sub">Coming soon</span>
            </div>
            <div className="panel-body">
              <div className="placeholder">
                This area will show experiments for <strong>{header.name}</strong>.
                <div className="placeholder-sub">
                  We’ll add “Start Experiment”, timeline and details here.
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="column column-right">
          <div className="panel">
            <div className="panel-header">
              <h2>Announcements</h2>
              <span className="panel-sub">Coming soon</span>
            </div>
            <div className="panel-body">
              <div className="placeholder">
                Chat-like announcement feed will appear here.
                <div className="placeholder-sub">
                  Supports markdown body and file attachments.
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Members Drawer (custom, no external Sheet) */}
      <ClassMembersDrawer
        open={membersOpen}
        onOpenChange={setMembersOpen}
        classroomID={classId}
        initialMembers={prefetchedMembers}
      />
    </div>
  );
}
