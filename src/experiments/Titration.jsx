// src/experiments/Titration.jsx
import { useRef, useState, useCallback } from "react";
import TitrationScene from "./TitrationScene";
import TitrationPanel from "./TitrationPanel";

export default function Titration() {
  const sceneApiRef = useRef(null);
  const [readings, setReadings] = useState({
    Cb: 0.10,
    Va: 0,
    Vb: 0,
    pH: 7,
    stateLabel: "State: add ≥ 1 mL (diluted acid)",
    filledText: "Filled: 0.0 / 100 mL",
  });

  const handleUpdate = useCallback((r) => setReadings((prev) => ({ ...prev, ...r })), []);

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Left GUI panel (DOM) */}
      <TitrationPanel
        readings={readings}
        onFill={(ml) => sceneApiRef.current?.startFill(ml)}
        onStopFill={() => sceneApiRef.current?.stopFill()}
        onAddNaOH={(ml) => sceneApiRef.current?.addNaOH(ml)}
        onReset={() => sceneApiRef.current?.reset()}
      />

      {/* Right canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        <TitrationScene ref={sceneApiRef} onUpdate={handleUpdate} />
      </div>
    </div>
  );
}