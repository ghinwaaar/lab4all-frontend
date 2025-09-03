import React, { useEffect, useMemo, useRef, useState } from "react";

export type ExperimentIO = {
  log: string;
  materials: Array<{ name: string; amount?: string; unit?: string }>;
  tools: Array<{ name: string; amount?: string; unit?: string }>;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data: ExperimentIO | null;
  title?: string;
  downloadFileName?: string;
};

type TabKey = "logs" | "materials" | "tools";

// Improved color scheme with better contrast
const TAG_COLORS: Record<string, string> = {
  "INITIAL STATE": "#1e40af",        // Deep blue
  "MATERIALS SNAPSHOT": "#374151",   // Dark gray
  "TOOLS SNAPSHOT": "#374151",       // Dark gray
  "ACTION": "#1d4ed8",               // Strong blue
  "PH_CHANGE": "#047857",            // Dark green
  "VOLUME_CHANGE_FLASK": "#7c3aed",  // Deep purple
  "VOLUME_CHANGE_BURETTE_DELIVERED": "#7c3aed", // Deep purple
  "INDICATOR_CHANGE": "#dc2626",     // Strong red
};

// Enhanced background colors for better readability
const TAG_BACKGROUNDS: Record<string, string> = {
  "INITIAL STATE": "rgba(59, 130, 246, 0.08)",
  "MATERIALS SNAPSHOT": "rgba(107, 114, 128, 0.08)",
  "TOOLS SNAPSHOT": "rgba(107, 114, 128, 0.08)",
  "ACTION": "rgba(37, 99, 235, 0.08)",
  "PH_CHANGE": "rgba(5, 150, 105, 0.08)",
  "VOLUME_CHANGE_FLASK": "rgba(139, 92, 246, 0.08)",
  "VOLUME_CHANGE_BURETTE_DELIVERED": "rgba(139, 92, 246, 0.08)",
  "INDICATOR_CHANGE": "rgba(239, 68, 68, 0.08)",
};

function normalizeText(s: string): string {
  return s
    .replace(/â†'/g, "→")
    .replace(/â€"/g, "–")
    .replace(/\r\n?/g, "\n");
}

function parseLogLines(raw?: string) {
  const text = normalizeText(raw || "");
  if (!text) return [];
  const lines = text.split("\n");
  return lines.map((line) => {
    const m = line.match(/^\[(.*?)\]\s+([A-Z_ ]+)\s*(?:→|->)?\s*(.*)$/);
    if (!m) {
      return { raw: line, ts: "", tag: "", rest: line };
    }
    const [, ts, tag, rest] = m;
    return { raw: line, ts, tag: tag.trim(), rest: rest ?? "" };
  });
}

function formatQty(a?: string, u?: string) {
  const amount = (a ?? "").trim();
  const unit = (u ?? "").trim();
  if (amount && unit) return `${amount} ${unit}`;
  if (amount) return amount;
  if (unit) return unit;
  return "—";
}

export const ExperimentDetailsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  title = "Experiment details",
  downloadFileName = "experiment-log.txt",
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<TabKey>("logs");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isOpen) setTimeout(() => closeBtnRef.current?.focus(), 50);
  }, [isOpen]);

  const lines = useMemo(() => parseLogLines(data?.log), [data?.log]);

  const filteredLines = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter(
      (l) =>
        l.raw.toLowerCase().includes(q) ||
        l.tag.toLowerCase().includes(q) ||
        l.rest.toLowerCase().includes(q) ||
        l.ts.toLowerCase().includes(q)
    );
  }, [lines, query]);

  function copyLogs() {
    const txt = normalizeText(data?.log || "");
    if (!txt) return;
    navigator.clipboard.writeText(txt).catch(() => {});
  }

  function downloadLogs() {
    const txt = normalizeText(data?.log || "");
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!isOpen) return null;

  return (
    <div
      aria-hidden={!isOpen}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.5)", // Darker backdrop
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exp-modal-title"
        style={{
          width: "min(900px, 96vw)",
          maxHeight: "90vh",
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #d1d5db",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "grid",
          gridTemplateRows: "auto auto 1fr auto",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with improved styling */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            gap: 12,
          }}
        >
          <div 
            id="exp-modal-title" 
            style={{ 
              fontWeight: 700, 
              fontSize: 20,
              color: "#1f2937", // Dark text for better contrast
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
            }}
          >
            {title}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {active === "logs" && (
              <>
                <button
                  onClick={copyLogs}
                  style={enhancedBtnStyle}
                  title="Copy logs to clipboard"
                >
                   Copy
                </button>
                <button
                  onClick={downloadLogs}
                  style={enhancedBtnStyle}
                  title="Download logs as .txt"
                >
                   Download
                </button>
              </>
            )}
            <button
              ref={closeBtnRef}
              onClick={onClose}
              style={{
                ...enhancedBtnStyle,
                background: "linear-gradient(135deg, #374151 0%, #111827 100%)",
                color: "#ffffff",
                borderColor: "#374151",
                fontWeight: 600,
              }}
              aria-label="Close details"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Enhanced tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
          }}
        >
          <TabButton label=" Logs" active={active === "logs"} onClick={() => setActive("logs")} />
          <TabButton label=" Materials" active={active === "materials"} onClick={() => setActive("materials")} />
          <TabButton label=" Tools" active={active === "tools"} onClick={() => setActive("tools")} />
        </div>

        {/* Content with improved contrast */}
        <div style={{ overflow: "auto", background: "#fafafa" }}>
          {active === "logs" && (
            <div style={{ display: "grid", gap: 12, padding: 16 }}>
              {/* Enhanced search */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="🔍 Search logs (tag, time, text)…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "2px solid #e5e7eb",
                    outline: "none",
                    fontSize: 14,
                    color: "#1f2937",
                    background: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
                  }}
                />
                <button 
                  onClick={() => setQuery("")} 
                  style={{
                    ...enhancedBtnStyle,
                    opacity: query ? 1 : 0.5,
                    cursor: query ? "pointer" : "not-allowed"
                  }} 
                  disabled={!query}
                >
                  🗑️ Clear
                </button>
              </div>

              {/* Enhanced log display */}
              <div
                style={{
                  border: "2px solid #e5e7eb",
                  borderRadius: 12,
                  background: "#ffffff",
                  padding: 0,
                  maxHeight: "58vh",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 600,
                    color: "#374151",
                    fontSize: 14,
                  }}
                >
                  📝 Experiment Log ({filteredLines.length} entries)
                </div>
                <div
                  style={{
                    fontFamily: "ui-monospace, 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
                    fontSize: 13,
                    lineHeight: 1.5,
                    maxHeight: "50vh",
                    overflow: "auto",
                  }}
                >
                  {filteredLines.length === 0 ? (
                    <div style={{ 
                      color: "#6b7280", 
                      padding: 24,
                      textAlign: "center",
                      fontSize: 14
                    }}>
                      🔍 No matching log lines found.
                    </div>
                  ) : (
                    filteredLines.map((l, i) => {
                      const color = TAG_COLORS[l.tag] || "#374151";
                      const bgColor = TAG_BACKGROUNDS[l.tag] || "transparent";
                      return (
                        <div 
                          key={i} 
                          style={{ 
                            display: "grid", 
                            gridTemplateColumns: "160px 200px 1fr", 
                            gap: 12, 
                            padding: "8px 16px",
                            borderBottom: i < filteredLines.length - 1 ? "1px solid #f3f4f6" : "none",
                            background: i % 2 === 0 ? "#fefefe" : "#f9fafb",
                            transition: "background-color 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = bgColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = i % 2 === 0 ? "#fefefe" : "#f9fafb";
                          }}
                        >
                          <span style={{ 
                            color: "#6b7280",
                            fontSize: 12,
                            fontWeight: 500
                          }}>
                            🕒 [{l.ts || "—"}]
                          </span>
                          <span style={{ 
                            color, 
                            fontWeight: 700,
                            fontSize: 12,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: bgColor,
                            border: `1px solid ${color}20`
                          }}>
                            {l.tag || "—"}
                          </span>
                          <span style={{ 
                            whiteSpace: "pre-wrap",
                            color: "#1f2937",
                            fontWeight: 500
                          }}>
                            {l.rest}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {active === "materials" && (
            <div style={{ padding: 16 }}>
              <Table
                caption="🧪 Materials Snapshot"
                rows={(data?.materials ?? []).map((m) => [m.name, formatQty(m.amount, m.unit)])}
                headers={["Material", "Amount"]}
              />
            </div>
          )}

          {active === "tools" && (
            <div style={{ padding: 16 }}>
              <Table
                caption="🔧 Tools Snapshot"
                rows={(data?.tools ?? []).map((t) => [t.name, formatQty(t.amount, t.unit)])}
                headers={["Tool", "Amount"]}
              />
            </div>
          )}
        </div>

        {/* Enhanced footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 16px",
            borderTop: "1px solid #e5e7eb",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          }}
        >
          <button onClick={onClose} style={enhancedBtnStyle}>
            ↩️ Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced button styling
const enhancedBtnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "2px solid #e5e7eb",
  background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
  color: "#374151",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
};

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    style={{
      padding: "10px 16px",
      borderRadius: 12,
      border: "2px solid #e5e7eb",
      background: active 
        ? "linear-gradient(135deg, #1f2937 0%, #111827 100%)" 
        : "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
      color: active ? "#ffffff" : "#374151",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      transition: "all 0.2s ease",
      boxShadow: active 
        ? "0 4px 8px rgba(0, 0, 0, 0.15)" 
        : "0 2px 4px rgba(0, 0, 0, 0.05)",
    }}
  >
    {label}
  </button>
);

const Table: React.FC<{ caption: string; headers: string[]; rows: string[][] }> = ({
  caption,
  headers,
  rows,
}) => (
  <div
    style={{
      border: "2px solid #e5e7eb",
      borderRadius: 12,
      overflow: "hidden",
      background: "#ffffff",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    }}
  >
    <div style={{ 
      padding: "12px 16px", 
      borderBottom: "1px solid #e5e7eb", 
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", 
      fontWeight: 700,
      color: "#374151",
      fontSize: 16
    }}>
      {caption}
    </div>
    <div style={{ overflowX: "auto" }}>
      <table
        role="table"
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
      >
        <thead>
          <tr style={{ background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)" }}>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  borderBottom: "2px solid #e5e7eb",
                  color: "#1f2937",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ 
                padding: 24, 
                color: "#6b7280",
                textAlign: "center",
                fontSize: 14
              }}>
                📭 No items found.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr 
                key={i} 
                style={{ 
                  borderBottom: "1px solid #f3f4f6",
                  background: i % 2 === 0 ? "#fefefe" : "#f9fafb"
                }}
              >
                {r.map((cell, j) => (
                  <td key={j} style={{ 
                    padding: "12px 16px",
                    color: "#374151",
                    fontWeight: 500
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);