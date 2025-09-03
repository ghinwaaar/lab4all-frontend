// src/panels/TitrationPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { experimentAPI, requireIdToken } from "../lib/experiment-api";
import { useAuth } from "../lib/auth-context";

/* ─────────────────────────── UI TOKENS ─────────────────────────── */
const TOKENS = {
  panelBg: "#0F172ACC",
  sectionBg: "#111827E6",
  cardBg: "#0B1222E6",
  text: "#F5F7FB",
  subtext: "#C9D2E4",
  yellow: "#FCD34D",
  green: "#10B981",
  danger: "#EF4444",
  blue: "#60A5FA",
  purple: "#C084FC",
  orange: "#F59E0B",
};

/* ─────────────────────────── UI PRIMS ─────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: TOKENS.sectionBg, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ color: "#94B3E0", fontWeight: 700, textAlign: "center", fontSize: 14, letterSpacing: 0.2 }}>
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}
function contentTypeFromPresigned(url: string): string | null {
  const m = url.match(/[?&]Content-Type=([^&]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}
function Button({
  label,
  onClick,
  color = TOKENS.green,
  disabled,
}: {
  label: string;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "12px 14px",
        background: disabled ? "#145A55" : color,
        color: "white",
        border: "none",
        borderRadius: 10,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Input({
  value,
  setValue,
  placeholder,
}: {
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9.]/g, "");
        setValue(v);
      }}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "12px 0px",
        background: "#2D3748",
        color: TOKENS.text,
        border: "2px solid #4A5568",
        borderRadius: 10,
        outline: "none",
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

/* ─────────────────────────── TYPES ─────────────────────────── */
type Readings = {
  Cb: number;          // base concentration (M)
  Vb: number;          // delivered base (mL)
  Va: number;          // flask volume (mL)
  pH: number;          // current pH
  stateLabel: string;  // e.g., "Acidic (Clear)" / "Near Endpoint (Faint Pink)" / "Basic (Pink)"
  filledText: string;  // UI line shown under Flask Filling
};

type Props = {
  readings: Readings;
  onFill: (ml: number) => void;
  onStopFill: () => void;
  onAddNaOH: (ml: number) => void;
  onReset: () => void;

  /** For finishing + logging */
  classId?: string;
  experimentId?: string;
  token?: string; // optional override if you already have it (must be a real ID token)
};

/* ─────────────────────────── HELPERS ─────────────────────────── */
function pHToIndicatorLabel(pH: number): "Clear" | "Faint Pink" | "Pink" {
  if (Number.isNaN(pH)) return "Clear";
  if (pH < 8.2) return "Clear";
  if (pH < 10.0) return "Faint Pink";
  return "Pink";
}
function fmt(n: number, digits = 2) {
  return Number.isFinite(n) ? n.toFixed(digits) : String(n);
}

/* ─────────────────────────── COMPONENT ─────────────────────────── */
export default function TitrationPanel({
  readings,
  onFill,
  onStopFill,
  onAddNaOH,
  onReset,
  classId,
  experimentId,
  token,
}: Props) {
  const { tokens } = useAuth(); // ← read from AuthProvider

  // Inputs
  const [fillMl, setFillMl] = useState("10");
  const [addMl, setAddMl] = useState("1.0");

  // Log buffer (in-memory until finish)
  const [logLines, setLogLines] = useState<string[]>([]);
  const append = (msg: string) =>
    setLogLines((prev) => [...prev, `[${new Date().toISOString()}] ${msg}`]);

  // Keep initial snapshot for "materials"
  const initialVaRef = useRef<number | null>(null);
  const initialLoggedRef = useRef(false);

  // Track previous values to detect changes
  const prevRef = useRef<Pick<Readings, "Va" | "Vb" | "pH">>({
    Va: readings.Va,
    Vb: readings.Vb,
    pH: readings.pH,
  });
  const prevIndicatorRef = useRef<ReturnType<typeof pHToIndicatorLabel>>(pHToIndicatorLabel(readings.pH));

  // Derived indicator color (phenolphthalein)
  const indicatorLabel = useMemo(() => pHToIndicatorLabel(readings.pH), [readings.pH]);

  /* ── Initial log (once) ── */
  useEffect(() => {
    if (initialLoggedRef.current) return;
    initialLoggedRef.current = true;

    // Freeze initial flask volume
    initialVaRef.current = readings.Va;

    // Initial snapshot
    append(
      `INITIAL STATE → Va=${fmt(readings.Va, 1)} mL, Vb=${fmt(readings.Vb, 2)} mL, pH=${fmt(readings.pH, 2)}, indicator=Phenolphthalein(${indicatorLabel}), Cb=${fmt(readings.Cb, 3)} M`
    );

    // Materials (explicit initial volumes)
    append(
      `MATERIALS SNAPSHOT → Acid in flask (${fmt(initialVaRef.current ?? readings.Va, 1)} mL), NaOH ${fmt(readings.Cb, 2)} M in burette, Phenolphthalein (2–3 drops), Distilled water (as needed)`
    );
    // Tools (fixed)
    append(`TOOLS SNAPSHOT → Burette (50 mL), Erlenmeyer flask (100 mL), Stand & Clamp`);
  }, []); // eslint-disable-line

  /* ── Auto-logging on change: pH, indicator color, volumes ── */
  useEffect(() => {
    const prev = prevRef.current;

    // pH change
    if (readings.pH !== prev.pH) {
      append(`PH_CHANGE → ${fmt(prev.pH, 2)} → ${fmt(readings.pH, 2)}`);
    }

    // indicator color change derived from pH
    const prevInd = prevIndicatorRef.current;
    if (indicatorLabel !== prevInd) {
      append(`INDICATOR_CHANGE → ${prevInd} → ${indicatorLabel}`);
      prevIndicatorRef.current = indicatorLabel;
    }

    // Volume changes
    if (readings.Va !== prev.Va) {
      append(`VOLUME_CHANGE_FLASK → Va: ${fmt(prev.Va, 1)} mL → ${fmt(readings.Va, 1)} mL`);
    }
    if (readings.Vb !== prev.Vb) {
      append(`VOLUME_CHANGE_BURETTE_DELIVERED → Vb: ${fmt(prev.Vb, 2)} mL → ${fmt(readings.Vb, 2)} mL`);
    }

    prevRef.current = { Va: readings.Va, Vb: readings.Vb, pH: readings.pH };
  }, [readings.Va, readings.Vb, readings.pH, indicatorLabel]);

  /* ── UI actions → log ── */
  const handleFill = () => {
    const v = parseFloat(fillMl || "0");
    if (!Number.isFinite(v) || v <= 0) return;
    append(`ACTION → FILL_FLASK +${fmt(v, 2)} mL (distilled water)`);
    onFill(v);
  };

  const handleStopFill = () => {
    append("ACTION → STOP_FILL");
    onStopFill();
  };

  const handleAdd = () => {
    const v = parseFloat(addMl || "0");
    if (!Number.isFinite(v) || v <= 0) return;
    append(`ACTION → ADD_NAOH +${fmt(v, 2)} mL (Cb=${fmt(readings.Cb, 3)} M)`);
    onAddNaOH(v);
  };

  const handleReset = () => {
    append("ACTION → RESET_TITRATION");
    onReset();
  };

  /* ── Finish → presign → PUT JSON → finish ── */
  const [finishing, setFinishing] = useState(false);
  const [finishMsg, setFinishMsg] = useState<string | null>(null);

  const finishExperiment = async () => {
  setFinishMsg(null);

  // 1) Resolve a guaranteed-valid ID token (prop → context → storage)
  let idToken: string;
  try {
    if (token?.trim()) {
      idToken = requireIdToken(token);
    } else if (tokens?.IdToken || tokens?.idToken) {
      idToken = requireIdToken((tokens.IdToken || tokens.idToken)!);
    } else {
      idToken = requireIdToken(); // falls back to storage discovery
    }
  } catch (e: any) {
    setFinishMsg(e?.message || "Could not resolve a valid ID token. Please sign in again.");
    return;
  }

  // 2) Effective IDs
  const cur = experimentAPI.getCurrent();
  const effClassId = (classId ?? cur?.classId ?? "").trim();
  const effExperimentId = (experimentId ?? cur?.experimentId ?? "").trim();

  if (!effClassId || !effExperimentId) {
    setFinishMsg("Missing classId/experimentId. Make sure an experiment is selected.");
    return;
  }

  // 3) Final payload for S3
  const s3Payload = {
    log: logLines.join("\n"),
    materials: [
      { name: "Acid solution (in flask)", amount: fmt(initialVaRef.current ?? readings.Va, 1), unit: "mL" },
      { name: "Sodium hydroxide (NaOH)", amount: fmt(readings.Cb, 2), unit: "M" },
      { name: "Phenolphthalein indicator", amount: "2-3", unit: "drops" },
      { name: "Distilled water", amount: "", unit: "mL" },
    ],
    tools: [
      { name: "Burette", amount: "50", unit: "mL" },
      { name: "Erlenmeyer flask", amount: "100", unit: "mL" },
      { name: "Stand & Clamp", amount: "1", unit: "set" },
    ],
  };

  try {
    setFinishing(true);

    // 4) Presign
    const { uploadUrl } = await experimentAPI.presignLog(idToken, {
      classId: effClassId,
      experimentId: effExperimentId,
    });

    // 5) Upload to S3 — Content-Type must match the one used in the presign (often text/plain)
    const ct = contentTypeFromPresigned(uploadUrl) || "text/plain";
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": ct },
      body: JSON.stringify(s3Payload),
    });
    if (!putRes.ok) {
      const t = await putRes.text().catch(() => "");
      throw new Error(t || `S3 upload failed: ${putRes.status}`);
    }

    // 6) Mark finished
    const finishResp = await experimentAPI.finish(idToken, {
      classId: effClassId,
      experimentId: effExperimentId,
    });

    // 7) Local cleanup
    if (experimentAPI.getCurrent()?.experimentId === effExperimentId) {
      experimentAPI.clearCurrent();
    }

    append("ACTION → FINISH_EXPERIMENT (uploaded log & finished)");
    setFinishMsg(finishResp?.message || "Experiment finished and log uploaded ✓");

    // 8) Auto-close the tab after 4 seconds
    setTimeout(() => {
      // Try to close cleanly; if blocked (not opened by script), fallback to a safe redirect
      window.close();
      // optional fallback:
      // if (!window.closed) window.location.assign("/");
    }, 4000);
  } catch (e: any) {
    setFinishMsg(e?.message || "Failed to finish experiment");
  } finally {
    setFinishing(false);
  }
};

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <div
      style={{
        width: 360,
        minWidth: 300,
        height: "100%",
        background: TOKENS.panelBg,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        overflowY: "auto",
      }}
    >
      {/* Title */}
      <Section title="Acid–Base Titration">
        <div style={{ textAlign: "center", color: TOKENS.text, fontSize: 20, fontWeight: 800 }}>
          ACID–BASE TITRATION
        </div>
      </Section>

      {/* Flask Filling */}
      <Section title="Flask Filling">
        <Button label="Stop filling" onClick={handleStopFill} color={TOKENS.danger} />
        <Input value={fillMl} setValue={setFillMl} placeholder="Enter volume in mL" />
        <Button label="Fill flask" onClick={handleFill} />
        <div style={{ textAlign: "center", color: TOKENS.subtext, fontSize: 13 }}>{readings.filledText}</div>
      </Section>

      {/* Status & Readings */}
      <Section title="Status & Readings">
        <div style={{ textAlign: "center", color: TOKENS.yellow, fontWeight: 700 }}>Indicator: Phenolphthalein</div>
        <div style={{ textAlign: "center", color: TOKENS.text }}>{readings.stateLabel}</div>
        <div style={{ textAlign: "center", color: "#95E1D3", fontWeight: 700 }}>
          pH: {readings.pH?.toFixed?.(2) ?? readings.pH}{" "}
          {readings.pH < 7 ? "(Acidic)" : readings.pH > 7 ? "(Basic)" : "(Neutral)"} – {indicatorLabel}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: TOKENS.cardBg, borderRadius: 10, padding: 12 }}>
            <div style={{ color: TOKENS.blue, fontWeight: 600, fontSize: 12 }}>Base concentration (Cb, M)</div>
            <div style={{ color: TOKENS.text, fontWeight: 700 }}>{readings.Cb.toFixed(3)} M</div>
          </div>
          <div style={{ background: TOKENS.cardBg, borderRadius: 10, padding: 12 }}>
            <div style={{ color: TOKENS.purple, fontWeight: 600, fontSize: 12 }}>Delivered base (mL)</div>
            <div style={{ color: TOKENS.text, fontWeight: 700 }}>{readings.Vb.toFixed(2)} mL</div>
          </div>
          <div style={{ background: TOKENS.cardBg, borderRadius: 10, padding: 12 }}>
            <div style={{ color: TOKENS.orange, fontWeight: 600, fontSize: 12 }}>Flask volume (mL)</div>
            <div style={{ color: TOKENS.text, fontWeight: 700 }}>{readings.Va.toFixed(1)} mL</div>
          </div>
        </div>
      </Section>

      {/* Titration Controls */}
      <Section title="Titration Controls">
        <Input value={addMl} setValue={setAddMl} placeholder="Enter NaOH volume in mL" />
        <Button label="Add NaOH solution" onClick={handleAdd} />
        <Button label="Reset titration" onClick={handleReset} color={TOKENS.danger} />
        <div style={{ height: 8 }} />
        <Button label={finishing ? "Finishing…" : "Finish experiment"} onClick={finishExperiment} disabled={finishing} />
        {finishMsg && (
          <div
            style={{
              marginTop: 8,
              color: finishMsg.includes("✓") ? "#22c55e" : "#fca5a5",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {finishMsg}
          </div>
        )}
      </Section>
    </div>
  );
}
