// src/ui/ConfirmDialog.tsx
import React from "react";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title = "Confirm action",
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#1e293b", // slate-800
          padding: 20,
          borderRadius: 12,
          width: "min(400px, 92vw)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          color: "#e2e8f0",
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>
          {title}
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 14 }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid #94a3b8",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: "#ef4444", // red-500
              border: "none",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
