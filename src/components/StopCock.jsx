// src/components/CreateStopcock.js
import {
  MeshBuilder,
  TransformNode,
  Color3,
  PBRMaterial,
  Vector3,
  Mesh
} from "@babylonjs/core";

export function CreateStopcock(scene, parent, opts = {}) {
  const {
    // Core rod (plug) geometry
    rodLength = 0.036,               // was plugLength
    baseRadius = 0.0065,             // was bodyRadius
    wallGap   = 0.0008,              // retained if you want fine control
    radiusBoost = 1.25,              // ↑ increase rod radius by 25%
    tubeTessellation = 64,
    // Handle (cone) dimensions
    handleLength = 0.016,
    handleBase   = 0.006,
    handleTip    = 0.003,
    handleGap    = 0.0005,

    // Valve rotation
    closedDeg  = 0,
    openDeg    = 90,
    initialDeg = 0,
    detents    = [0, 30, 60, 90],

    // Colors
    whitePlugColor = new Color3(0.95, 0.95, 0.95),
    handleColor    = new Color3(0.05, 0.10, 0.35),
  } = opts;

  /* Root container */
  const root = new TransformNode("stopcockRoot", scene);
  if (parent) root.parent = parent;
  const handleOffsetY= rodLength * 0.3
  /* Materials: only plug + handles now (no glass) */
  const plugMat = new PBRMaterial("stop_plugMat", scene);
  plugMat.albedoColor = new Color3(0.95, 0.95, 0.98);
  plugMat.roughness = 0.15;
  plugMat.metallic = 0.05;
  plugMat.emissiveColor = new Color3(0.2, 0.2, 0.25); // soft cool gray glow
  plugMat.environmentIntensity = 0.8;
  plugMat.alpha = 1.0;


  const handleMat = new PBRMaterial("stop_handleMat", scene);
  handleMat.albedoColor = handleColor;
  handleMat.roughness   = 0.35;
  handleMat.metallic    = 0.1;
  

  /* ─────────────────── Horizontal rod (plug) only ─────────────────── */
  // Make the rod thicker by multiplying the old (bodyRadius - wallGap)
  const plugRadius = (baseRadius - wallGap) * radiusBoost;

  const plug = MeshBuilder.CreateCylinder("stop_plug", {
    height: rodLength,                 // CreateCylinder axis = Y
    diameter: plugRadius * 2,
    tessellation: 64,
    cap: Mesh.CAP_START | Mesh.CAP_END
  }, scene);
  plug.material = plugMat;
  plug.parent   = root;
  plug.rotation.z = Math.PI / 2;       // align Y→X so the rod is horizontal

  /* ─────────────────── Conical handles on the rod ───────────────────
     Place both cones centered along X (on the rod), kissing the rod surface
     on ±Z with a tiny handleGap to avoid z-fighting. */
  const handlePlusZ = MeshBuilder.CreateCylinder("stop_handle_plusZ", {
    height: handleLength,
    diameterTop: handleTip,
    diameterBottom: handleBase,
    tessellation: 48
  }, scene);
  handlePlusZ.material = handleMat;
  handlePlusZ.parent   = plug;
  handlePlusZ.rotation.x = Math.PI / 2;   // orient along +Z
  handlePlusZ.position = new Vector3(
    0,                                     // centered on the rod (X axis)
    handleOffsetY,
    (plugRadius + handleGap) + handleLength * 0.5
  );

  const handleMinusZ = MeshBuilder.CreateCylinder("stop_handle_minusZ", {
    height: handleLength,
    diameterTop: handleTip,
    diameterBottom: handleBase,
    tessellation: 48
  }, scene);
  handleMinusZ.material = handleMat;
  handleMinusZ.parent   = plug;
  handleMinusZ.rotation.x = -Math.PI / 2; // orient along -Z
  handleMinusZ.position = new Vector3(
    0,                                     // centered on the rod (X axis)
    handleOffsetY,
    -((plugRadius + handleGap) + handleLength * 0.5)
  );

  /* ─────────────────── Rotation logic ─────────────────── */
  let angleDeg = initialDeg;
  function _applyRotation() {
    plug.rotation.x = angleDeg * Math.PI / 180; // rotate about X (rod axis)
  }
  function setAngleDeg(deg) {
    const lo = Math.min(closedDeg, openDeg);
    const hi = Math.max(closedDeg, openDeg);
    angleDeg = Math.min(hi, Math.max(lo, deg));
    _applyRotation();
  }
  function getAngleDeg() { return angleDeg; }
  function aperture01() {
    const t = (angleDeg - closedDeg) / (openDeg - closedDeg || 1);
    return Math.max(0, Math.min(1, t));
  }
  setAngleDeg(initialDeg);

  return {
    root,
    plug,
    handles: [handlePlusZ, handleMinusZ],
    setAngleDeg,
    getAngleDeg,
    aperture01,
    detents
  };
}