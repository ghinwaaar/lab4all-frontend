// src/components/Burette.jsx
import React, { useEffect } from "react";
import {
  MeshBuilder,
  TransformNode,
  Color3,
  PBRMaterial,
  Vector3,
  Mesh,
  Texture,
  DynamicTexture,
  Color4,
} from "@babylonjs/core";
// Use explicit path to avoid tree-shaking/side-effect issues
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { CreateStopcock } from "./StopCock";

export default function CreateBurette({
  scene,
  name = "burette",
  options = {},
}) {
  useEffect(() => {
    if (!scene) return;

    /* ─────────────────── ENV ─────────────────── */
    if (!scene.environmentTexture) {
      const env = scene.createDefaultEnvironment();
      if (env?.skybox) env.skybox.isVisible = false;
    }
    if (scene.activeCamera && scene.activeCamera.minZ < 0.05) {
      scene.activeCamera.minZ = 0.05;
    }

    /* ─────────────────── OPTIONS ─────────────── */
    const {
      tubeAbove = 0.45,
      tubeBelow = 0.25,
      tubeOuterRadius = 0.0085,
      tubeTessellation = 64,

      capacityMl = 50,
      majorTickEveryMl = 1,
      gradOffset = 0.0015,
      gradColor = "#ffffff",
      labelEveryMl = 1,

      rotation = new Vector3(0, 0, 0),
      position = new Vector3(0, 0, 0),

      texW = 1024,
      texH = 4096,
      texSuperSample = 2,
      emissiveBoost = 2.2,

      // Tip controls
      bodyLengthOfTip,
      taperLength,
      NozzleLength,
      NozzleRadius,

      // Stopcock animation
      stopcockAnimationDuration = 60, // frames
    } = options;

    /* ─────────────────── ROOT & ANCHORS ──────── */
    const root = new TransformNode(`${name}Root`, scene);
    root.position.copyFrom(position);
    root.rotation.copyFrom(rotation);

    const anchors = {
      mount: root,
      top: new TransformNode(`${name}_top`, scene),
      stopcock: new TransformNode(`${name}_stopcock`, scene),
      tip: new TransformNode(`${name}_tip`, scene),
    };
    anchors.top.parent = root;
    anchors.stopcock.parent = root;
    anchors.tip.parent = root;

    anchors.top.position = new Vector3(0, +tubeAbove, 0);
    anchors.stopcock.position = new Vector3(
      0,
      -Math.min(0.2, tubeBelow * 0.8),
      0
    );
    anchors.tip.position = new Vector3(0, -tubeBelow - 0.06, 0);

    // Seed metadata IMMEDIATELY with safe defaults to avoid null reads
    const MAX_CAPACITY_ML = Math.min(49, capacityMl);
    root.metadata = {
      anchors,
      flow: {
        mlRemaining: MAX_CAPACITY_ML,
        mlPerSecond: 0,
        emitRateFor: () => 0,
        setFlowRate: () => {},
        stop: () => {},
        isEmpty: () => false,
      },
      stopcock: null,
      startDrip: () => {},
      stopDrip: () => {},
      toggleStopcock: () => {},
      setWaterColor: () => {}, // no-op until particles exist
    };

    /* ─────────────────── GLASS ───────────────── */
    let glassMat = scene.getMaterialByName("glassMat");
    if (!glassMat) {
      glassMat = new PBRMaterial("glassMat", scene);
      glassMat.albedoColor = Color3.White();
      glassMat.roughness = 0.25;
      glassMat.alpha = 0.06;
      glassMat.indexOfRefraction = 1.5;
      glassMat.environmentIntensity = 0.5;
      glassMat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
      glassMat.backFaceCulling = true;
      glassMat.needDepthPrePass = false; // keep particles visible behind glass
      glassMat.emissiveColor = Color3.White();
    }

    const path = [
      new Vector3(0, +tubeAbove, 0),
      new Vector3(0, 0, 0),
      new Vector3(0, -tubeBelow, 0),
    ];

    const tube = MeshBuilder.CreateTube(
      `${name}_tube`,
      {
        path,
        radius: tubeOuterRadius,
        tessellation: tubeTessellation,
        cap: Mesh.CAP_ALL,
        updatable: false,
      },
      scene
    );
    tube.material = glassMat;
    tube.parent = root;

    /* ─────────────────── GRAD TEX (numbers) ──── */
    const DPR =
      typeof window !== "undefined" && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    const scale = Math.max(1, Math.floor(texSuperSample * DPR));
    const hiW = texW * scale;
    const hiH = texH * scale;

    const gradTex = new DynamicTexture(
      `${name}_gradTex`,
      { width: hiW, height: hiH },
      scene,
      true,
      Texture.TRILINEAR_SAMPLINGMODE
    );
    gradTex.hasAlpha = true;
    gradTex.wrapU = Texture.CLAMP_ADDRESSMODE;
    gradTex.wrapV = Texture.CLAMP_ADDRESSMODE;
    gradTex.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
    const caps = scene.getEngine().getCaps();
    gradTex.anisotropicFilteringLevel = caps.maxAnisotropy ?? 16;

    const ctx = gradTex.getContext();
    ctx.clearRect(0, 0, hiW, hiH);
    if ("imageSmoothingEnabled" in ctx) ctx.imageSmoothingEnabled = false;

    ctx.strokeStyle = gradColor;
    ctx.fillStyle = gradColor;
    ctx.lineWidth = 2 * scale;
    ctx.textAlign = "left";
    ctx.font = `${80 * scale}px Arial`;
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 6 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const topPadPx = Math.round(hiH * 0.04);
    const botPadPx = Math.round(hiH * 0.04);
    const usableH = hiH - topPadPx - botPadPx;
    const longLen = Math.round(hiW * 0.14);
    const labelOff = longLen + 50 * scale;
    const yOfMl = (ml) => topPadPx + (ml / capacityMl) * usableH;

    for (let m = 0; m <= capacityMl; m += majorTickEveryMl) {
      const y = yOfMl(m);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(longLen, y);
      ctx.stroke();
      if (m % labelEveryMl === 0) {
        ctx.fillText(String(m), labelOff, y + 18 * scale);
      }
    }
    gradTex.update();

    const gradMat = new PBRMaterial(`${name}_gradMat`, scene);
    // Unlit look for crisp labels
    gradMat.unlit = true;
    gradMat.disableLighting = true;
    gradMat.emissiveColor = Color3.White();
    gradMat.emissiveTexture = gradTex;
    gradMat.opacityTexture = gradTex;
    gradMat.emissiveIntensity = emissiveBoost;
    gradMat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
    gradMat.backFaceCulling = true;
    gradMat.fogEnabled = false;
    gradMat.zOffset = -2;

    const overlayRadius = tubeOuterRadius + Math.max(gradOffset, 0.0005);
    const overlayPath = [...path];

    const overlay = MeshBuilder.CreateTube(
      `${name}_gradOverlay`,
      {
        path: overlayPath,
        radius: overlayRadius,
        tessellation: tubeTessellation,
        cap: Mesh.CAP_ALL,
        updatable: false,
      },
      scene
    );
    overlay.material = gradMat;
    overlay.parent = root;
    overlay.isPickable = false;

    // Ensure labels render on top of glass but below UI
    tube.renderingGroupId = 1;
    overlay.renderingGroupId = 3;
    tube.alphaIndex = 0;
    overlay.alphaIndex = 1;

    // Flip V so numbers aren't upside-down
    overlay.rotation.y = Math.PI / 6;
    gradMat.emissiveTexture.vScale = -1;
    gradMat.emissiveTexture.vOffset = 1;
    gradMat.opacityTexture.vScale = gradMat.emissiveTexture.vScale;
    gradMat.opacityTexture.vOffset = gradMat.emissiveTexture.vOffset;

    /* ─────────────────── STOPCOCK ───────────── */
    const stopcockComponent = CreateStopcock(scene, anchors.stopcock, {
      bodyLength: 0.028,
      plugLength: 0.036,
      bodyRadius: 0.0065,
      closedDeg: 0,
      openDeg: 90,
      initialDeg: 0,
      animationDuration: stopcockAnimationDuration,
    });

    const stopcockClearance = 0.035;
    anchors.top.position = new Vector3(0, +tubeAbove, 0);
    anchors.tip.position = new Vector3(0, -tubeBelow - 0.04, 0);
    anchors.stopcock.position = new Vector3(
      0,
      anchors.tip.position.y + stopcockClearance,
      0
    );

    /* ─────────────────── TIP / NOZZLE ───────── */
    const tipBodyLength = bodyLengthOfTip ?? 0.065;
    const tipTaperLength = taperLength ?? 0.014;
    const tipNozzleLength = NozzleLength ?? 0.009;
    const tipNozzleRadius = NozzleRadius ?? 0.007;

    const tipShoulderRadius = tubeOuterRadius * 0.92;
    const tipBodyRadius = tubeOuterRadius * 0.98;

    const shape = [];
    let y = 0;
    shape.push(new Vector3(tipNozzleRadius, y, 0));
    y += tipNozzleLength;
    shape.push(new Vector3(tipNozzleRadius, y, 0));
    y += tipTaperLength * 0.25;
    shape.push(new Vector3(Math.max(tipNozzleRadius * 1.6, 0.0012), y, 0));
    y += tipTaperLength * 0.75;
    shape.push(new Vector3(tipShoulderRadius, y, 0));
    y += tipBodyLength;
    shape.push(new Vector3(tipBodyRadius, y, 0));
    shape.push(new Vector3(tubeOuterRadius, y + 0.002, 0));

    const tipMesh = MeshBuilder.CreateLathe(
      `${name}_tipLathe`,
      {
        shape,
        tessellation: 96,
        sideOrientation: Mesh.FRONTSIDE,
        cap: Mesh.CAP_END,
      },
      scene
    );

    let tipGlass = glassMat;
    try {
      tipGlass = glassMat.clone(`${name}_tipGlass`);
      tipGlass.roughness = Math.min(0.6, glassMat.roughness + 0.07);
    } catch {}
    tipMesh.material = tipGlass;
    tipMesh.parent = anchors.tip;
    tipMesh.renderingGroupId = tube.renderingGroupId;
    tipMesh.isPickable = false;

    /* ─────────────────── DRIP PARTICLES ─────── */
    // Helper to generate a radial soft circle in a DynamicTexture
    const createColoredTexture = (color /* Color3 */) => {
      const size = 64;
      const dyn = new DynamicTexture(
        `fluidTexture_${name}_${Math.random().toString(36).slice(2)}`,
        { width: size, height: size },
        scene,
        true
      );
      dyn.hasAlpha = true;
      const ctx = dyn.getContext();
      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2;

      const to255 = (v) => Math.floor(v * 255);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(
        0,
        `rgba(${to255(color.r)}, ${to255(color.g)}, ${to255(color.b)}, 0.8)`
      );
      g.addColorStop(
        0.3,
        `rgba(${to255(color.r)}, ${to255(color.g)}, ${to255(color.b)}, 0.6)`
      );
      g.addColorStop(
        1,
        `rgba(${to255(color.r)}, ${to255(color.g)}, ${to255(color.b)}, 0.0)`
      );

      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      dyn.update();
      return dyn;
    };

    const ps = new ParticleSystem(`${name}_drip`, 600, scene);
    // initial tint (clear/acidic)
    const initialTint = new Color3(0.53, 0.81, 0.92); // #87CEEB
    let particleTex = createColoredTexture(initialTint);
    ps.particleTexture = particleTex;

    ps.emitter = tipMesh;         // emit from the tip
    ps.isLocal = true;            // in local space of emitter
    ps.minEmitBox = new Vector3(0, -0.001, 0);
    ps.maxEmitBox = new Vector3(0,  0.001, 0);

    // Visual look: fade out by end of life
    ps.color1 = new Color4(1, 1, 1, 1);
    ps.color2 = new Color4(1, 1, 1, 1);
    ps.colorDead = new Color4(1, 1, 1, 0);

    // Tiny droplets
    ps.minSize = 0.002;
    ps.maxSize = 0.004;

    // Motion
    ps.direction1 = new Vector3(0, -0.5, 0);
    ps.direction2 = new Vector3(0, -1.2, 0);
    ps.gravity = new Vector3(0, -2.0, 0);

    ps.minLifeTime = 0.25;
    ps.maxLifeTime = 0.6;

    ps.minEmitPower = 0.2;
    ps.maxEmitPower = 0.4;

    // Start off; flow API will drive this
    ps.emitRate = 0;

    // Render AFTER glass, BEFORE overlay labels
    ps.renderingGroupId = 2;
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    ps.forceDepthWrite = false;

    // Flow controller (now wired into metadata we seeded earlier)
    const flow = {
      mlRemaining: MAX_CAPACITY_ML,
      mlPerSecond: 0,
      emitRateFor: (mlps) => Math.min(800, Math.max(0, mlps * 120)),
      setFlowRate(mlps) {
        this.mlPerSecond = Math.max(0, mlps);
        ps.emitRate = this.emitRateFor(this.mlPerSecond);
        if (this.mlPerSecond > 0 && !ps.isStarted()) ps.start();
        if (this.mlPerSecond === 0 && ps.isStarted()) ps.stop();
      },
      stop() {
        this.setFlowRate(0);
      },
      isEmpty() {
        return this.mlRemaining <= 0;
      },
    };

    // Wire real functions into metadata (replacing no-ops)
    root.metadata.flow = flow;

    const startDrip = (mlPerSecond) => {
      // Open then start flow
      stopcockComponent.setAngleDegAnimated(90, () => {
        flow.setFlowRate(mlPerSecond);
      });
    };
    const stopDrip = () => {
      // Stop flow then close
      flow.stop();
      stopcockComponent.setAngleDegAnimated(0);
    };
    const toggleStopcock = () => {
      return stopcockComponent.animate180Toggle(() => {
        const aperture = stopcockComponent.aperture01();
        if (aperture > 0.5) flow.setFlowRate(0.25);
        else flow.stop();
      });
    };

    // Efficient color change: dispose old texture safely and set a new one
    const setWaterColor = (c3 /* Color3 */) => {
      try {
        // Replace the particle texture with a recolored one
        const newTex = createColoredTexture(c3);
        const old = ps.particleTexture;
        ps.particleTexture = newTex;
        particleTex = newTex;
        // Dispose the old texture AFTER swapping to avoid flicker
        if (old && old !== newTex) {
          old.dispose();
        }
        // If already running, no need to restart; particles will use the new texture
      } catch (err) {
        console.warn("Failed to update burette particle color:", err);
      }
    };

    root.metadata.startDrip = startDrip;
    root.metadata.stopDrip = stopDrip;
    root.metadata.toggleStopcock = toggleStopcock;
    root.metadata.setWaterColor = setWaterColor;
    root.metadata.stopcock = stopcockComponent;

    // Drain logic
    let last = performance.now();
    const onBefore = scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      if (flow.mlPerSecond > 0 && flow.mlRemaining > 0) {
        const out = flow.mlPerSecond * dt;
        flow.mlRemaining = Math.max(0, flow.mlRemaining - out);
        ps.emitRate = flow.emitRateFor(flow.mlPerSecond);

        if (flow.isEmpty()) {
          flow.stop();
          ps.emitRate = 0;
        }
      }
    });

    // Optional: tiny demo drip to show life, then stop (kept from your version)
    setTimeout(() => {
      try {
        setWaterColor(initialTint);
        flow.setFlowRate(0.25);
        setTimeout(() => {
          flow.stop();
          stopcockComponent.setAngleDegAnimated(0);
        }, 1000);
      } catch {}
    }, 500);

    /* ─────────────────── CLEANUP ─────────────── */
    return () => {
      try {
        scene.onBeforeRenderObservable.remove(onBefore);
      } catch {}
      try {
        ps.stop();
        ps.dispose();
      } catch {}
      try {
        particleTex?.dispose();
      } catch {}
      try {
        overlay?.dispose();
        tube?.dispose();
      } catch {}
      try {
        anchors.tip?.dispose();
        anchors.stopcock?.dispose();
        anchors.top?.dispose();
      } catch {}
      try {
        root?.dispose();
      } catch {}
    };
  }, [scene, name, JSON.stringify(options)]);

  return null;
}