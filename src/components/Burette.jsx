// src/components/CreateBurette.jsx
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
} from "@babylonjs/core";
import { CreateStopcock } from "./StopCock";

export default function CreateBurette({
  scene,
  name = "burette",
  options = {},
}) {
  useEffect(() => {
    if (!scene) return;

    if (!scene.environmentTexture) {
      const env = scene.createDefaultEnvironment();
      if (env?.skybox) env.skybox.isVisible = false;
    }

    if (scene.activeCamera && scene.activeCamera.minZ < 0.05) {
      scene.activeCamera.minZ = 0.05;
    }

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

      // NEW: tip controls exposed to options
      bodyLengthOfTip,      // default applied below
      taperLength,          // default applied below
      NozzleLength,         // default applied below (capital N preserved)
      NozzleRadius,         // default applied below (capital N preserved)
    } = options;

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
    anchors.stopcock.position = new Vector3(0, -Math.min(0.20, tubeBelow * 0.8), 0);
    anchors.tip.position = new Vector3(0, -tubeBelow - 0.06, 0);

    root.metadata = { anchors };

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
      glassMat.needDepthPrePass = true;
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

    const DPR = (typeof window !== "undefined" && window.devicePixelRatio) ? window.devicePixelRatio : 1;
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
    const labelOff = longLen + (50 * scale);
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
    gradMat.unlit = true;
    gradMat.disableLighting = true;
    gradMat.emissiveColor = Color3.White();
    gradMat.emissiveTexture = gradTex;
    gradMat.opacityTexture = gradTex;
    gradMat.emissiveIntensity = emissiveBoost;
    gradMat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
    gradMat.alphaMode = scene.getEngine().ALPHA_PREMULTIPLIED_PORTERDUFF;
    gradMat.backFaceCulling = true;
    gradMat.fogEnabled = false;
    gradMat.zOffset = -2;

    const overlayRadius = tubeOuterRadius + Math.max(gradOffset, 0.0005);
    const overlayPath = [
      new Vector3(0, +tubeAbove, 0),
      new Vector3(0, 0, 0),
      new Vector3(0, -tubeBelow, 0),
    ];

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

    tube.renderingGroupId = 1;
    overlay.renderingGroupId = 2;
    tube.alphaIndex = 0;
    overlay.alphaIndex = 1;

    overlay.rotation.y = Math.PI / 6;
    gradMat.emissiveTexture.vScale = -1; gradMat.emissiveTexture.vOffset = 1;
    gradMat.opacityTexture.vScale = gradMat.emissiveTexture.vScale;
    gradMat.opacityTexture.vOffset = gradMat.emissiveTexture.vOffset;

    const stop = CreateStopcock(scene, anchors.stopcock, {
      bodyLength: 0.028,
      plugLength: 0.036,
      bodyRadius: 0.0065,
      closedDeg: 0,
      openDeg: 90,
      initialDeg: 0,
    });

    const stopcockClearance = 0.035;
    anchors.top.position = new Vector3(0, +tubeAbove, 0);
    anchors.tip.position = new Vector3(0, -tubeBelow - 0.04, 0);
    anchors.stopcock.position = new Vector3(
      0,
      anchors.tip.position.y + stopcockClearance,
      0
    );

    // ----- Tip / Nozzle (lathe) -----
    const tipBodyLength   = bodyLengthOfTip ?? 0.065;
    const tipTaperLength  = (taperLength ?? 0.014);
    const tipNozzleLength = (NozzleLength ?? 0.009);
    const tipNozzleRadius = (NozzleRadius ?? 0.007);

    const tipShoulderRadius = tubeOuterRadius * 0.92;
    const tipBodyRadius     = tubeOuterRadius * 0.98;

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
    } catch (_) { /* noop */ }

    tipMesh.material = tipGlass;
    tipMesh.parent = anchors.tip;
    tipMesh.renderingGroupId = tube.renderingGroupId;
    tipMesh.isPickable = false;

    return () => {
      overlay?.dispose();
      tube?.dispose();
      anchors.tip?.dispose();
      anchors.stopcock?.dispose();
      anchors.top?.dispose();
      root?.dispose();
    };
  }, [scene, name, JSON.stringify(options)]);

  return null;
}