import { useMemo, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { announcementsAPI, type CreateFileMeta } from "../lib/announcements-api";

/**
 * Tiny helper to read `sub` from a Cognito IdToken (JWT).
 * We only need the subject (user id) for teacherId.
 */
function getSubFromIdToken(idToken: string | null | undefined): string | null {
  if (!idToken) return null;
  try {
    const [, payload] = idToken.split(".");
    if (!payload) return null;
    // base64url -> base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 2 ? "==" : b64.length % 4 === 3 ? "=" : "";
    const json = atob(b64 + pad);
    const obj = JSON.parse(json);
    return typeof obj?.sub === "string" ? obj.sub : null;
  } catch {
    return null;
  }
}

type Props = {
  open: boolean;
  classId: string;
  onClose: () => void;
  /** Optional: refresh announcements after success */
  onPosted?: () => void;
};

/**
 * Announcement Composer (modal)
 * - Always includes exactly ONE "body" file (generated from textarea)
 * - Optional attachments from file input
 * - Sends POST /announcements/create with { classroomId, teacherId, filesMeta }
 * - Uploads each file to the returned presigned PUT URLs
 */
export default function AnnouncementComposer({ open, classId, onClose, onPosted }: Props) {
  const { tokens, user } = useAuth();
  const idToken = tokens?.IdToken ?? null;
  const teacherId = useMemo(() => getSubFromIdToken(idToken), [idToken]);

  const [bodyText, setBodyText] = useState("");
  const [asMarkdown, setAsMarkdown] = useState(true);
  const [files, setFiles] = useState<FileList | null>(null);

  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string>("");

  if (!open) return null;

  const disabled = posting;

  const onChooseFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setFiles(e.currentTarget.files);
  };

  const doPost = async () => {
    setError("");
    if (!classId) {
      setError("Missing classroomId.");
      return;
    }
    if (!idToken || !teacherId) {
      setError("You must be signed in (missing IdToken / sub).");
      return;
    }
    if (!bodyText.trim()) {
      setError("Body is required.");
      return;
    }

    setPosting(true);
    try {
      // 1) Build filesMeta EXACTLY as backend expects (one role="body")
      const bodyFilename = asMarkdown ? "announcement.md" : "announcement.txt";
      const bodyContentType = asMarkdown ? "text/markdown" : "text/plain";

      const filesMeta: CreateFileMeta[] = [
        { role: "body", filename: bodyFilename, contentType: bodyContentType },
      ];

      if (files && files.length) {
        Array.from(files).forEach((f) => {
          filesMeta.push({
            role: "attachment",
            filename: f.name,
            contentType: f.type || "application/octet-stream",
          });
        });
      }

      // 2) Call create
      const createResp = await announcementsAPI.create(idToken, {
        classroomId: classId,
        teacherId, // REQUIRED by backend schema
        filesMeta,
      });

      // 3) Upload files to presigned PUT URLs
      //    - Match by role and filename
      for (const u of createResp.uploadUrls) {
        if (u.role === "body") {
          const blob = new Blob([bodyText], { type: bodyContentType });
          await fetch(u.url, { method: "PUT", body: blob, headers: { "Content-Type": bodyContentType } });
        } else {
          // attachment
          const f = Array.from(files ?? []).find((ff) => ff.name === u.filename);
          if (!f) continue; // backend may tolerate missing uploads
          await fetch(u.url, { method: "PUT", body: f, headers: { "Content-Type": f.type || "application/octet-stream" } });
        }
      }

      // 4) Done
      if (onPosted) onPosted();
      onClose();
      // reset
      setBodyText("");
      setFiles(null);
      setAsMarkdown(true);
    } catch (e: any) {
      // Surface backend zod/contract errors clearly
      const msg =
        e?.raw?.error ||
        e?.raw?.message ||
        e?.message ||
        "Failed to create announcement.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="annc-modal">
      <div className="annc-backdrop" onClick={() => !posting && onClose()} />
      <div className="annc-dialog">
        <div className="annc-header">
          <div className="annc-title">New announcement</div>
          <button className="annc-close" onClick={onClose} disabled={posting} aria-label="Close">
            ×
          </button>
        </div>

        {error && <div className="annc-error"> {String(error)} </div>}

        <div className="annc-form">
          <label className="annc-label">Body</label>
          <textarea
            className="annc-textarea"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Write your announcement…"
            rows={10}
            disabled={disabled}
          />

          <label className="annc-check">
            <input
              type="checkbox"
              checked={asMarkdown}
              onChange={(e) => setAsMarkdown(e.target.checked)}
              disabled={disabled}
            />
            <span>Send as Markdown</span>
          </label>

          <div className="annc-files">
            <label className="annc-label">Attachments</label>
            <input type="file" multiple onChange={onChooseFiles} disabled={disabled} />
          </div>
        </div>

        <div className="annc-actions">
          <button className="annc-btn annc-btn-muted" onClick={onClose} disabled={disabled}>
            Cancel
          </button>
          <button className="annc-btn annc-btn-primary" onClick={doPost} disabled={disabled}>
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {/* Minimal scoped styles (kept here to avoid separate CSS churn) */}
      <style>{`
        .annc-modal { position: fixed; inset: 0; z-index: 1000; }
        .annc-backdrop { position: absolute; inset: 0; background: rgba(2,6,23,.65); backdrop-filter: blur(2px); }
        .annc-dialog { position: relative; margin: 8vh auto; max-width: 720px; background: #0f172a; color: #e2e8f0; border: 1px solid rgba(148,163,184,.25); border-radius: 14px; box-shadow: 0 20px 60px rgba(2,8,23,.6); padding: 16px; }
        .annc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .annc-title { font-weight: 700; font-size: 18px; }
        .annc-close { background: transparent; border: 0; color: #94a3b8; font-size: 22px; line-height: 1; cursor: pointer; }
        .annc-error { background: rgba(239, 68, 68, .15); border: 1px solid rgba(239, 68, 68, .4); color: #fecaca; padding: 8px 10px; border-radius: 10px; margin-bottom: 12px; white-space: pre-wrap; }
        .annc-form { display: grid; gap: 10px; }
        .annc-label { font-size: 12px; color: #94a3b8; }
        .annc-textarea { width: 100%; border-radius: 10px; background: rgba(30,41,59,.6); color: #e2e8f0; border: 1px solid rgba(148,163,184,.3); padding: 10px; outline: none; }
        .annc-textarea:focus { border-color: rgba(99,102,241,.7); box-shadow: 0 0 0 3px rgba(99,102,241,.25) }
        .annc-check { display: inline-flex; gap: 8px; align-items: center; user-select: none; color: #cbd5e1; }
        .annc-files input[type=file] { display:block; }
        .annc-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
        .annc-btn { border-radius: 10px; padding: 8px 12px; border: 1px solid rgba(148,163,184,.35); background: rgba(148,163,184,.15); color: #e2e8f0; cursor: pointer; }
        .annc-btn:disabled { opacity: .6; cursor: default; }
        .annc-btn-muted:hover:not(:disabled) { background: rgba(148,163,184,.25); }
        .annc-btn-primary { background: rgba(99,102,241,.2); border-color: rgba(99,102,241,.45); }
        .annc-btn-primary:hover:not(:disabled) { background: rgba(99,102,241,.32); }
      `}</style>
    </div>
  );
}
