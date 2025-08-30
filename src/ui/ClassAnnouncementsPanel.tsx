import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { announcementsAPI, type Announcement } from "../lib/announcements-api";

type Props = {
  token?: string | null;
  classId: string;
};

type AnnView = {
  id: string;
  createdAt: string;
  kind: string;
  bodyUrl: string | null;
  bodyText?: string;
  bodyLoading: boolean;
  bodyError?: string;
  isHidden: boolean; // Track visibility of the announcement
  isPinned: boolean; // Track pinned state of the announcement
  attachments: { filename: string; url: string }[];
};

export default function ClassAnnouncementsPanel({ token: tokenProp, classId }: Props) {
  const { tokens, user } = useAuth();
  const idToken = tokenProp ?? tokens?.IdToken ?? null;
  const isInstructor = user?.role?.toLowerCase() === "instructor"; // Check if the user is an instructor

  const [items, setItems] = useState<AnnView[]>([]);
  const [hiddenItems, setHiddenItems] = useState<AnnView[]>([]); // Track hidden announcements separately
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const hasToken = useMemo(() => !!idToken && idToken.length > 10, [idToken]);

  const toView = (it: Announcement): AnnView => {
    const body = it.files.find((f) => f.role === "body") || null;
    const attachments = it.files
      .filter((f) => f.role === "attachment")
      .map((f) => ({ filename: f.filename, url: f.url }));

    return {
      id: it.announcementId,
      createdAt: it.createdAt,
      kind: it.kind,
      bodyUrl: body?.url ?? null,
      bodyLoading: !!body,
      isHidden: false, // Initially visible
      isPinned: false, // Initially not pinned
      attachments,
    };
  };

  const load = async (reset = true) => {
    if (!classId) {
      setErr("Missing classroom id.");
      setLoading(false);
      return;
    }
    if (!hasToken) {
      setErr("Please sign in to view announcements.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const res = await announcementsAPI.fetchLatest(
        idToken!,
        classId,
        10,
        reset ? undefined : cursor || undefined
      );

      const page = res.items.map(toView).reverse();
      if (reset) {
        setItems(page);
      } else {
        setItems((prev) => [...page, ...prev]);
      }

      setCursor(res.nextToken);
      page.forEach((a) => {
        if (a.bodyUrl) fetchBody(a.id, a.bodyUrl);
      });
    } catch (e: any) {
      if (e?.status === 401) {
        setErr("Unauthorized (401). Your session may have expired—please log in again.");
      } else if (e?.status === 403) {
        setErr("Forbidden (403). The server rejected the Authorization header.");
      } else {
        setErr(e?.message || "Failed to load announcements.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBody = async (id: string, url: string) => {
    try {
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();
      setItems((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, bodyText: text, bodyLoading: false } : a
        )
      );
    } catch {
      setItems((prev) =>
        prev.map(
          (a) =>
            a.id === id
              ? { ...a, bodyLoading: false, bodyError: "Failed to load body" }
              : a
        )
      );
    }
  };

  // Hide an announcement
  const hideAnnouncement = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id)); // Remove from visible list
    setHiddenItems((prev) => [...prev, ...items.filter((item) => item.id === id)]); // Add to hidden list
  };

  // Reveal hidden announcements
  const revealAnnouncement = (id: string) => {
    setHiddenItems((prev) => prev.filter((item) => item.id !== id)); // Remove from hidden list
    setItems((prev) => [...prev, ...hiddenItems.filter((item) => item.id === id)]); // Add back to visible list
  };

  // Pin an announcement
  const pinAnnouncement = (id: string) => {
    setItems((prev) => {
      const updatedItems = prev.map((item) =>
        item.id === id ? { ...item, isPinned: !item.isPinned } : item
      );
      // Sort the items so pinned ones are at the top
      return updatedItems.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    });
  };

  // Delete an announcement with confirmation
  const deleteAnnouncement = (id: string) => {
    const confirmation = window.confirm("Are you sure you want to delete this announcement?");
    if (confirmation) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setErr("");
    setLoading(true);
    void load(true);
  }, [classId, hasToken]);

  return (
    <div className="ann-panel">
      <div className="ann-header">
        <div className="ann-title">Announcements</div>
        <div className="ann-actions">
          <button className="ann-btn" disabled={loading} onClick={() => load(true)}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          {cursor && !loading && (
            <button className="ann-btn ann-btn-secondary" onClick={() => load(false)}>
              Load older
            </button>
          )}
        </div>
      </div>
      <div className="ann-body">
        {err && <pre className="ann-error">{err}</pre>}
        {!err && loading && <div className="ann-empty">Loading announcements…</div>}
        {!err && !loading && items.length === 0 && <div className="ann-empty">No announcements yet.</div>}
        {!err && !loading && items.length > 0 && (
          <ul className="ann-list">
            {items.map((it) => (
              <li key={it.id} className="ann-item">
                <div className="ann-meta">
                  <span className="ann-kind">{it.kind}</span>
                  <span className="ann-date">{new Date(it.createdAt).toLocaleString()}</span>
                </div>
                {/* Inline body */}
                <div className="ann-bubble">
                  {it.bodyLoading && <div className="ann-body-loading">Loading body…</div>}
                  {!it.bodyLoading && it.bodyError && (
                    <div className="ann-body-fallback">
                      {it.bodyError}{" "}
                      {it.bodyUrl && (
                        <>
                          — <a href={it.bodyUrl} target="_blank" rel="noreferrer"> open body </a>
                        </>
                      )}
                    </div>
                  )}
                  {!it.bodyLoading && !it.bodyError && it.bodyText && (
                    <pre className="ann-pre">{it.bodyText}</pre>
                  )}
                </div>
                {/* Attachments */}
                {it.attachments.length > 0 && (
                  <div className="ann-attachments">
                    {it.attachments.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" className="ann-attachment">
                        {f.filename}
                      </a>
                    ))}
                  </div>
                )}
                {/* Control Buttons for Instructor */}
                {isInstructor && (
                  <div className="ann-actions-controls">
                    <button className="ann-btn ann-btn-pin" onClick={() => pinAnnouncement(it.id)}>
                      {it.isPinned ? (
                        <span role="img" aria-label="Pinned">
                          Unpin
                        </span>
                      ) : (
                        <span role="img" aria-label="Unpinned">
                          Pin
                        </span>
                      )}
                    </button>
                    <button className="ann-btn ann-btn-hide" onClick={() => hideAnnouncement(it.id)}>
                      Hide
                    </button>
                    <button className="ann-btn ann-btn-delete" onClick={() => deleteAnnouncement(it.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {/* Show hidden announcements */}
        <div className="hidden-announcements">
          {hiddenItems.length > 0 && (
            <div>
              <h3>Hidden Announcements</h3>
              <ul className="ann-list">
                {hiddenItems.map((it) => (
                  <li key={it.id} className="ann-item">
                    <div className="ann-meta">
                      <span className="ann-kind">{it.kind}</span>
                      <span className="ann-date">{new Date(it.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="ann-body-hidden">
                      <button className="ann-btn ann-btn-reveal" onClick={() => revealAnnouncement(it.id)}>
                        Reveal
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Scoped styles */}
      <style>{`
        .ann-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
        }
        .ann-title {
          font-weight:700;
        }
        .ann-actions {
          display:flex;
          gap:8px;
        }
        .ann-btn {
          border-radius:10px;
          padding:6px 10px;
          border:1px solid rgba(148,163,184,.35);
          background:rgba(148,163,184,.15);
          color:#e2e8f0;
        }
        .ann-btn:hover {
          background:rgba(148,163,184,.25);
        }
        .ann-btn:disabled {
          opacity:.6;
        }
        .ann-btn-secondary {
          background:rgba(99,102,241,.18);
          border-color:rgba(99,102,241,.4);
        }
        .ann-error {
          background:rgba(239,68,68,.12);
          border:1px solid rgba(239,68,68,.35);
          color:#fecaca;
          padding:8px;
          border-radius:10px;
          white-space:pre-wrap;
        }
        .ann-empty {
          color:#94a3b8;
        }
        .ann-list {
          list-style:none;
          display:flex;
          flex-direction:column;
          gap:14px;
          padding:0;
          margin:0;
        }
        .ann-item {
          display:flex;
          flex-direction:column;
          gap:6px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.85);
          border-radius: 10px;
        }
        .ann-meta {
          display:flex;
          gap:10px;
          font-size:12px;
          color:#94a3b8;
        }
        .ann-kind {
          text-transform:capitalize;
          background:rgba(148,163,184,.15);
          border:1px solid rgba(148,163,184,.3);
          padding:2px 8px;
          border-radius:999px;
          color:#cbd5e1;
        }
        .ann-bubble {
          background:rgba(15,23,42,.65);
          border:1px solid rgba(148,163,184,.25);
          border-radius:12px;
          padding:10px;
        }
        .ann-pre {
          white-space:pre-wrap;
          font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
          font-size:13px;
          color:#e5e7eb;
        }
        .ann-body-loading {
          color:#94a3b8;
        }
        .ann-body-fallback {
          color:#cbd5e1;
        }
        .ann-attachments {
          display:flex;
          flex-wrap:wrap;
          gap:8px;
        }
        .ann-attachment {
          font-size:13px;
          color:#93c5fd;
          text-decoration:underline;
        }
        .hidden-announcements {
          margin-top: 20px;
        }
        .ann-body-hidden {
          color: #94a3b8;
          margin-top: 10px;
        }
        .ann-btn-reveal {
          background: rgba(99,102,241,.15);
          border: 1px solid rgba(99,102,241,.35);
          padding: 6px 10px;
          border-radius: 10px;
          color: #cbd5e1;
        }
        .ann-btn-reveal:hover {
          background: rgba(99,102,241,.25);
        }
        .ann-actions-controls {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        .ann-btn-pin {
          background-color: #4caf50;
          color: white;
        }
        .ann-btn-pin:hover {
          background-color: #45a049;
        }
        .ann-btn-hide {
          background-color: #ff9800;
          color: white;
        }
        .ann-btn-hide:hover {
          background-color: #f57c00;
        }
        .ann-btn-delete {
          background-color: #f44336;
          color: white;
        }
        .ann-btn-delete:hover {
          background-color: #e53935;
        }
      `}</style>
    </div>
  );
}
