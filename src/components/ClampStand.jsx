// src/components/CreateStandAndClamp.jsx
import React, { useEffect } from "react";
import {
    MeshBuilder,
    TransformNode,
    Color3,
    PBRMaterial,
    Vector3,
    Curve3
} from "@babylonjs/core";

export default function CreateStandAndClamp({
    scene,
    name = "standAndClamp",
    options = {},
}) {
    useEffect(() => {
        if (!scene) return;

        /* ───────────────── Materials (shared if present) ───────────────── */
        const getOrMakePBR = (id, make) => {
            let m = scene.getMaterialByName(id);
            if (!m) m = make(id);
            return m;
        };

        const metalMat = getOrMakePBR("metalMat", (id) => {
            const m = new PBRMaterial(id, scene);
            m.albedoColor = Color3.FromHexString("#cfd5da"); // bright, clean metal
            m.metallic = 0.65;
            m.roughness = 0.3;          // a bit glossier for clarity
            m.environmentIntensity = 0.7;
            m.backFaceCulling = false;
            return m;
        });

        const blackMat = getOrMakePBR("standBlackMat", (id) => {
            const m = new PBRMaterial(id, scene);
            m.albedoColor = Color3.FromHexString("#0e0e12");
            m.metallic = 0.0;
            m.roughness = 0.9;          // very matte base
            return m;
        });

        const rubberMat = getOrMakePBR("rubberMat", (id) => {
            const m = new PBRMaterial(id, scene);
            m.albedoColor = Color3.FromHexString("#000000");
            m.metallic = 0.0;
            m.roughness = 0.95;
            m.backFaceCulling = false;
            return m;
        });

        /* ───────────────── Options / defaults ───────────────── */
        const {
            // Base
            baseWidth = 0.65,
            baseDepth = 0.30,
            baseHeight = 0.03,
            // Put the rod at the “beginning” (front-left edge by default)
            rodOffsetX = 0.45,   // as fraction of half-width (−0.5 .. +0.5). −0.45 ≈ near left edge
            rodOffsetZ = 0,   // as fraction of half-depth (−0.5 .. +0.5). −0.35 ≈ near front edge
            // Rod
            rodHeight = 0.85,
            rodRadius = 0.012,
            // Clamp placement (measured from bottom of ROD)
            clampY = 0.6,         // if ≤1 treat as ratio of rodHeight
            clampRotateY = Math.PI,     // radians, spin clamp around rod through PI
            // Crossbar
            crossbarLength = 0.28,
            crossbarRadius = 0.009,

            // Circular jaws (disks) at end of crossbar, facing each other
            jawMaxGap = 0.045,
            jawOpen = 0.3,     // 0..1
            jawRadius = 0.018,
            jawThickness = 0.012,
            // Optional style overrides
            style = {},
        } = options;

        if (style.metal?.roughness != null) metalMat.roughness = style.metal.roughness;
        if (style.metal?.environmentIntensity != null)
            metalMat.environmentIntensity = style.metal.environmentIntensity;
        if (style.base?.roughness != null) blackMat.roughness = style.base.roughness;

        /* ───────────────── Root & anchors ───────────────── */
        const root = new TransformNode(`${name}Root`, scene);

        const anchors = {
            rodTop: new TransformNode(`${name}_rodTop`, scene),
            clampSocket: new TransformNode(`${name}_clampSocket`, scene),
            crossbarTip: new TransformNode(`${name}_crossbarTip`, scene),
        };
        Object.values(anchors).forEach((a) => (a.parent = root));
        root.metadata = { anchors };
        /* ───────────────── 1) Base (clean, high-detail) ───────────────── */
        const base = MeshBuilder.CreateBox(
            `${name}_base`,
            { width: baseWidth, height: baseHeight, depth: baseDepth, updatable: false },
            scene
        );
        base.position.y = baseHeight / 2;
        base.material = blackMat;
        base.parent = root;

        // Slight top “cap” inset to fake a bevel
        const capH = baseHeight * 0.35;
        const cap = MeshBuilder.CreateBox(
            `${name}_baseCap`,
            {
                width: baseWidth * 0.965,
                height: capH,
                depth: baseDepth * 0.965,
                updatable: false,
            },
            scene
        );
        cap.position.y = baseHeight - capH / 2; // sits flush at the very top
        cap.material = blackMat;
        cap.parent = base;
        /* ───────────────── 2) Vertical rod (moved to base “beginning”) ───────────────── */
        const rod = MeshBuilder.CreateCylinder(
            `${name}_rod`,
            {
                height: rodHeight,
                diameter: rodRadius * 2,
                tessellation: 128, // higher tessellation for cleaner look
                updatable: false,
            },
            scene
        );
        const rx = (baseWidth * 0.5) * rodOffsetX * 2; // map −0.5..0.5 → −half..+half
        const rz = (baseDepth * 0.5) * rodOffsetZ * 2;
        rod.position.set(rx, baseHeight + rodHeight / 2, rz);
        rod.material = metalMat;
        rod.parent = root;

        anchors.rodTop.position = new Vector3(rx, baseHeight + rodHeight, rz);

        /* ───────────────── 3) Clamp assembly ───────────────── */
        const clampAsm = new TransformNode(`${name}_clampAsm`, scene);
        clampAsm.parent = rod;

        const clampYWorld =
            clampY <= 1 ? clampY * rodHeight : Math.min(clampY, rodHeight * 0.98);

        // Local to rod (rod’s local origin is at its center)
        clampAsm.position = new Vector3(0, -rodHeight / 2 + clampYWorld, 0);
        clampAsm.rotation = new Vector3(0, clampRotateY, 0);

        // Bosshead
        const boss = MeshBuilder.CreateBox(
            `${name}_bosshead`,
            { width: 0.055, height: 0.035, depth: 0.035, updatable: false },
            scene
        );
        boss.material = metalMat;
        boss.parent = clampAsm;

        // Crossbar (high tessellation)
        const crossbar = MeshBuilder.CreateCylinder(
            `${name}_crossbar`,
            {
                height: crossbarLength,
                diameter: crossbarRadius * 2,
                tessellation: 128,
                updatable: false,
            },
            scene
        );
        crossbar.rotation.z = Math.PI / 2; // along +X
        crossbar.position.x = crossbarLength / 2;
        crossbar.material = metalMat;
        crossbar.parent = clampAsm;

        anchors.crossbarTip.parent = crossbar;
        anchors.crossbarTip.position = new Vector3(crossbarLength / 2, 0, 0);

        /* ───────────────── 4) Circular jaws at crossbar tip ───────────────── */
        const gap = jawMaxGap * Math.max(0, Math.min(1, jawOpen));

        // Build a U-bolt style jaw with optional left/right tilt
        const makeJaw = (
            id,
            {
                innerRadius = jawRadius,     // radius of the arc (inner)
                rodDiameter = Math.max(jawThickness, jawRadius * 0.6), // tube thickness
                steps = 64,                  // curve resolution
            } = {}
        ) => {
            // Parent transform for the whole jaw
            const jaw = new TransformNode(id, scene);

            // Three points defining a semicircle in the YZ plane, opening toward +Z.
            // Endpoints at y=±innerRadius, and apex at z=+innerRadius.
            const p1 = new Vector3(0, innerRadius, 0);
            const p2 = new Vector3(0, 0, innerRadius);
            const p3 = new Vector3(0, -innerRadius, 0);

            // Compute the arc passing through the 3 points
            const curve = Curve3.ArcThru3Points(p1, p2, p3, steps /*, closed?=false, fullCircle?=false */);
            const path = curve.getPoints();

            // Tube along that arc
            const arcTube = MeshBuilder.CreateTube(
                `${id}_tube`,
                {
                    path,
                    radius: rodDiameter * 0.5,
                    tessellation: Math.max(16, steps),
                    cap: MeshBuilder.CAP_ROUND,
                    updatable: false,
                },
                scene
            );

            arcTube.material = metalMat; // or rubberMat if you prefer
            arcTube.parent = jaw;
            return jaw; // a TransformNode containing the tube mesh
        };
        // Face each other across ±Z; positioned at end of crossbar (x = crossbarLength)
        // Gap already computed: const gap = jawMaxGap * clampFrac(jawOpen, 0, 1);

        // LEFT jaw — opens toward +Z by construction (no extra rotation)
        const jawLeft = makeJaw(`${name}_jawLeft`, {
            innerRadius: jawRadius,
            rodDiameter: jawThickness,
            steps: 64,
        });
        jawLeft.getChildMeshes().forEach(m => (m.material = rubberMat));
        jawLeft.parent = anchors.crossbarTip;     // ← attach to rod tip
        jawLeft.position.set(-0.14, -0.15, +gap / 2);     // split along ±Z only
        jawLeft.rotation.set(0, 0, 0);            // ensure no inherited weirdness

        // RIGHT jaw — mirror to open toward −Z with a local Y rotation
        const jawRight = makeJaw(`${name}_jawRight`, {
            innerRadius: jawRadius,
            rodDiameter: jawThickness,
            steps: 64,
        });
        jawRight.getChildMeshes().forEach(m => (m.material = rubberMat));
        jawRight.parent = anchors.crossbarTip;    // ← attach to rod tip
        jawRight.position.set(-0.14, -0.15, -gap / 2);
        jawRight.rotation.set(0, Math.PI, 0);     // clean 180° yaw flip


        /* ───────────────── Cleanup ───────────────── */
        return () => {
            [jawLeft, jawRight, crossbar, boss, clampAsm, rod, cap, base].forEach(
                (m) => m && m.dispose()
            );
            Object.values(anchors).forEach((a) => a && a.dispose());
            root.dispose();
        };
    }, [scene, name, JSON.stringify(options)]);

    return null;
}