import React, { useEffect, useMemo, useState } from "react";
import { experimentAPI, requireIdToken } from "../lib/experiment-api";
import { ExperimentDetailsModal } from "./ExperimentDetailsModal";

type Props = {
  classId: string;
  /** Optional; if not provided, we'll try storage via requireIdToken() */
  token?: string;
};
type ExperimentIO = {
  log: string;
  materials: Array<{ name: string; amount?: string; unit?: string }>;
  tools: Array<{ name: string; amount?: string; unit?: string }>;
};
type Notice = {
  kind: "error" | "info" | "success";
  title: string;
  message?: string;
};

type ExperimentCard = {
  experimentId: string;
  classId: string;
  title: string;
  pending: boolean;
  createdAt: string; // ISO
  ownerRole?: string; // "student" | "instructor" | ...
  hiddenByTeacher?: boolean;
  hiddenByOwner?: boolean; // server-driven toggle
};

const NEXT_CURSOR_KEY = "nextCursorExperiments";

/* ───────────────────────────── Utils ───────────────────────────── */

function extractError(e: any) {
  const status = e?.response?.status ?? e?.status;
  const code = e?.response?.data?.errorCode ?? e?.code;
  const message =
    e?.response?.data?.message ||
    (typeof e === "string" ? e : e?.message) ||
    "Unexpected error occurred.";
  return { status, code, message };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function normalizeText(s: string): string {
  return (s || "")
    .replace(/â†’/g, "→")
    .replace(/â€“/g, "–")
    .replace(/\r\n?/g, "\n");
}

/* ─────────────────────────── UI Blocks ─────────────────────────── */

const NoticeCard: React.FC<{ notice: Notice; onClose: () => void }> = ({ notice, onClose }) => {
  const bg =
    notice.kind === "error" ? "#fff6f6" :
    notice.kind === "success" ? "#f6fffb" : "#f8fafc";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "start",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "12px 14px",
        background: bg,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ lineHeight: 1, fontSize: 18 }}>
        {notice.kind === "error" ? "⛔" : notice.kind === "success" ? "✅" : "💡"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{notice.title}</div>
        {notice.message && <div style={{ color: "#374151" }}>{notice.message}</div>}
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          color: "#6b7280",
        }}
      >
        ✕
      </button>
    </div>
  );
};

const Chip: React.FC<{ tone: "ok" | "warn"; label: string }> = ({ tone, label }) => (
  <span
    style={{
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      color: tone === "ok" ? "#065f46" : "#92400e",
      background: tone === "ok" ? "#ecfdf5" : "#fff7ed",
      border: `1px solid ${tone === "ok" ? "#a7f3d0" : "#fed7aa"}`,
    }}
  >
    {label}
  </span>
);

/* ─────────────────────── Main Component ────────────────────────── */

const ClassExperimentsPanel: React.FC<Props> = ({ classId, token }) => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [experiments, setExperiments] = useState<ExperimentCard[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(() => {
    try {
      const v = localStorage.getItem(NEXT_CURSOR_KEY);
      return v && v !== "undefined" && v !== "null" ? v : null;
    } catch {
      return null;
    }
  });

  // Per-card load states
  const [infoLoadingId, setInfoLoadingId] = useState<string | null>(null);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  // Modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<ExperimentIO | null>(null);
  const [detailsTitle, setDetailsTitle] = useState<string>("");

  // auto-hide notices after 7s
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(t);
  }, [notice]);

  // Reset pagination + fetch first page whenever class changes
  useEffect(() => {
    if (!classId) return;
    localStorage.removeItem(NEXT_CURSOR_KEY); // clear stale cursor for other classes
    setNextCursor(null);
    refreshList(); // first page (no cursor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  // Start new experiment
  const handleStart = async () => {
    let idToken: string;
    try {
      idToken = token?.trim() ? requireIdToken(token) : requireIdToken();
    } catch (e: any) {
      setNotice({ kind: "error", title: "Not signed in", message: e?.message || "Please sign in again." });
      return;
    }
    if (!classId) {
      setNotice({ kind: "error", title: "Missing class", message: "Please pick a class and try again." });
      return;
    }

    const body = {
      classId,
      title: "Acid-Base Titration",
      prototypeId: `prototype_titration_${Date.now()}`,
    };

    try {
      await experimentAPI.create(idToken, body);
      window.open("/lab/titration", "_blank"); // open lab

      setNotice({
        kind: "success",
        title: "Experiment started",
        message: "Your titration lab just opened in a new tab.",
      });

      localStorage.removeItem(NEXT_CURSOR_KEY);
      setNextCursor(null);
      await refreshList();
    } catch (e: any) {
      const info = extractError(e);
      const text = `${info.code ?? ""} ${info.message ?? ""}`.toLowerCase();
      const isPendingCap =
        info.code === "PENDING_LIMIT_EXCEEDED" ||
        info.code === "EXPERIMENT_LIMIT" ||
        info.status === 409 ||
        info.status === 429 ||
        (text.includes("pending") && (text.includes("limit") || text.includes("3")));

      setNotice({
        kind: "error",
        title: isPendingCap ? "Limit reached: 3 pending experiments" : "Couldn't start experiment",
        message: isPendingCap
          ? "You already have 3 experiments in progress. Finish or archive one, then try again."
          : info.message,
      });
    }
  };

  // Fetch helpers
  async function fetchPage(cursor: string | undefined, { append }: { append: boolean }) {
    let idToken: string;
    try {
      idToken = token?.trim() ? requireIdToken(token) : requireIdToken();
    } catch (e: any) {
      setNotice({ kind: "error", title: "Not signed in", message: e?.message || "Please sign in again." });
      return;
    }

    setIsLoading(true);
    try {
      const { experiments: raw, nextCursor: nc } = await experimentAPI.list(idToken, {
        classId,
        cursor, // Only send cursor if we truly have one; first page must NOT include it
      });

      setNextCursor(nc ?? null);

      // Mapping + visibility rules
      const mapped: ExperimentCard[] = raw
        .filter((e) => e.classId === classId)
        .filter((e: any) => !(e.hiddenByTeacher === true && e.ownerRole !== "instructor"))
        .map((e: any) => ({
          experimentId: e.experimentId,
          classId: e.classId,
          title: e.title ?? "Untitled Experiment",
          pending: !!e.pending,
          createdAt: e.createdAt,
          ownerRole: e.ownerRole,
          hiddenByTeacher: e.hiddenByTeacher,
          hiddenByOwner: e.hiddenByOwner,
        }));

      setExperiments((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch (e: any) {
      const info = extractError(e);
      setNotice({ kind: "error", title: "Couldn’t load experiments", message: info.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshList() {
    await fetchPage(undefined, { append: false });
  }

  async function loadMore() {
    const cursor = localStorage.getItem(NEXT_CURSOR_KEY);
    if (!cursor) {
      setNotice({ kind: "info", title: "No more experiments", message: "You’ve reached the end." });
      return;
    }
    await fetchPage(cursor, { append: true });
  }

  // Card actions
  async function onToggleHide(exp: ExperimentCard) {
    let idToken: string;
    try {
      idToken = token?.trim() ? requireIdToken(token) : requireIdToken();
    } catch (e: any) {
      setNotice({ kind: "error", title: "Not signed in", message: e?.message || "Please sign in again." });
      return;
    }

    try {
      const res = await experimentAPI.toggleHide(idToken, {
        classId: exp.classId,
        experimentId: exp.experimentId,
      });

      if (res?.success) {
        setExperiments((prev) =>
          prev.map((it) =>
            it.experimentId === exp.experimentId
              ? { ...it, hiddenByOwner: !it.hiddenByOwner }
              : it
          )
        );
        setNotice({
          kind: "success",
          title: !exp.hiddenByOwner ? "Experiment hidden" : "Experiment shown",
          message: !exp.hiddenByOwner
            ? "This experiment is now hidden for you."
            : "This experiment is now visible for you.",
        });
      } else {
        setNotice({
          kind: "error",
          title: "Toggle failed",
          message: "The server did not confirm success.",
        });
      }
    } catch (e: any) {
      const info = extractError(e);
      setNotice({ kind: "error", title: "Toggle failed", message: info.message });
    }
  }

  /** Get info: fetch the presigned URL, parse its JSON, open the modal. */
  async function onGetInfo(exp: ExperimentCard) {
    let idToken: string;
    try {
      idToken = token?.trim() ? requireIdToken(token) : requireIdToken();
    } catch (e: any) {
      setNotice({ kind: "error", title: "Not signed in", message: e?.message || "Please sign in again." });
      return;
    }

    try {
      setInfoLoadingId(exp.experimentId);
      const res = await experimentAPI.info(idToken, {
        classId: exp.classId,
        experimentId: exp.experimentId,
      });

      const url = (res as any)?.url;
      if (typeof url !== "string" || !url) {
        setNotice({
          kind: "error",
          title: "No info link",
          message: "The server didn’t return a URL for this experiment.",
        });
        return;
      }

      // Fetch the file at the URL and parse JSON payload: { log, materials, tools }
      let payload: ExperimentIO | null = null;
      try {
        const r = await fetch(url, { method: "GET" });
        const text = await r.text();
        try {
          const obj = JSON.parse(text);
          payload = {
            log: normalizeText(obj?.log || ""),
            materials: Array.isArray(obj?.materials) ? obj.materials : [],
            tools: Array.isArray(obj?.tools) ? obj.tools : [],
          };
        } catch {
          // If not JSON, treat the whole file as a plain log
          payload = { log: normalizeText(text), materials: [], tools: [] };
        }
      } catch (fetchErr: any) {
        // CORS or network issue → fallback to opening the URL
        window.open(url, "_blank", "noopener,noreferrer");
        setNotice({
          kind: "info",
          title: "Opened details in a new tab",
          message: "We couldn’t fetch the file (possibly CORS). It was opened in a new tab instead.",
        });
        return;
      }

      // Open modal with parsed details
      setDetailsData(payload);
      setDetailsTitle(`${exp.title || "Experiment"} – ${formatDate(exp.createdAt)}`);
      setDetailsOpen(true);
    } catch (e: any) {
      const info = extractError(e);
      setNotice({ kind: "error", title: "Couldn’t fetch info", message: info.message });
    } finally {
      setInfoLoadingId(null);
    }
  }

  async function onDelete(expId: string) {
    let idToken: string;
    try {
      idToken = token?.trim() ? requireIdToken(token) : requireIdToken();
    } catch (e: any) {
      setNotice({ kind: "error", title: "Not signed in", message: e?.message || "Please sign in again." });
      return;
    }

    const exp = experiments.find((e) => e.experimentId === expId);
    if (!exp) return;

    try {
      const res = await experimentAPI.delete(idToken, {
        classId: exp.classId,
        experimentId: exp.experimentId,
      });

      if (res?.success) {
        setExperiments((prev) => prev.filter((e) => e.experimentId !== expId));
        setNotice({
          kind: "success",
          title: "Experiment deleted",
          message: "The experiment has been removed.",
        });
      } else {
        setNotice({
          kind: "error",
          title: "Delete failed",
          message: res?.message || "The server did not confirm success.",
        });
      }
    } catch (e: any) {
      const info = extractError(e);
      setNotice({ kind: "error", title: "Delete failed", message: info.message });
    }
  }

  function onContinue(exp: ExperimentCard) {
    // Point "current" to this experiment for the lab and open the tab
    experimentAPI.setCurrent({
      classId: exp.classId,
      experimentId: exp.experimentId,
      createdAt: new Date().toISOString(),
    });
    window.open("/lab/titration", "_blank");
  }

  /* ─────────────────────────── Render ─────────────────────────── */

  return (
    <div className="panel" style={{ display: "grid", gap: 16 }}>
      {notice && <NoticeCard notice={notice} onClose={() => setNotice(null)} />}

      <div
        className="panel-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Experiments</h2>
          <span style={{ color: "#6b7280", fontSize: 14 }}>
            Class: <code>{classId}</code>
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={refreshList}
            disabled={isLoading}
            style={btn()}
            title="Refresh the list"
          >
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={loadMore}
            disabled={isLoading || !nextCursor}
            style={btn(nextCursor ? "default" : "muted")}
            title={nextCursor ? "Load more experiments" : "No more pages"}
          >
            Load more
          </button>
        </div>
      </div>

      <div className="panel-body" style={{ display: "grid", gap: 16 }}>
        <button
          className="start-experiment-btn"
          onClick={handleStart}
          style={btn("primary")}
          title="Create a new experiment"
        >
          Start Experiment
        </button>

        {experiments.length === 0 && !isLoading && (
          <div style={{ color: "#374151" }}>No experiments yet. Start one to see it here.</div>
        )}

        <div
          className="cards"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 14,
          }}
        >
          {experiments.map((exp) => {
            const statusChip = exp.pending ? (
              <Chip tone="warn" label="Pending" />
            ) : (
              <Chip tone="ok" label="Finished" />
            );
            return (
              <div
                key={exp.experimentId}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fff",
                  display: "grid",
                  gap: 10,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
                }}
              >
                {/* Title + chip */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#111827" }}>
                    {exp.title || "Untitled Experiment"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {statusChip}
                    {exp.hiddenByOwner && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }} title="Hidden for you">
                        (Hidden)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Done on: {formatDate(exp.createdAt)}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {exp.pending ? (
                    <button onClick={() => onContinue(exp)} style={btn("primary")}>
                      Continue
                    </button>
                  ) : (
                    <button
                      onClick={() => onGetInfo(exp)}
                      disabled={infoLoadingId === exp.experimentId}
                      style={btn()}
                      title="View logs, materials and tools"
                    >
                      {infoLoadingId === exp.experimentId ? "Opening…" : "Get info"}
                    </button>
                  )}

                  <button
                    onClick={() => onToggleHide(exp)}
                    disabled={toggleLoadingId === exp.experimentId}
                    style={btn()}
                    title={exp.hiddenByOwner ? "Show this experiment" : "Hide this experiment"}
                  >
                    {toggleLoadingId === exp.experimentId ? "Saving…" : exp.hiddenByOwner ? "Show" : "Hide"}
                  </button>

                  <button
                    onClick={() => onDelete(exp.experimentId)}
                    disabled={deleteLoadingId === exp.experimentId}
                    style={btn("danger")}
                    title="Delete this experiment"
                  >
                    {deleteLoadingId === exp.experimentId ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && <div style={{ color: "#6b7280" }}>Loading…</div>}
      </div>

      {/* Details Modal */}
      <ExperimentDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        data={detailsData}
        title={detailsTitle || "Experiment details"}
        downloadFileName="experiment-log.txt"
      />
    </div>
  );
};

function btn(variant: "default" | "muted" | "primary" | "danger" = "default"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
  };
  if (variant === "muted") {
    return { ...base, background: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" };
  }
  if (variant === "primary") {
    return { ...base, background: "#111827", color: "#fff", borderColor: "#111827" };
  }
  if (variant === "danger") {
    return { ...base, background: "#fff5f5", color: "#b91c1c", borderColor: "#ef4444" };
  }
  return base;
}

export default ClassExperimentsPanel;
