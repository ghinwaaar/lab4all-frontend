// src/experiments/TitrationScene.jsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
    Engine,
    Scene,
    ArcRotateCamera,
    HemisphericLight,
    Vector3,
    Color3,
    Color4,
} from "@babylonjs/core";
import CreateFlask from "../components/Flask";
import CreateStandAndClamp from "../components/ClampStand";
import CreateBurette from "../components/Burette";

const BASE_CLEAR_HEX = "#87CEEB";

function classify(pH) {
    if (Math.abs(pH - 7) < 0.05) return "Equivalence (Neutral)";
    if (pH < 8.2) return "Acidic (Clear)";
    if (pH < 10.0) return "Near Endpoint (Faint Pink)";
    return "Basic (Pink)";
}

export default forwardRef(function TitrationScene({ onUpdate }, ref) {
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const camRef = useRef(null);
    const rafRef = useRef(0);
    const [ready, setReady] = useState(false); // <- triggers re-render to mount instruments
    const sceneIsDisposed = () => {
        const s = sceneRef.current;
        if (!s) return true;
        const v = s.isDisposed;
        return typeof v === "function" ? v.call(s) : !!v;
    };
    // experiment constants
    const Cb = 0.10;
    const MAX_ADD_ML = 49.0;
    const CA_STOCK = 0.050;
    const ACID_MIXING_K = 20;
    const FLASK_CAPACITY_ML = 100;
    const MIN_LIQUID_TO_ALLOW_BASE = 1.0;

    // persistent experiment state
    const expRef = useRef({
        Va: 0, // flask mL
        Vb: 0, // delivered base mL
        totalAddedMl: 0,
        currentFlaskMl: 0,
    });

    // helpers to access meshes (always via sceneRef.current)
    const getFlaskRoot = () => sceneRef.current?.getTransformNodeByName("titrationFlaskRoot");
    const getBuretteRoot = () => sceneRef.current?.getTransformNodeByName("buretteRoot");

    // chemistry
    const clampPH = (pH) => (Number.isFinite(pH) ? Math.min(14, Math.max(0, pH)) : 7);
    const effectiveCa = (Va_ml) => (Va_ml <= 0 ? 0 : CA_STOCK * (Va_ml / (Va_ml + ACID_MIXING_K)));
    const computePH = (Va_ml, Vb_ml) => {
        const Ca_eff = effectiveCa(Va_ml);
        const na = Ca_eff * Va_ml;
        const nb = Cb * Vb_ml;
        const VT = Math.max(1e-12, Va_ml + Vb_ml);
        const eps = 1e-15;

        if (nb < na - eps) {
            const H = (na - nb) / VT;
            return clampPH(-Math.log10(Math.max(H, eps)));
        } else if (Math.abs(nb - na) <= 1e-12) {
            return 7;
        } else {
            const OH = (nb - na) / VT;
            const pOH = -Math.log10(Math.max(OH, eps));
            return clampPH(14 - pOH);
        }
    };

    const color3ToHex = (c) => {
        const to255 = (x) => Math.max(0, Math.min(255, Math.round(x * 255)));
        return `#${to255(c.r).toString(16).padStart(2, "0")}${to255(c.g)
            .toString(16)
            .padStart(2, "0")}${to255(c.b).toString(16).padStart(2, "0")}`;
    };

    const phenolphthaleinBlend = (pH, baseHex) => {
        const start = 8.2, end = 10.0;
        const t = Math.min(1, Math.max(0, (pH - start) / (end - start)));
        const base = Color3.FromHexString(baseHex);
        const target = new Color3(249 / 255, 6 / 255, 160 / 255); // #f906a0
        return new Color3(
            base.r + (target.r - base.r) * t,
            base.g + (target.g - base.g) * t,
            base.b + (target.b - base.b) * t
        );
    };

    const emitUpdate = () => {
        const { Va, Vb, currentFlaskMl } = expRef.current;
        const pH = computePH(Va, Vb);
        const stateLabel =
            currentFlaskMl < MIN_LIQUID_TO_ALLOW_BASE
                ? "State: add ≥ 1 mL (diluted acid)"
                : `State: ${classify(pH)}`;
        onUpdate?.({
            Cb,
            Va,
            Vb,
            pH,
            stateLabel,
            filledText: `Filled: ${currentFlaskMl.toFixed(1)} / ${FLASK_CAPACITY_ML} mL`,
        });
    };

    // imperative API exposed to parent
    useImperativeHandle(ref, () => ({
        startFill(amountMl) {
            const s = sceneRef.current;
            if (!s) return;
            const st = expRef.current;

            // clamp request to capacity
            const capRemaining = FLASK_CAPACITY_ML - st.currentFlaskMl;
            const delta = Math.max(0, Math.min(Number(amountMl) || 0, capRemaining));
            if (delta <= 0.0001) return;

            // SNAPSHOT the baseline once; don't read from a mutating object each frame
            const startVa = st.Va;

            // animate: 20 mL/s
            const startTime = performance.now();
            const duration = (delta / 20) * 1000;

            const tick = (now) => {
                if (sceneIsDisposed()) return;

                const t = Math.min(1, (now - startTime) / duration);

                // interpolate from the FIXED baseline to baseline + delta
                const newVa = Math.min(FLASK_CAPACITY_ML, startVa + delta * t);

                st.Va = newVa;
                st.currentFlaskMl = newVa;

                // update visuals
                getFlaskRoot()?.metadata?.setLevelMl?.(newVa);
                const pH = computePH(st.Va, st.Vb);
                const blended = phenolphthaleinBlend(pH, BASE_CLEAR_HEX);
                const hex = color3ToHex(blended);
                getFlaskRoot()?.metadata?.setFluidColor?.(hex);
                try { getBuretteRoot()?.metadata?.setWaterColor?.(Color3.FromHexString(hex)); } catch { }

                emitUpdate();

                if (t < 1) {
                    rafRef.current = requestAnimationFrame(tick);
                }
            };

            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(tick);
        },


        stopFill() {
            cancelAnimationFrame(rafRef.current);
        },

        addNaOH(requestMl) {
            const s = sceneRef.current;
            if (!s) return;
            const st = expRef.current;
            if (st.currentFlaskMl < MIN_LIQUID_TO_ALLOW_BASE) return;

            const delta = Math.max(0, Math.min(requestMl, MAX_ADD_ML - st.totalAddedMl));
            if (delta <= 0.0001) return;

            const root = getBuretteRoot();
            const start = root?.metadata?.startDrip;
            const stop = root?.metadata?.stopDrip;
            const secs = 2.0;
            const mlps = delta / secs;
            start?.(mlps);
            setTimeout(() => stop?.(), secs * 1000);

            st.totalAddedMl += delta;
            st.Vb += delta;

            const pH = computePH(st.Va, st.Vb);
            const blended = phenolphthaleinBlend(pH, BASE_CLEAR_HEX);
            const hex = color3ToHex(blended);
            getFlaskRoot()?.metadata?.setFluidColor?.(hex);
            try { getBuretteRoot()?.metadata?.setWaterColor?.(Color3.FromHexString(hex)); } catch { }

            emitUpdate();
        },

        reset() {
            const s = sceneRef.current;
            if (!s) return;

            cancelAnimationFrame(rafRef.current);
            expRef.current = { Va: 0, Vb: 0, totalAddedMl: 0, currentFlaskMl: 0 };

            const flaskRoot = getFlaskRoot();
            flaskRoot?.metadata?.setFluidColor?.(BASE_CLEAR_HEX);
            flaskRoot?.metadata?.setLevelMl?.(0);

            const buretteRoot = getBuretteRoot();
            buretteRoot?.metadata?.stopDrip?.();
            if (buretteRoot?.metadata?.flow) buretteRoot.metadata.flow.mlRemaining = 49;

            emitUpdate();
            // re-place after reset (optional)
            placeInstruments();
        },
    }));

    // init scene/engine
    useEffect(() => {
        const canvas = canvasRef.current;
        const engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true,
        });
        engineRef.current = engine;

        const scene = new Scene(engine);
        sceneRef.current = scene;

        // BLACK background
        scene.clearColor = new Color4(0, 0, 0, 1);

        // Camera/light
        const cam = new ArcRotateCamera("cam", Math.PI * 0.33, Math.PI * 0.27, 1.9, Vector3.Zero(), scene);
        cam.panningSensibility = 1200;
        cam.lowerBetaLimit = 0.03;
        cam.upperBetaLimit = Math.PI / 2.05;
        cam.lowerRadiusLimit = 1.1;
        cam.upperRadiusLimit = 6.0;
        cam.wheelDeltaPercentage = 0.03;
        cam.pinchDeltaPercentage = 0.02;
        cam.useNaturalPinchZoom = true;
        cam.attachControl(canvas, true);
        cam.useFramingBehavior = true;
        const fb = cam.getBehaviorByName("Framing");
        if (fb) fb.framingTime = 0.6;
        camRef.current = cam;

        const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
        hemi.intensity = 1.15;

        engine.runRenderLoop(() => scene.render());

        // mark ready so instruments mount
        setReady(true);

        // frame target
        scene.executeWhenReady(() => cam.setTarget(Vector3.Zero()));

        const onResize = () => engine.resize();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            cancelAnimationFrame(rafRef.current);
            scene.dispose();
            engine.dispose();
            sceneRef.current = null;
            engineRef.current = null;
        };
    }, []);

    // initial UI sync
    useEffect(() => {
        if (!sceneRef.current) return;
        emitUpdate();
    }, []);

    // Restore original instrument positioning once nodes exist
    const placeInstruments = () => {
        const s = sceneRef.current;
        if (!s) return;

        const standRoot = s.getTransformNodeByName("standAndClampRoot");
        const buretteRoot = s.getTransformNodeByName("buretteRoot");
        const flaskRoot = s.getTransformNodeByName("titrationFlaskRoot");
        const standAnchors = standRoot?.metadata?.anchors;
        const buretteAnchors = buretteRoot?.metadata?.anchors;

        if (!standRoot || !buretteRoot || !flaskRoot || !standAnchors || !buretteAnchors) return false;

        // mount burette in clamp
        const clampSocketWorld = standAnchors.clampSocket.getAbsolutePosition();
        const stopcockBelowClamp = 0.55;
        const desiredStopcockWorld = clampSocketWorld.add(new Vector3(0, stopcockBelowClamp, 0));
        const stopcockWorld = buretteAnchors.stopcock.getAbsolutePosition();
        const delta = desiredStopcockWorld.subtract(stopcockWorld);
        buretteRoot.position.addInPlace(delta);

        // flask centered under burette
        const socketWorld = standAnchors.clampSocket.getAbsolutePosition();
        flaskRoot.position.copyFrom(socketWorld);
        flaskRoot.position.y += 0.05;

        return true;
    };

    // Try placing a few frames until anchors are ready
    useEffect(() => {
        if (!ready) return;
        let tries = 0;
        const s = sceneRef.current;
        if (!s) return;

        const tryPlace = () => {
            if (placeInstruments() || tries++ > 60) {
                s.onAfterRenderObservable.removeCallback(tryPlace);
            }
        };
        s.onAfterRenderObservable.add(tryPlace);

        return () => s?.onAfterRenderObservable.removeCallback?.(tryPlace);
    }, [ready]);

    return (
        <>
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none" }}
            />
            {ready && (
                <>
                    <CreateStandAndClamp
                        scene={sceneRef.current}
                        name="standAndClamp"
                        options={{
                            rodOffsetX: 0.45,
                            rodOffsetZ: 0.0,
                            baseWidth: 0.65,
                            baseDepth: 0.30,
                            baseHeight: 0.03,
                            rodHeight: 0.9,
                            rodRadius: 0.012,
                            clampY: 0.7,
                            clampRotateY: Math.PI,
                            crossbarLength: 0.28,
                            crossbarRadius: 0.009,
                            jawOpen: 0.30,
                            jawMaxGap: 0.045,
                            jawRadius: 0.018,
                            jawThickness: 0.012,
                        }}
                    />
                    <CreateFlask
                        scene={sceneRef.current}
                        name="titrationFlask"
                        options={{
                            height: 0.3,
                            maxRadius: 0.1,
                            neckRadius: 0.05,
                            neckHeight: 0.09,
                            capacityMl: 100,
                            initialFillMl: 0,
                        }}
                    />
                    <CreateBurette
                        scene={sceneRef.current}
                        name="burette"
                        options={{
                            tubeAbove: 0.55,
                            tubeBelow: 0.28,
                            tubeOuterRadius: 0.0085,
                            tubeTessellation: 64,
                            capacityMl: 50,
                            majorTickEveryMl: 1,
                            gradOffset: 0.0015,
                            gradColor: "#ffffff",
                            labelEveryMl: 1,
                            bodyLengthOfTip: 0.07,
                            taperLength: 0.012,
                            NozzleLength: 0.010,
                            NozzleRadius: 0.0006,
                            position: new Vector3(0, 0, 0),
                            rotation: new Vector3(0, 0, 0),
                            texW: 1024,
                            texH: 4096,
                            texSuperSample: 2,
                            emissiveBoost: 2.2,
                        }}
                    />
                </>
            )}
        </>
    );
});