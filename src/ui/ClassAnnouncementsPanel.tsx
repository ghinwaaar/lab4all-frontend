import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { announcementsAPI, type Announcement } from "../lib/announcements-api";

type Props = {
  /** Optional. If omitted, we’ll use the IdToken from auth-context */
  token?: string | null;
  classId: string;
};

/** UI shape for rendering (with inline body state) */
type AnnView = {
  id: string;
  createdAt: string;
  kind: string;
  bodyUrl: string | null;
  bodyText?: string;
  bodyLoading: boolean;
  bodyError?: string;
  attachments: { filename: string; url: string }[];
};

export default function ClassAnnouncementsPanel({ token: tokenProp, classId }: Props) {
  // 👇 fallback to context if no prop passed
  const { tokens } = useAuth();
  const idToken = tokenProp ?? tokens?.IdToken ?? null;

  const [items, setItems] = useState<AnnView[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const hasToken = useMemo(() => !!idToken && idToken.length > 10, [idToken]);

  /** Map API item → view model */
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
      attachments,
    };
  };

  /** Fetch body text for one announcement and patch state */
  const fetchBody = async (id: string, url: string) => {
    try {
      const res = await fetch(url, { method: "GET" });
      const text = await res.text();
      setItems((prev) =>
        prev.map((a) => (a.id === id ? { ...a, bodyText: text, bodyLoading: false } : a))
      );
    } catch {
      setItems((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, bodyLoading: false, bodyError: "Failed to load body" } : a
        )
      );
    }
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
      // Backend returns newest-first. We want newest at the BOTTOM,
      // so reverse each page before putting it in the list.
      const res = await announcementsAPI.fetchLatest(
        idToken!,
        classId,
        10,
        reset ? undefined : cursor || undefined
      );

      const page = res.items.map(toView).reverse(); // oldest → newest (bottom)
      if (reset) {
        setItems(page);
      } else {
        // “Load older” should prepend at the TOP
        setItems((prev) => [...page, ...prev]);
      }
      setCursor(res.nextToken);

      // Kick off body loads asynchronously (don’t block paint)
      page.forEach((a) => {
        if (a.bodyUrl) fetchBody(a.id, a.bodyUrl);
      });
    } catch (e: any) {
      if (e?.status === 401) {
        setErr("Unauthorized (401). Your session may have expired—please log in again.");
      } else if (e?.status === 403) {
        setErr(
          "Forbidden (403). The server rejected the Authorization header.\n" +
            (typeof e?.raw === "string" ? e.raw : JSON.stringify(e?.raw))
        );
      } else {
        setErr(e?.message || "Failed to load announcements.");
      }
    } finally {
      setLoading(false);
    }
  };

  // (Re)load whenever classId or the effective token changes
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setErr("");
    setLoading(true);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        {!err && !loading && items.length === 0 && (
          <div className="ann-empty">No announcements yet.</div>
        )}

        {!err && !loading && items.length > 0 && (
          <ul className="ann-list">
            {items.map((it) => (
              <li key={it.id} className="ann-item">
                <div className="ann-meta">
                  <span className="ann-kind">{it.kind}</span>
                  <span className="ann-date">
                    {new Date(it.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Inline body */}
                <div className="ann-bubble">
                  {it.bodyLoading && <div className="ann-body-loading">Loading body…</div>}
                  {!it.bodyLoading && it.bodyError && (
                    <div className="ann-body-fallback">
                      {it.bodyError}{" "}
                      {it.bodyUrl && (
                        <>
                          —{" "}
                          <a href={it.bodyUrl} target="_blank" rel="noreferrer">
                            open body
                          </a>
                        </>
                      )}
                    </div>
                  )}
                  {!it.bodyLoading && !it.bodyError && it.bodyText && (
                    <pre className="ann-pre">
                      {it.bodyText}
                    </pre>
                  )}
                </div>

                {/* Attachments (links) */}
                {it.attachments.length > 0 && (
                  <div className="ann-attachments">
                    {it.attachments.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" className="ann-attachment">
                        {f.filename}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Scoped styles: light chat look */}
      <style>{`
        .ann-header { display:flex; align-items:center; justify-content:space-between; }
        .ann-title { font-weight:700; }
        .ann-actions { display:flex; gap:8px; }
        .ann-btn { border-radius:10px; padding:6px 10px; border:1px solid rgba(148,163,184,.35); background:rgba(148,163,184,.15); color:#e2e8f0; }
        .ann-btn:hover { background:rgba(148,163,184,.25); }
        .ann-btn:disabled { opacity:.6; }
        .ann-btn-secondary { background:rgba(99,102,241,.18); border-color:rgba(99,102,241,.4); }
        .ann-error { background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.35); color:#fecaca; padding:8px; border-radius:10px; white-space:pre-wrap; }
        .ann-empty { color:#94a3b8; }
        .ann-list { list-style:none; display:flex; flex-direction:column; gap:14px; padding:0; margin:0; }
        .ann-item { display:flex; flex-direction:column; gap:6px; }
        .ann-meta { display:flex; gap:10px; font-size:12px; color:#94a3b8; }
        .ann-kind { text-transform:capitalize; background:rgba(148,163,184,.15); border:1px solid rgba(148,163,184,.3); padding:2px 8px; border-radius:999px; color:#cbd5e1; }
        .ann-bubble { background:rgba(15,23,42,.65); border:1px solid rgba(148,163,184,.25); border-radius:12px; padding:10px; }
        .ann-pre { white-space:pre-wrap; font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:13px; color:#e5e7eb; }
        .ann-body-loading { color:#94a3b8; }
        .ann-body-fallback { color:#cbd5e1; }
        .ann-attachments { display:flex; flex-wrap:wrap; gap:8px; }
        .ann-attachment { font-size:13px; color:#93c5fd; text-decoration:underline; }
      `}</style>
    </div>
  );
}
