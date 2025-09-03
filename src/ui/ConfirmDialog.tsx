import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** NEW: let callers force stacking above other overlays */
  zIndex?: number;
};

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  zIndex = 2147483647, // max-ish, sits above everything
}: Props) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => cancelRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  // Render to <body> so local stacking contexts can’t trap it
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        // No blur here — we want the dialog crisp
        background: "rgba(2, 6, 23, 0.6)",
        zIndex, // 👈 highest
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="document"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(15, 23, 42, 0.98)",
          border: "1px solid rgba(148,163,184,.25)",
          borderRadius: 14,
          padding: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        }}
      >
        <h2 id="confirm-title" style={{ margin: 0, color: "#e5e7eb", fontWeight: 700 }}>
          {title}
        </h2>
        <p style={{ margin: "8px 0 16px", color: "#cbd5e1" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="dash-ghost"
            style={{ borderWidth: 1, borderStyle: "solid" }}
          >
            {cancelText}
          </button>
          <button onClick={onConfirm} style={{ background: "#f44336", color: "white", borderRadius: 10, padding: "8px 12px" }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
