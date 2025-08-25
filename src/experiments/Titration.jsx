// src/experiments/Titration.jsx
import { useState, useRef, useEffect } from "react";
import {
  Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3
} from "@babylonjs/core";
import { Color3 } from "@babylonjs/core";
import CreateFlask from "../components/Flask";
import CreateStandAndClamp from "../components/ClampStand";
import CreateBurette from "../components/Burette";
import * as GUI from "@babylonjs/gui";

const Titration = () => {
  const canvasRef = useRef(null);
  const [scene, setScene] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = new Engine(canvas, true);
    const s = new Scene(engine);

    // Camera
    const camera = new ArcRotateCamera(             // create an ArcRotateCamera (orbit camera)
      "cam",                                        // camera name (for debugging / lookup)
      Math.PI * 0.35,                               // alpha: rotate around Y (start ~20°)
      Math.PI * 0.28,                               // beta: elevation above horizon (~16°)
      1.8,                                          // radius: distance from target
      Vector3.Zero(),                               // target: look at scene origin (we'll reframe)
      s                                             // scene
    );

    camera.wheelDeltaPercentage = 0.03;             // smoother mouse-wheel zoom (percent of current radius)
    camera.pinchDeltaPercentage = 0.02;             // smoother touch pinch zoom
    camera.lowerBetaLimit = 0.05;                   // don't let the camera go below the horizon
    camera.upperBetaLimit = Math.PI / 2.05;         // don't let it flip overhead
    camera.lowerRadiusLimit = 1.1;                  // prevent zooming too close (clip-through)
    camera.upperRadiusLimit = 6.0;                  // prevent zooming too far (tiny objects)
    camera.panningSensibility = 1200;               // make panning less sensitive (higher = slower)
    camera.useNaturalPinchZoom = true;              // more intuitive touch zoom curve
    camera.attachControl(canvas, true);             // bind mouse/touch controls to the canvas

    camera.useFramingBehavior = true;               // ✅ enable the built-in FramingBehavior (separate assignment!)

    // Once all meshes are ready, frame the whole apparatus once
    s.executeWhenReady(() => {                       // wait until scene/meshes are ready
      const toFrame = s.meshes.filter(m =>          // choose which meshes to include in framing
        m.isVisible && /stand|burette|flask/i.test(m.name)
      );
      if (toFrame.length) {
        camera.setTarget(Vector3.Zero());           // set a reasonable pivot (will be adjusted by zoomOnMeshes)
        camera.zoomOnMeshes(toFrame, true);         // fit the selected meshes in view (no animation = true -> instant)
      }
    });

    const light = new HemisphericLight("hemi", new Vector3(0, 1, 0), s);
    light.intensity = 1.2;

    setScene(s);

    // ───────────── GUI: fluid absorption (clear → pink) ─────────────
    const ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("ui", true, s);

    const panel = new GUI.StackPanel();
    panel.width = "280px";
    panel.isVertical = true;
    panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    panel.paddingTop = "16px";
    panel.paddingRight = "16px";
    ui.addControl(panel);

    const title = new GUI.TextBlock();
    title.text = "Fluid Color (Clear → Pink)";
    title.height = "28px";
    title.color = "white";
    title.fontSize = 20;
    title.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.addControl(title);

    // Pink target color (#f906a0)
    const targetPink = Color3.FromHexString("#f906a0");

    const readout = new GUI.TextBlock();
    readout.text = "hex: #f906a0 • strength: 0.00";
    readout.height = "22px";
    readout.color = "white";
    readout.fontSize = 14;
    panel.addControl(readout);

    const slider = new GUI.Slider();
    slider.minimum = 0;
    slider.maximum = 1;
    slider.value = 0;                 // start clear
    slider.height = "20px";
    slider.width = "220px";
    slider.isThumbCircle = true;
    panel.addControl(slider);

    const applyAbsorption = (strength) => {
      const flaskRoot = s.getTransformNodeByName("titrationFlaskRoot");
      const setAbsColor = flaskRoot?.metadata?.setFluidAbsorptionColor;
      const setAbsStrength = flaskRoot?.metadata?.setFluidAbsorptionStrength;
      if (!setAbsColor || !setAbsStrength) return;
      // Set the dye color ONCE (your target pink), then vary strength with slider.
      setAbsColor(targetPink);
      setAbsStrength(strength);
      readout.text = `hex: #f906a0 • strength: ${strength.toFixed(2)}`;
    };
    slider.onValueChangedObservable.add(applyAbsorption);
    applyAbsorption(0); // initialize

    const onResize = () => engine.resize();
    engine.runRenderLoop(() => s.render());
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); s.dispose(); engine.dispose(); };
  }, []);

  // After both are created, place flask under clamp socket
  useEffect(() => {
    if (!scene) return;

    const id = setTimeout(() => {
      const standRoot   = scene.getTransformNodeByName("standAndClampRoot");
      const buretteRoot = scene.getTransformNodeByName("buretteRoot");
      const flaskRoot   = scene.getTransformNodeByName("titrationFlaskRoot");

      const standAnchors   = standRoot?.metadata?.anchors;          // clampSocket, etc.
      const buretteAnchors = buretteRoot?.metadata?.anchors;        // { top, stopcock, tip }

      if (!standRoot || !buretteRoot || !flaskRoot || !standAnchors || !buretteAnchors) return;

      // 1) Position the BURETTE so the CLAMP holds it above the stopcock
      //    We align the burette so that its stopcock sits some distance below the clamp socket.
      const clampSocketWorld = standAnchors.clampSocket.getAbsolutePosition();

      // How far below the clamp should the stopcock sit (meters)
      const stopcockBelowClamp = 0.55; // ~12 cm below the clamp
      const desiredStopcockWorld = clampSocketWorld.add(new Vector3(0, stopcockBelowClamp, 0));

      // Current stopcock position
      const stopcockWorld = buretteAnchors.stopcock.getAbsolutePosition();

      // Shift the whole burette so its stopcock hits the desired spot
      const deltaToPlaceBurette = desiredStopcockWorld.subtract(stopcockWorld);
      buretteRoot.position.addInPlace(deltaToPlaceBurette);
      const anchors = standRoot?.metadata?.anchors;
      if (standRoot && flaskRoot && anchors?.clampSocket) {
        // world position of the clamp socket
        const socketWorld = anchors.clampSocket.getAbsolutePosition();
        // put flask below the socket and slightly toward the base center
        flaskRoot.position.copyFrom(socketWorld);
        flaskRoot.position.y += 0.05;   // drop to table height-ish
        //flaskRoot.position.z += 0.0;   // nudge toward stand
      }
    }, 0); // next tick so all sub-meshes/anchors exist

    return () => clearTimeout(id);
  }, [scene]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
      />

      {scene && (
        <>
          <CreateStandAndClamp
            scene={scene}
            name="standAndClamp"
            options={{
              // Place rod at the start (front-center) and keep your other tweaks
              rodOffsetX: 0.45,           // centered left–right
              rodOffsetZ: 0.0,         // near the front edge
              baseWidth: 0.65,
              baseDepth: 0.30,
              baseHeight: 0.03,
              rodHeight: 0.9,
              rodRadius: 0.012,
              clampY: 0.7,               // 60% up the rod
              clampRotateY: Math.PI,     // your current default
              crossbarLength: 0.28,
              crossbarRadius: 0.009,
              jawOpen: 0.30,
              jawMaxGap: 0.045,
              jawRadius: 0.018,
              jawThickness: 0.012
            }}
          />

          <CreateFlask
            scene={scene}
            name="titrationFlask"
            options={{
              // Sized to look right on that base; position will be overridden by the effect above
              height: 0.3,
              maxRadius: 0.1,
              neckRadius: 0.05,
              neckHeight: 0.09,
              liquidColor: "#55aaff"
            }}
          />
          <CreateBurette
            scene={scene}
            name="burette"
            options={{
              // geometry
              tubeAbove: 0.55,            // plenty of tube above the stopcock
              tubeBelow: 0.28,
              tubeOuterRadius: 0.0085,
              tubeTessellation: 64,

              // graduations
              capacityMl: 50,
              majorTickEveryMl: 1,
              gradOffset: 0.0015,
              gradColor: "#ffffff",
              labelEveryMl: 1,

              // tip (from your new options)
              bodyLengthOfTip: 0.07,
              taperLength: 0.012,
              NozzleLength: 0.010,
              NozzleRadius: 0.0006,

              // pose (keep vertical at origin; we’ll position via effect)
              position: new Vector3(0, 0, 0),
              rotation: new Vector3(0, 0, 0),

              // texture quality
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
};

export default Titration;