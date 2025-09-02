import { useState } from "react";

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

function Section({ title, children }) {
  return (
    <div
      style={{
        background: TOKENS.sectionBg,
        borderRadius: 14,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          color: "#94B3E0",
          fontWeight: 700,
          textAlign: "center",
          fontSize: 14,
          letterSpacing: 0.2,
        }}
      >
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function Button({ label, onClick, color = TOKENS.green, disabled }) {
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

function Input({ value, setValue, placeholder }) {
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

export default function TitrationPanel({ readings, onFill, onStopFill, onAddNaOH, onReset }) {
  const [fillMl, setFillMl] = useState("10");
  const [addMl, setAddMl] = useState("1.0");

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
      // DOM panel scroll is native; won’t affect canvas zoom
    >
      {/* Title */}
      <Section title="Acid–Base Titration">
        <div
          style={{
            textAlign: "center",
            color: TOKENS.text,
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          ACID–BASE TITRATION
        </div>
      </Section>

      {/* Flask Filling: Stop → Input → Fill → Readout */}
      <Section title="Flask Filling">
        <Button label="Stop filling" onClick={onStopFill} color={TOKENS.danger} />
        <Input value={fillMl} setValue={setFillMl} placeholder="Enter volume in mL" />
        <Button
          label="Fill flask"
          onClick={() => {
            const v = parseFloat(fillMl || "0");
            if (Number.isFinite(v) && v > 0) onFill(v);
          }}
        />
        <div style={{ textAlign: "center", color: TOKENS.subtext, fontSize: 13 }}>
          {readings.filledText}
        </div>
      </Section>

      {/* Status & Readings */}
      <Section title="Status & Readings">
        <div style={{ textAlign: "center", color: TOKENS.yellow, fontWeight: 700 }}>
          Indicator: Phenolphthalein
        </div>
        <div style={{ textAlign: "center", color: TOKENS.text }}>{readings.stateLabel}</div>
        <div style={{ textAlign: "center", color: "#95E1D3", fontWeight: 700 }}>
          pH: {readings.pH?.toFixed?.(2) ?? readings.pH}{" "}
          {readings.pH < 7 ? "(Acidic)" : readings.pH > 7 ? "(Basic)" : "(Neutral)"}
        </div>

        {/* Info cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: TOKENS.cardBg, borderRadius: 10, padding: 12 }}>
            <div style={{ color: TOKENS.blue, fontWeight: 600, fontSize: 12 }}>
              Base concentration (Cb, M)
            </div>
            <div style={{ color: TOKENS.text, fontWeight: 700 }}>{readings.Cb.toFixed(3)} M</div>
          </div>
          <div style={{ background: TOKENS.cardBg, borderRadius: 10, padding: 12 }}>
            <div style={{ color: TOKENS.purple, fontWeight: 600, fontSize: 12 }}>
              Delivered base (mL)
            </div>
            <div style={{ color: TOKENS.text, fontWeight: 700 }}>{readings.Vb.toFixed(2)} mL</div>
          </div>
          <div style={{ background: TOKENS.cardBg, borderRadius: 10, padding: 12 }}>
            <div style={{ color: TOKENS.orange, fontWeight: 600, fontSize: 12 }}>
              Flask volume (mL)
            </div>
            <div style={{ color: TOKENS.text, fontWeight: 700 }}>{readings.Va.toFixed(1)} mL</div>
          </div>
        </div>
      </Section>

      {/* Titration Controls: Input → Add → Reset */}
      <Section title="Titration Controls">
        <Input value={addMl} setValue={setAddMl} placeholder="Enter NaOH volume in mL" />
        <Button
          label="Add NaOH solution"
          onClick={() => {
            const v = parseFloat(addMl || "0");
            if (Number.isFinite(v) && v > 0) onAddNaOH(v);
          }}
        />
        <Button label="Reset titration" onClick={onReset} color={TOKENS.danger} />
      </Section>
    </div>
  );
}