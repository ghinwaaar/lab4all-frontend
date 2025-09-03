// src/components/Flask.jsx
import { useEffect } from "react";
import {
  MeshBuilder,
  TransformNode,
  Color3,
  Color4,
  Curve3,
  PBRMaterial,
  StandardMaterial,
  Vector3,
  Mesh,
  ParticleSystem,
  Texture,
  DynamicTexture,
} from "@babylonjs/core";

/** Improved Erlenmeyer flask with better fluid coloring options */
export default function CreateFlask({
  scene,
  name = "erlenmeyerFlask",
  options = {},
}) {
  useEffect(() => {
    if (!scene) return;

    let flaskRoot, flaskBody, basePlate;
    let ps = null;
    let fluidRenderer = null;
    let fluidObjHandle = null;

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
      initialFillMl = 0,
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

    // ─────────────────── SOLUTION 1: Custom Particle Texture ───────────────────
    const createColoredTexture = (color) => {
      const size = 64;
      const dynamicTexture = new DynamicTexture(`fluidTexture_${name}`, {width: size, height: size}, scene, false);
      const ctx = dynamicTexture.getContext();
      
      // Create a smooth circular gradient
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2;
      
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.8)`);
      gradient.addColorStop(0.3, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.6)`);
      gradient.addColorStop(1, `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      dynamicTexture.update();
      
      return dynamicTexture;
    };

    // Default particle texture
    let currentFluidTexture = createColoredTexture(Color3.FromHexString("#4A90E2")); // Default blue

    // Particle system setup
    ps = new ParticleSystem(`${name}FluidPS`, 25000, scene);
    ps.particleTexture = currentFluidTexture;
    ps.emitter = flaskRoot;
    ps.minSize = 0.006; 
    ps.maxSize = 0.012;
    ps.emitRate = 12000;
    ps.minLifeTime = 9999; 
    ps.maxLifeTime = 9999;
    ps.updateSpeed = 0.02;
    ps.gravity = new Vector3(0, 0, 0);
    
    // Use neutral colors for particles - texture will provide the color
    ps.color1 = new Color4(1.0, 1.0, 1.0, 0.8);
    ps.color2 = new Color4(1.0, 1.0, 1.0, 0.6);
    ps.colorDead = new Color4(1.0, 1.0, 1.0, 0.0);

    ps.startPositionFunction = (worldMatrix, position) => {
      const y = currentH > 0 ? Math.random() * currentH : 0;
      const rMax = currentH > 0 ? Math.max(0.001, radiusAtY(y) * 0.98) : 0;
      const theta = Math.random() * Math.PI * 2;
      const u = Math.sqrt(Math.random()) * rMax;
      position.set(u * Math.cos(theta), y, u * Math.sin(theta));
      Vector3.TransformCoordinatesToRef(position, worldMatrix, position);
    };
    ps.startDirectionFunction = (_w, dir) => { dir.set(0, 0, 0); };
    if (currentH > 1e-6) {
   ps.start();
 }

    // Enable Fluid Renderer
    fluidRenderer = scene.enableFluidRenderer();
    fluidObjHandle = fluidRenderer.addParticleSystem(ps);

    // ─────────────────── SOLUTION 2: Direct FluidRenderer Parameters ───────────────────
    const getFluidParams = () => {
      // Try different parameter paths
      if (fluidObjHandle?.targetRenderer?.fluidColor) return fluidObjHandle.targetRenderer;
      if (fluidObjHandle?.targetRenderer?.parameters) return fluidObjHandle.targetRenderer.parameters;
      if (fluidRenderer?.targetRenderers?.[0]) return fluidRenderer.targetRenderers[0];
      if (fluidRenderer?.fluidColor) return fluidRenderer;
      return null;
    };

    /* ─────────────────── 6 · IMPROVED PUBLIC API ────────────────────── */
    const setLevelMl = (ml) => {
      currentMl = Math.max(0, Math.min(capacityMl, ml));
      currentH = mlToY(currentMl);
      ps?.reset();
      if (currentH > 1e-6 && !ps?.isStarted()) {
     ps.start();
   }
    };

    const getLevelMl = () => currentMl;
    const getSurfaceY = () => flaskRoot.getAbsolutePosition().y + currentH;

    // Method 1: Change particle texture (most reliable)
    const setFluidColorByTexture = (color3) => {
      if (!color3) return;
      
      // Dispose old texture
      if (currentFluidTexture) {
        currentFluidTexture.dispose();
      }
      
      // Create new colored texture
      currentFluidTexture = createColoredTexture(color3);
      ps.particleTexture = currentFluidTexture;
    };

    // Method 2: Direct fluid renderer parameters (if available)
    const setFluidColorByRenderer = (color3) => {
      if (!color3) return;
      
      const params = getFluidParams();
      if (params) {
        // Try different property names that might exist
        if ('fluidColor' in params) {
          params.fluidColor = color3;
        } else if ('diffuseColor' in params) {
          params.diffuseColor = color3;
        } else if ('absorptionColor' in params) {
          params.absorptionColor = color3;
          if ('absorptionStrength' in params) {
            params.absorptionStrength = 0.8;
          }
        }
        return true;
      }
      return false;
    };

    // Method 3: Particle color modulation (fallback)
    const setFluidColorByParticles = (color3) => {
      if (!color3) return;
      
      // Modulate particle colors while keeping texture
      ps.color1 = Color4.FromColor3(color3, 0.8);
      ps.color2 = Color4.FromColor3(color3, 0.6);
      ps.colorDead = Color4.FromColor3(color3, 0.0);
    };

    // Main color setting function - tries multiple methods
    const setFluidColor = (color3) => {
      let targetColor;
      if (typeof color3 === 'string') {
        targetColor = Color3.FromHexString(color3);
      } else {
        targetColor = color3;
      }
      
      if (!targetColor) return;

      // Try renderer method first (cleanest if it works)
      if (!setFluidColorByRenderer(targetColor)) {
        // Fall back to texture method (most reliable)
        setFluidColorByTexture(targetColor);
      }
    };

    // Preset fluid colors with realistic chemical colors
    const setFluidToChemical = (chemical) => {
      const chemicals = {
        'water': '#87CEEB',        // Sky blue
        'acid': '#FFD700',         // Gold yellow
        'base': '#9370DB',         // Medium purple
        'copper_sulfate': '#1E90FF', // Dodger blue
        'iodine': '#800080',       // Purple
        'bromothymol': '#FFFF00',  // Yellow
        'phenolphthalein': '#FF69B4', // Hot pink
        'methylene_blue': '#191970', // Midnight blue
        'potassium_permanganate': '#8B008B', // Dark magenta
        'chlorophyll': '#228B22',  // Forest green
        'blood': '#8B0000',        // Dark red
        'oil': '#DAA520',          // Goldenrod
      };
      
      const colorHex = chemicals[chemical.toLowerCase()] || chemical;
      setFluidColor(colorHex);
    };

    // Advanced fluid properties (if supported by renderer)
    const setFluidDensity = (density) => {
      const params = getFluidParams();
      if (params && 'density' in params) {
        params.density = Math.max(0.1, Math.min(3.0, density));
      }
    };

    const setFluidViscosity = (viscosity) => {
      const params = getFluidParams();
      if (params && 'viscosity' in params) {
        params.viscosity = Math.max(0.1, Math.min(10.0, viscosity));
      }
    };

    // Enhanced API exposure
    flaskRoot.metadata = flaskRoot.metadata || {};
    flaskRoot.metadata.capacityMl = capacityMl;
    flaskRoot.metadata.getLevelMl = getLevelMl;
    flaskRoot.metadata.setLevelMl = setLevelMl;
    flaskRoot.metadata.getSurfaceY = getSurfaceY;
    
    // Color methods
    flaskRoot.metadata.setFluidColor = setFluidColor;
    flaskRoot.metadata.setFluidColorByTexture = setFluidColorByTexture;
    flaskRoot.metadata.setFluidColorByRenderer = setFluidColorByRenderer;
    flaskRoot.metadata.setFluidColorByParticles = setFluidColorByParticles;
    flaskRoot.metadata.setFluidToChemical = setFluidToChemical;
    
    // Advanced properties
    flaskRoot.metadata.setFluidDensity = setFluidDensity;
    flaskRoot.metadata.setFluidViscosity = setFluidViscosity;

    // Initialize with clear water
    setLevelMl(currentMl);
    setFluidColor('#87CEEB'); // Light blue water

    /* ─────────────────── 7 · CLEANUP ──────────────────────────────── */
    return () => {
      try { 
        if (currentFluidTexture) currentFluidTexture.dispose();
        fluidRenderer?.removeParticleSystem?.(ps); 
      } catch {}
      try { ps?.dispose(); } catch {}
      try { basePlate?.dispose(); } catch {}
      try { flaskBody?.dispose(); } catch {}
      try { flaskRoot?.dispose(); } catch {}
    };
  }, [scene, name, JSON.stringify(options)]);

  return null;
}