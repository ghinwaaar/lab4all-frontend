import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { classroomAPI, type Member } from "../lib/classroom-api";
import ClassMembersDrawer from "../ui/ClassMembersDrawer";
import ClassAnnouncementsPanel from "../ui/ClassAnnouncementsPanel";
import AnnouncementComposer from "../ui/AnnouncementComposer";
import ClassExperimentsPanel from "../ui/ClassExperimentsPanel";
import { FaRedo } from "react-icons/fa";  // Icon for refreshing
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

  const seed = (state || {}) as NavState;
  const classId = routeId || seed.classroomID || "";

  const [header, setHeader] = useState<{ name: string; teacher?: string; school?: string; joinCode?: string }>(() => {
    const fallbackTeacher =
      seed.teacherName ||
      (user?.role?.toLowerCase() === "instructor"
        ? [user?.firstName, user?.lastName].filter(Boolean).join(" ")
        : undefined) ||
      "Instructor";
    return { name: seed.classroomName || "Classroom", teacher: fallbackTeacher, school: seed.school, joinCode: seed.joinCode };
  });

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string>("");

  const [membersOpen, setMembersOpen] = useState(false);
  const [prefetchedMembers, setPrefetchedMembers] = useState<Member[] | null>(null);

  const [showComposer, setShowComposer] = useState(false);
  const [annReloadKey, setAnnReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        if (!cancelled && !found) setDetailsError("You don’t have access to this classroom or it no longer exists.");
      } catch (e: any) {
        if (!cancelled) setDetailsError(e?.message || "Failed to load classroom details");
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tokens?.IdToken, classId]);

  const canSeeJoinCode = useMemo(() => (user?.role ?? "").toLowerCase() === "instructor", [user?.role]);
  const isInstructor = canSeeJoinCode;

  const openMembersDrawer = async () => {
    if (!tokens?.IdToken || !classId) { setMembersOpen(true); return; }
    try {
      const res = await classroomAPI.members(tokens.IdToken, classId);
      setPrefetchedMembers(res.members || []);
    } catch {
      setPrefetchedMembers(null);
    } finally {
      setMembersOpen(true);
    }
  };

  const refreshJoinCode = () => {
    // Placeholder function for refreshing the join code (will link to API later)
    alert("Join Code refreshed!");
  };

  return (
    <div className="classroom-page">
      {/* Header */}
      <header className="classroom-header">
        <div className="classroom-header-inner">
          <div className="classroom-breadcrumbs">
            <button className="crumb-back" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">← Dashboard</button>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{header.name}</span>
          </div>

          <div className="classroom-title-row">
            <div className="classroom-title-group">
              <h1 className="classroom-title">
                {header.name}
                {detailsLoading && <span style={{ marginLeft: 8, fontSize: 14, color: "#94a3b8" }}>…loading</span>}
              </h1>
              <div className="classroom-meta">
                {header.teacher && <span className="meta-chip">Instructor: {header.teacher}</span>}
                {header.school && <span className="meta-chip">{header.school}</span>}
                {canSeeJoinCode && header.joinCode && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="meta-chip chip-muted">Code: {header.joinCode}</span>
                    <button
                      className="refresh-join-code-btn"
                      style={{ marginLeft: 8 }}
                      onClick={refreshJoinCode} // Refresh button
                      title="Refresh Join Code"
                    >
                      <FaRedo />
                    </button>
                  </div>
                )}
                <span className="meta-chip chip-id">ID: {classId}</span>
              </div>

              {detailsError && <div style={{ marginTop: 8, color: "#fecaca", fontSize: 13 }}>{detailsError}</div>}
            </div>

            <div className="classroom-actions" style={{ display: "flex", gap: 10 }}>
              <button className="action-btn" onClick={openMembersDrawer}>View members</button>
              {isInstructor ? (
                <button className="action-btn" onClick={() => setShowComposer(true)}>New announcement</button>
              ) : (
                <button
                  className="action-btn"
                  onClick={async () => {
                    if (!tokens?.IdToken) return;
                    if (!window.confirm("Are you sure you want to leave this classroom?")) return;
                    try {
                      await classroomAPI.leave(tokens.IdToken, classId);
                      navigate("/dashboard");
                    } catch (e: any) {
                      alert("Failed to leave classroom: " + e.message);
                    }
                  }}
                >
                  Leave classroom
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main split layout */}
      <main className="classroom-main">
        <section className="column column-left">
          <ClassExperimentsPanel />
        </section>

        <aside className="column column-right">
          <div className="panel">
            <div className="panel-header">
              <h2>Announcements</h2>
              <span className="panel-sub">Latest messages</span>
            </div>
            <div className="panel-body">
              {classId ? (
                <ClassAnnouncementsPanel classId={classId} key={annReloadKey} />
              ) : (
                <div className="placeholder">No classroom selected.</div>
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Members Drawer */}
      <ClassMembersDrawer
        open={membersOpen}
        onOpenChange={setMembersOpen}
        classroomID={classId}
        initialMembers={prefetchedMembers}
      />

      {/* Announcement Composer */}
      {isInstructor && (
        <AnnouncementComposer
          open={showComposer}
          onClose={() => setShowComposer(false)}
          classId={classId}
          onPosted={() => setAnnReloadKey((k) => k + 1)}  // Refresh announcements after posting
        />
      )}
    </div>
  );
}
