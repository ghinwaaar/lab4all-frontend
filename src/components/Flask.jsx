// src/components/CreateFlask.jsx
import { useEffect } from "react";
import {
  MeshBuilder,
  TransformNode,
  Color3,                        // Color control API will use this
  Curve3,
  PBRMaterial,
  Vector3,
  Mesh,
  ParticleSystem,
  Texture,
} from "@babylonjs/core";
import { Color4 } from "@babylonjs/core/Maths/math.color";

/** Erlenmeyer flask: glass + water-looking fluid (via Fluid Renderer) */
export default function CreateFlask({
  scene,
  name = "erlenmeyerFlask",
  options = {},
}) {
  useEffect(() => {
    if (!scene) return;

    let flaskRoot, flaskBody, basePlate;
    let ps = null;                // particle system (only positions for fluid renderer)
    let fluidRenderer = null;     // scene-level fluid renderer
    let fluidObjHandle = null;    // handle returned by addParticleSystem

    /* ─────────────────── 0 · ENV (IBL on, skybox hidden) ──────────── */
    if (!scene.environmentTexture) {
      const env = scene.createDefaultEnvironment();
      if (env?.skybox) env.skybox.isVisible = false;
    }

    /* ─────────────────── 1 · GLASS MATERIAL (shared) ──────────────── */
    let glassMat = scene.getMaterialByName("glassMat");
    if (!glassMat) {
      glassMat = new PBRMaterial("glassMat", scene);
      glassMat.albedoColor = Color3.White();
      glassMat.roughness = 0.25;
      glassMat.alpha = 0.05;
      glassMat.indexOfRefraction = 1.5;
      glassMat.environmentIntensity = 0.45;
      glassMat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
      glassMat.backFaceCulling = false;
      glassMat.needDepthPrePass = true;
      glassMat.emissiveColor = Color3.White();
    }

    /* ─────────────────── 2 · PARAMS & ROOT ────────────────────────── */
    flaskRoot = new TransformNode(`${name}Root`, scene);

    const {
      height = 2,
      maxRadius = 1.2,
      neckRadius = 0.5,
      neckHeight = 0.8,
      capacityMl = 250,
      initialFillMl = 40,
    } = options;

    /* ─────────────────── 3 · PROFILE (Bezier to neck) ─────────────── */
    const baseOuter = new Vector3(maxRadius * 1.6, 0, 0);
    const neckStart = new Vector3(neckRadius, height, 0);
    const bezierPts = Curve3.CreateCubicBezier(
      baseOuter,
      new Vector3(maxRadius * 1.6, 0, 0),
      new Vector3(neckRadius + 0.2, 0, 0),
      neckStart,
      10
    ).getPoints();

    const profile = [
      new Vector3(0, 0, 0),
      new Vector3(maxRadius * 1.6, 0, 0),
      ...bezierPts,
      new Vector3(neckRadius, height + neckHeight, 0),
    ];

    /* ─────────────────── 4 · GLASS BODY + BASE ────────────────────── */
    flaskBody = MeshBuilder.CreateLathe(
      name,
      { shape: profile, sideOrientation: Mesh.DOUBLESIDE, cap: Mesh.CAP_END },
      scene
    );
    flaskBody.material = glassMat;
    flaskBody.parent = flaskRoot;
    flaskBody.alwaysSelectAsActiveMesh = true;

    const plateHeight = height * 0.02;
    basePlate = MeshBuilder.CreateCylinder(
      `${name}Base`,
      { diameter: maxRadius * 3, height: plateHeight, tessellation: 128 },
      scene
    );
    basePlate.position.y = -plateHeight / 2;
    basePlate.material = glassMat;
    basePlate.parent = flaskRoot;

    /* ─────────────────── 5 · FLUID RENDERER SETUP ─────────────────── */
    const innerShape = profile.map((p) => p.multiply(new Vector3(0.94, 1.0, 1)));
    const samples = [];
    let lastY = -Infinity;
    for (const p of innerShape) {
      const y = p.y;
      const r = Math.abs(p.x);
      if (samples.length === 0 || Math.abs(y - lastY) > 1e-6) {
        samples.push({ y, r });
        lastY = y;
      } else {
        samples[samples.length - 1].r = Math.max(samples[samples.length - 1].r, r);
      }
    }
    const radiusAtY = (y) => {
      if (y <= samples[0].y) return samples[0].r;
      const last = samples[samples.length - 1];
      if (y >= last.y) return last.r;
      for (let i = 0; i < samples.length - 1; i++) {
        const a = samples[i], b = samples[i + 1];
        if (y >= a.y && y <= b.y) {
          const denom = Math.max(1e-6, b.y - a.y);
          const t = (y - a.y) / denom;
          return a.r + (b.r - a.r) * t;
        }
      }
      return last.r;
    };

    const fillMaxY = height * 0.92;
    const mlToY = (ml) => Math.max(0, Math.min(fillMaxY, (ml / capacityMl) * fillMaxY));
    let currentMl = Math.max(0, Math.min(capacityMl, initialFillMl));
    let currentH = mlToY(currentMl);

    // Particle system (source points)
    ps = new ParticleSystem(`${name}FluidPS`, 25000, scene);
    ps.particleTexture = new Texture("https://assets.babylonjs.com/textures/flare.png", scene);
    ps.emitter = flaskRoot;
    ps.minSize = 0.004; ps.maxSize = 0.008;
    ps.emitRate = 12000;
    ps.minLifeTime = 9999; ps.maxLifeTime = 9999;
    ps.updateSpeed = 0.02;
    ps.gravity = new Vector3(0, 0, 0);
    ps.color1 = new Color4(0.8, 0.9, 1.0, 1.0);
    ps.color2 = new Color4(0.7, 0.85, 1.0, 1.0);
    ps.colorDead = new Color4(0.7, 0.85, 1.0, 0.0);

    ps.startPositionFunction = (worldMatrix, position) => {
      const y = Math.random() * Math.max(0.02, currentH);
      const rMax = Math.max(0.001, radiusAtY(y) * 0.98);
      const theta = Math.random() * Math.PI * 2;
      const u = Math.sqrt(Math.random()) * rMax;
      position.set(u * Math.cos(theta), y, u * Math.sin(theta));
      Vector3.TransformCoordinatesToRef(position, worldMatrix, position);
    };
    ps.startDirectionFunction = (_w, dir) => { dir.set(0, 0, 0); };
    ps.start();

    // Enable Fluid Renderer and register our PS as fluid
    fluidRenderer = scene.enableFluidRenderer();
    fluidObjHandle = fluidRenderer.addParticleSystem(ps); // fluid object handle
    // NOTE: On recent Babylon builds, this handle exposes per-object shading knobs
    // such as absorption color/strength via an internal target/parameters object.
    // We’ll guard-access them in the API below so you can tweak color from outside.

    // (No billboard tint overlay anymore — color will come from fluid absorption)

    /* ─────────────────── 6 · PUBLIC API (metadata) ────────────────── */
    const setLevelMl = (ml) => {
      currentMl = Math.max(0, Math.min(capacityMl, ml));
      currentH = mlToY(currentMl);
      ps?.reset();
    };

    const getLevelMl = () => currentMl;

    const getSurfaceY = () =>
      flaskRoot.getAbsolutePosition().y + currentH;

    // ── Fluid color controls (object-level) ──────────────────────────
    // Not all Babylon versions expose the same property path, so we guard it.
    const _getFluidParams = () => {
      // Common layouts seen across versions:
      // 1) fluidObjHandle.parameters
      // 2) fluidObjHandle.targetRenderer?.parameters
      // 3) fluidRenderer.parameters (global)
      return (
        fluidObjHandle?.parameters ||
        fluidObjHandle?.targetRenderer?.parameters ||
        fluidRenderer?.parameters ||
        null
      );
    };

    const setFluidAbsorptionColor = (c3) => {
      const p = _getFluidParams(); if (!p || !c3) return;
      // Expected by the fluid pass: RGB absorption (dye) color
      p.absorptionColor = c3;     // e.g., Color3.FromHexString("#f906a0")
    };

    const setFluidAbsorptionStrength = (k /* 0..1+ */) => {
      const p = _getFluidParams(); if (!p) return;
      // How strongly the absorption accumulates with thickness
      p.absorptionStrength = Math.max(0, k);
    };

    const setFluidDensity = (d /* ~0.5..2 */) => {
      const p = _getFluidParams(); if (!p) return;
      // Affects thickness rendering; higher = “thicker” liquid
      p.density = Math.max(0, d);
    };

    // Back-compat shim: setColor(c3) now means “full absorption with that color”
    const setColor = (c3) => {
      setFluidAbsorptionColor(c3);
      setFluidAbsorptionStrength(1);
    };

    // expose
    flaskRoot.metadata = flaskRoot.metadata || {};
    flaskRoot.metadata.capacityMl = capacityMl;
    flaskRoot.metadata.getLevelMl = getLevelMl;
    flaskRoot.metadata.setLevelMl = setLevelMl;
    flaskRoot.metadata.setColor = setColor;
    flaskRoot.metadata.setFluidAbsorptionColor = setFluidAbsorptionColor;
    flaskRoot.metadata.setFluidAbsorptionStrength = setFluidAbsorptionStrength;
    flaskRoot.metadata.setFluidDensity = setFluidDensity;
    flaskRoot.metadata.getSurfaceY = getSurfaceY;

    // init
    setLevelMl(currentMl);
    // Initialize fluid color as CLEAR: no absorption
    setFluidAbsorptionColor(Color3.FromHexString("#ffffff"));
    setFluidAbsorptionStrength(0);

    /* ─────────────────── 7 · CLEANUP ──────────────────────────────── */
    return () => {
      try {
        if (fluidRenderer && ps) {
          fluidRenderer.removeParticleSystem?.(ps);
        }
      } catch {}
      try { ps?.dispose(); } catch {}
      try { basePlate?.dispose(); } catch {}
      try { flaskBody?.dispose(); } catch {}
      try { flaskRoot?.dispose(); } catch {}
      // keep glassMat; it's shared
    };
  }, [scene, name, JSON.stringify(options)]);

  return null;
}