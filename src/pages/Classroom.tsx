// src/pages/Classroom.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { classroomAPI, type Member } from "../lib/classroom-api";
import ClassMembersDrawer from "../ui/ClassMembersDrawer";
import ClassAnnouncementsPanel from "../ui/ClassAnnouncementsPanel";
import AnnouncementComposer from "../ui/AnnouncementComposer";
import ClassExperimentsPanel from "../ui/ClassExperimentsPanel";
import { FaRedo } from "react-icons/fa";
import "./Classroom.css";

type NavState = {
  classroomID?: string;
  classroomName?: string;
  teacherName?: string;
  school?: string;
  joinCode?: string;
  // sometimes different casing/keys might be used by callers:
  classroomId?: string;
  classId?: string;
};

export default function Classroom() {
  const params = useParams<Record<string, string>>();
  const location = useLocation();
  const { state } = location;
  const navigate = useNavigate();
  const { user, tokens } = useAuth();

  // Resolve classId robustly from: route params -> nav state -> query string
  const qs = new URLSearchParams(location.search);
  const seed = (state || {}) as NavState;

  const routeId =
    params.classroomID ||
    params.classroomId ||
    params.classId ||
    params.id ||
    "";

  const stateId = seed.classroomID || seed.classroomId || seed.classId || "";

  const queryId =
    qs.get("classroomID") ||
    qs.get("classroomId") ||
    qs.get("classId") ||
    qs.get("id") ||
    "";

  const classId = routeId || stateId || queryId || "";

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

  const [membersOpen, setMembersOpen] = useState(false);
  const [prefetchedMembers, setPrefetchedMembers] = useState<Member[] | null>(null);

  const [showComposer, setShowComposer] = useState(false);
  const [annReloadKey, setAnnReloadKey] = useState(0);

  // toast state
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [refreshingCode, setRefreshingCode] = useState(false);

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
        if (!cancelled && !found) {
          setDetailsError("You don’t have access to this classroom or it no longer exists.");
        }
      } catch (e: any) {
        if (!cancelled) setDetailsError(e?.message || "Failed to load classroom details");
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokens?.IdToken, classId]);

  const canSeeJoinCode = useMemo(
    () => (user?.role ?? "").toLowerCase() === "instructor",
    [user?.role]
  );
  const isInstructor = canSeeJoinCode;

  const openMembersDrawer = async () => {
    if (!tokens?.IdToken || !classId) {
      setMembersOpen(true);
      return;
    }
    try {
      const res = await classroomAPI.members(tokens.IdToken, classId);
      setPrefetchedMembers(res.members || []);
    } catch {
      setPrefetchedMembers(null);
    } finally {
      setMembersOpen(true);
    }
  };

  async function onRefreshJoinCode() {
    if (!tokens?.IdToken || !classId || !isInstructor) return;
    setRefreshingCode(true);
    try {
      const res = await classroomAPI.refreshJoinCode(tokens.IdToken, classId);
      setHeader((h) => ({ ...h, joinCode: res.joinCode }));
      setToast({ kind: "ok", msg: "Join code refreshed" });
    } catch (e: any) {
      setToast({ kind: "err", msg: e?.message || "Failed to refresh code" });
    } finally {
      setRefreshingCode(false);
      setTimeout(() => setToast(null), 2200);
    }
  }

  return (
    <div className="classroom-page">
      {/* Tiny toast */}
      {toast && (
        <div className={`toast ${toast.kind === "ok" ? "toast-ok" : "toast-err"}`}>
          {toast.msg}
        </div>
      )}

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
                {header.teacher && <span className="meta-chip">Instructor: {header.teacher}</span>}
                {header.school && <span className="meta-chip">{header.school}</span>}

                {canSeeJoinCode && header.joinCode && (
                  <div className="joincode-wrap">
                    <span className="meta-chip chip-muted">Code: {header.joinCode}</span>
                    <button
                      className="icon-btn"
                      aria-label="Refresh join code"
                      title="Refresh join code"
                      onClick={onRefreshJoinCode}
                      disabled={refreshingCode}
                    >
                      <FaRedo className={refreshingCode ? "spin" : ""} />
                    </button>
                  </div>
                )}

                <span className="meta-chip chip-id">ID: {classId || "—"}</span>
              </div>

              {detailsError && (
                <div style={{ marginTop: 8, color: "#fecaca", fontSize: 13 }}>{detailsError}</div>
              )}
            </div>

            <div className="classroom-actions" style={{ display: "flex", gap: 10 }}>
              <button className="action-btn" onClick={openMembersDrawer}>
                View members
              </button>
              {isInstructor && (
                <button className="action-btn" onClick={() => setShowComposer(true)}>
                  New announcement
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main split layout */}
      <main className="classroom-main">
        <section className="column column-left">
          {/* FIX: pass classId and a token down to the experiments panel */}
          <ClassExperimentsPanel classId={classId} token={tokens?.IdToken ?? undefined} />
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
          onPosted={() => setAnnReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
