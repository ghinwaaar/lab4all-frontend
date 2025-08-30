import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { classroomAPI, type Member } from "../lib/classroom-api";
import { Button } from "./button";
import { FaTrash } from "react-icons/fa"; // Import the trash icon
import './ClassMembersDrawer.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroomID: string;
  initialMembers?: Member[] | null;
};

export default function ClassMembersDrawer({
  open,
  onOpenChange,
  classroomID,
  initialMembers = null,
}: Props) {
  const { tokens } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[] | null>(initialMembers);
  const [error, setError] = useState<string>("");

  const canFetch = useMemo(
    () => Boolean(tokens?.IdToken && classroomID),
    [tokens?.IdToken, classroomID]
  );

  const displayName = (m: Member) => {
    const fn = m.firstName ?? m.given_name ?? "";
    const ln = m.lastName ?? m.family_name ?? "";
    if (fn || ln) return `${fn} ${ln}`.trim();
    return m.email ?? "Unknown";
  };

  async function load() {
    if (!canFetch) return;
    setLoading(true);
    setError("");
    try {
      const res = await classroomAPI.members(tokens!.IdToken, classroomID);
      setMembers(res.members || []);
    } catch (e: any) {
      console.error("[ClassMembersDrawer] members failed:", e);
      setError(e?.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  // keep in sync if prefetch changes
  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  // refresh whenever it opens
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tokens?.IdToken, classroomID]);

  // --- styles (inlined to avoid extra CSS plumbing)
  const z = 10050; // above everything
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.55)", // slate-950/55
    backdropFilter: "blur(2px)",
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transition: "opacity 200ms ease",
    zIndex: z,
  };

  const panelW = 420;
  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    right: 0,
    height: "100vh",
    width: panelW,
    maxWidth: "90vw",
    background: "rgba(15, 23, 42, 0.98)", // slate-900 bg
    borderLeft: "1px solid rgba(148,163,184,0.25)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    transform: open ? "translateX(0%)" : "translateX(110%)",
    transition: "transform 260ms ease",
    zIndex: z + 1,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <>
      <div style={overlayStyle} onClick={() => onOpenChange(false)} />
      <aside style={panelStyle} aria-hidden={!open} aria-label="Class members">
        {/* Header */}
        <div style={{ padding: 16, borderBottom: "1px solid rgba(148,163,184,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "white" }}>
              Class members
            </h3>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>
            People enrolled in this classroom.
          </p>
        </div>

        {/* Toolbar */}
        <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            {loading
              ? "Loading…"
              : members
              ? `${members.length} member${members.length === 1 ? "" : "s"}`
              : "—"}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading || !canFetch}>
            Refresh
          </Button>
        </div>

        {/* Body */}
        <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
          {!canFetch && (
            <div
              style={{
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(15, 23, 42, 0.6)",
                padding: 12,
                borderRadius: 8,
                color: "#e2e8f0",
                fontSize: 14,
              }}
            >
              Sign in again to view members.
            </div>
          )}

          {error && (
            <div
              style={{
                border: "1px solid rgba(239,68,68,0.4)",
                background: "rgba(127,29,29,0.35)",
                padding: 12,
                borderRadius: 8,
                color: "#fecaca",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {loading && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  <div style={{ height: 12, width: "66%", background: "#475569", borderRadius: 4 }} />
                  <div style={{ height: 10, width: "33%", background: "#334155", borderRadius: 4, marginTop: 6 }} />
                </li>
              ))}
            </ul>
          )}

          {!loading && members && members.length === 0 && !error && canFetch && (
            <div style={{ color: "#94a3b8", fontSize: 14 }}>No members yet.</div>
          )}

          {!loading && members && members.length > 0 && !error && (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                border: "1px solid rgba(148,163,184,0.25)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {members.map((m, idx) => (
                <li
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 12,
                    borderBottom:
                      idx === members.length - 1
                        ? "none"
                        : "1px solid rgba(148,163,184,0.15)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "white", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayName(m)}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.email}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#e2e8f0", fontSize: 12 }}>{m.role ?? ""}</div>
                    {m.grade && <div style={{ color: "#94a3b8", fontSize: 12 }}>Grade {m.grade}</div>}
                  </div>
                  <button style={{ background: "transparent", border: "none", color: "#e2e8f0", cursor: "pointer" }}>
                    <FaTrash size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
