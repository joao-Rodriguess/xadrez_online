import * as THREE from 'three';

/**
 * Procedural 3D Chess Piece Builder & PBR Material Studio
 * Supports per-piece-type geometry styles ('staunton', 'futuristic', 'minimalist', 'medieval')
 * and per-piece PBR material parameters, plus an isolated live 3D Preview Studio renderer.
 */

export const PIECE_TYPES = ['k', 'q', 'r', 'b', 'n', 'p'];

export const PIECE_LABELS = {
  k: { name: 'Rei', icon: '♚' },
  q: { name: 'Dama', icon: '♛' },
  r: { name: 'Torre', icon: '♜' },
  b: { name: 'Bispo', icon: '♝' },
  n: { name: 'Cavalo', icon: '♞' },
  p: { name: 'Peão', icon: '♟' },
};

export const GEOMETRY_STYLES = {
  staunton: { id: 'staunton', label: 'Clássico Staunton', description: 'Perfis torneados tradicionais de torneio.' },
  futuristic: { id: 'futuristic', label: 'Futurista / Cyber', description: 'Prismas facetados, anéis orbitais e núcleo neon.' },
  minimalist: { id: 'minimalist', label: 'Minimalista Bauhaus', description: 'Formas arquitetônicas puras de design moderno.' },
  medieval: { id: 'medieval', label: 'Medieval Fortaleza', description: 'Ameias góticas, elmos templários e coroas de ferro.' },
};

export const MATERIAL_PRESETS = {
  marble_imperial: {
    id: 'marble_imperial',
    label: 'Mármore Imperial',
    whiteColor: '#f3efe6',
    blackColor: '#1e222a',
    accentColor: '#d4af37',
    metalness: 0.12,
    roughness: 0.16,
    emissiveIntensity: 0.18,
    transmission: 0,
    clearcoat: 0.9,
  },
  royal_gold: {
    id: 'royal_gold',
    label: 'Ouro & Prata Real',
    whiteColor: '#e8edf2',
    blackColor: '#d9a441',
    accentColor: '#ffe08a',
    metalness: 0.88,
    roughness: 0.2,
    emissiveIntensity: 0.25,
    transmission: 0,
    clearcoat: 0.5,
  },
  crystal_glass: {
    id: 'crystal_glass',
    label: 'Cristal Translúcido',
    whiteColor: '#d8f3ff',
    blackColor: '#254e70',
    accentColor: '#38bdf8',
    metalness: 0.05,
    roughness: 0.06,
    emissiveIntensity: 0.45,
    transmission: 0.68,
    clearcoat: 1.0,
  },
  noble_wood: {
    id: 'noble_wood',
    label: 'Madeira Nobre',
    whiteColor: '#deb887',
    blackColor: '#4e2b18',
    accentColor: '#c98a4b',
    metalness: 0.05,
    roughness: 0.42,
    emissiveIntensity: 0.05,
    transmission: 0,
    clearcoat: 0.35,
  },
  obsidian_ruby: {
    id: 'obsidian_ruby',
    label: 'Obsidiana & Rubi',
    whiteColor: '#cbd5e1',
    blackColor: '#121318',
    accentColor: '#ef4444',
    metalness: 0.45,
    roughness: 0.22,
    emissiveIntensity: 0.75,
    transmission: 0,
    clearcoat: 0.85,
  },
  cyber_neon: {
    id: 'cyber_neon',
    label: 'Cyber Neon',
    whiteColor: '#e2e8f0',
    blackColor: '#0f172a',
    accentColor: '#00f5d4',
    metalness: 0.65,
    roughness: 0.18,
    emissiveIntensity: 1.35,
    transmission: 0,
    clearcoat: 0.8,
  },
};

export function createDefaultPieceConfig(style = 'staunton', presetId = 'marble_imperial') {
  const preset = MATERIAL_PRESETS[presetId] || MATERIAL_PRESETS.marble_imperial;
  return {
    style,
    preset: presetId,
    whiteColor: preset.whiteColor,
    blackColor: preset.blackColor,
    accentColor: preset.accentColor,
    metalness: preset.metalness,
    roughness: preset.roughness,
    emissiveIntensity: preset.emissiveIntensity,
    transmission: preset.transmission,
    clearcoat: preset.clearcoat,
    heightScale: 1.0,
  };
}

export function createDefaultCustomization() {
  const pieces = {};
  for (const type of PIECE_TYPES) {
    pieces[type] = createDefaultPieceConfig('staunton', 'marble_imperial');
  }
  return { pieces };
}

const _geometryCache = new Map();

function getCachedGeo(key, factory) {
  let geo = _geometryCache.get(key);
  if (!geo) {
    geo = factory();
    _geometryCache.set(key, geo);
  }
  return geo;
}

function makeLathe(points, segments = 28) {
  const key = `lathe:${segments}:${points.map(([x, y]) => `${x},${y}`).join('|')}`;
  return getCachedGeo(key, () => {
    const vecs = points.map(([x, y]) => new THREE.Vector2(Math.max(0.0001, x), y));
    const geo = new THREE.LatheGeometry(vecs, segments);
    geo.computeVertexNormals();
    return geo;
  });
}

const geoCylinder = (rTop, rBot, h, seg = 16) =>
  getCachedGeo(`cyl:${rTop},${rBot},${h},${seg}`, () => new THREE.CylinderGeometry(rTop, rBot, h, seg));
const geoTorus = (r, tube, rSeg, tSeg) =>
  getCachedGeo(`tor:${r},${tube},${rSeg},${tSeg}`, () => new THREE.TorusGeometry(r, tube, rSeg, tSeg));
const geoSphere = (r, wSeg, hSeg) =>
  getCachedGeo(`sph:${r},${wSeg},${hSeg}`, () => new THREE.SphereGeometry(r, wSeg, hSeg));
const geoBox = (w, h, d) =>
  getCachedGeo(`box:${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const geoCone = (r, h, seg = 16) =>
  getCachedGeo(`cone:${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const geoOctahedron = (r, detail = 0) =>
  getCachedGeo(`oct:${r},${detail}`, () => new THREE.OctahedronGeometry(r, detail));

function buildMaterials(colorSide, cfg) {
  const mainHex = colorSide === 'w' ? cfg.whiteColor : cfg.blackColor;
  const mainMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(mainHex),
    metalness: Number(cfg.metalness ?? 0.2),
    roughness: Number(cfg.roughness ?? 0.2),
    clearcoat: Number(cfg.clearcoat ?? 0.7),
    clearcoatRoughness: 0.12,
    transmission: Number(cfg.transmission ?? 0),
    ior: 1.5,
    thickness: cfg.transmission > 0 ? 0.6 : 0,
    transparent: cfg.transmission > 0.05,
    opacity: cfg.transmission > 0.05 ? 0.92 : 1.0,
  });

  const accentHex = cfg.accentColor || '#d4af37';
  const emissiveStrength = Number(cfg.emissiveIntensity ?? 0.2);
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(accentHex),
    metalness: Math.min(1, Number(cfg.metalness ?? 0.5) + 0.35),
    roughness: Math.max(0.06, Number(cfg.roughness ?? 0.2) * 0.7),
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: emissiveStrength * 0.55,
    clearcoat: 0.9,
  });

  return { mainMat, accentMat };
}

function addMesh(group, geometry, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

// ---------- 1. STAUNTON STYLE ----------
function buildStauntonPiece(type, colorSide, mainMat, accentMat) {
  const g = new THREE.Group();

  if (type === 'p') {
    const lathe = makeLathe([
      [0, 0], [0.33, 0], [0.33, 0.08], [0.27, 0.13], [0.29, 0.17],
      [0.21, 0.23], [0.15, 0.42], [0.12, 0.62], [0.20, 0.66], [0.11, 0.70], [0.001, 0.72]
    ]);
    addMesh(g, lathe, mainMat);
    addMesh(g, geoTorus(0.16, 0.024, 12, 24), accentMat, [0, 0.65, 0], [Math.PI / 2, 0, 0]);
    addMesh(g, geoSphere(0.18, 24, 18), mainMat, [0, 0.87, 0]);
  } else if (type === 'r') {
    const lathe = makeLathe([
      [0, 0], [0.36, 0], [0.36, 0.09], [0.29, 0.16], [0.24, 0.26],
      [0.21, 0.68], [0.27, 0.75], [0.27, 0.90], [0.18, 0.90], [0.18, 0.80], [0.001, 0.80]
    ]);
    addMesh(g, lathe, mainMat);
    addMesh(g, geoTorus(0.24, 0.025, 12, 24), accentMat, [0, 0.74, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      addMesh(
        g,
        geoBox(0.11, 0.14, 0.09),
        mainMat,
        [Math.cos(a) * 0.22, 0.96, Math.sin(a) * 0.22],
        [0, -a, 0]
      );
    }
  } else if (type === 'n') {
    const base = makeLathe([
      [0, 0], [0.36, 0], [0.36, 0.09], [0.29, 0.16], [0.25, 0.25], [0.21, 0.32], [0.001, 0.32]
    ]);
    addMesh(g, base, mainMat);
    addMesh(g, geoTorus(0.23, 0.024, 12, 24), accentMat, [0, 0.29, 0], [Math.PI / 2, 0, 0]);

    // Sculpted horse profile via cached ExtrudeGeometry
    const extrudeGeo = getCachedGeo('staunton_knight_head', () => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.16, 0);
      shape.lineTo(0.18, 0);
      shape.quadraticCurveTo(0.21, 0.22, 0.14, 0.42);
      shape.lineTo(0.27, 0.56);
      shape.lineTo(0.22, 0.66);
      shape.lineTo(0.06, 0.64);
      shape.lineTo(0.02, 0.78);
      shape.lineTo(-0.07, 0.68);
      shape.quadraticCurveTo(-0.22, 0.56, -0.22, 0.30);
      shape.quadraticCurveTo(-0.21, 0.12, -0.16, 0);

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.03,
        bevelSegments: 3,
      });
      geo.center();
      return geo;
    });
    const facingRotY = colorSide === 'w' ? Math.PI / 2 : -Math.PI / 2;
    addMesh(g, extrudeGeo, mainMat, [0, 0.69, 0], [0, facingRotY, 0]);
    // Mane accent crest
    addMesh(g, geoBox(0.06, 0.34, 0.09), accentMat, [0, 0.78, colorSide === 'w' ? 0.14 : -0.14], [0.28 * (colorSide === 'w' ? 1 : -1), 0, 0]);
  } else if (type === 'b') {
    const lathe = makeLathe([
      [0, 0], [0.35, 0], [0.35, 0.09], [0.28, 0.15], [0.22, 0.24],
      [0.14, 0.68], [0.22, 0.74], [0.13, 0.79], [0.19, 0.92], [0.14, 1.07], [0.04, 1.16], [0.001, 1.18]
    ]);
    addMesh(g, lathe, mainMat);
    addMesh(g, geoTorus(0.18, 0.025, 12, 24), accentMat, [0, 0.74, 0], [Math.PI / 2, 0, 0]);
    addMesh(g, geoSphere(0.065, 16, 16), accentMat, [0, 1.22, 0]);
  } else if (type === 'q') {
    const lathe = makeLathe([
      [0, 0], [0.39, 0], [0.39, 0.10], [0.31, 0.17], [0.25, 0.26],
      [0.16, 0.76], [0.25, 0.84], [0.17, 0.90], [0.26, 1.15], [0.14, 1.17], [0.001, 1.12]
    ]);
    addMesh(g, lathe, mainMat);
    addMesh(g, geoTorus(0.22, 0.026, 12, 26), accentMat, [0, 0.84, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addMesh(g, geoSphere(0.045, 12, 12), accentMat, [Math.cos(a) * 0.22, 1.20, Math.sin(a) * 0.22]);
    }
    addMesh(g, geoSphere(0.09, 18, 16), accentMat, [0, 1.29, 0]);
  } else if (type === 'k') {
    const lathe = makeLathe([
      [0, 0], [0.40, 0], [0.40, 0.10], [0.32, 0.18], [0.26, 0.28],
      [0.17, 0.82], [0.27, 0.90], [0.19, 0.96], [0.26, 1.22], [0.08, 1.28], [0.001, 1.28]
    ]);
    addMesh(g, lathe, mainMat);
    addMesh(g, geoTorus(0.24, 0.028, 12, 26), accentMat, [0, 0.90, 0], [Math.PI / 2, 0, 0]);
    addMesh(g, geoTorus(0.22, 0.022, 12, 26), accentMat, [0, 1.20, 0], [Math.PI / 2, 0, 0]);
    // Imperial Cross
    addMesh(g, geoBox(0.075, 0.26, 0.075), accentMat, [0, 1.40, 0]);
    addMesh(g, geoBox(0.20, 0.068, 0.075), accentMat, [0, 1.43, 0]);
  }
  return g;
}

// ---------- 2. FUTURISTIC / CYBER STYLE ----------
function buildFuturisticPiece(type, colorSide, mainMat, accentMat) {
  const g = new THREE.Group();
  // Hexagonal cyber pedestal
  addMesh(g, geoCylinder(0.32, 0.37, 0.11, 6), mainMat, [0, 0.055, 0]);
  addMesh(g, geoTorus(0.31, 0.022, 8, 6), accentMat, [0, 0.115, 0], [Math.PI / 2, 0, 0]);

  if (type === 'p') {
    addMesh(g, geoCylinder(0.11, 0.22, 0.45, 6), mainMat, [0, 0.34, 0]);
    addMesh(g, geoTorus(0.18, 0.022, 8, 18), accentMat, [0, 0.62, 0], [Math.PI / 2, 0.22, 0]);
    addMesh(g, geoOctahedron(0.15, 0), accentMat, [0, 0.80, 0]);
  } else if (type === 'r') {
    addMesh(g, geoCylinder(0.24, 0.28, 0.62, 8), mainMat, [0, 0.42, 0]);
    addMesh(g, geoCylinder(0.11, 0.11, 0.72, 8), accentMat, [0, 0.50, 0]);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      addMesh(g, geoBox(0.11, 0.30, 0.11), mainMat, [Math.cos(a) * 0.22, 0.86, Math.sin(a) * 0.22], [0, -a, 0]);
    }
    addMesh(g, geoTorus(0.24, 0.025, 8, 8), accentMat, [0, 0.78, 0], [Math.PI / 2, 0, 0]);
  } else if (type === 'n') {
    const dir = colorSide === 'w' ? -1 : 1;
    addMesh(g, geoCylinder(0.18, 0.25, 0.36, 6), mainMat, [0, 0.29, 0]);
    addMesh(g, geoBox(0.24, 0.46, 0.28), mainMat, [0, 0.60, 0], [0.22 * dir, 0, 0]);
    addMesh(g, geoBox(0.20, 0.18, 0.36), mainMat, [0, 0.86, 0.11 * dir], [-0.28 * dir, 0, 0]);
    // Cyber visor
    addMesh(g, geoBox(0.22, 0.06, 0.14), accentMat, [0, 0.88, 0.18 * dir]);
    // Fin blades
    addMesh(g, geoCone(0.08, 0.26, 4), accentMat, [0, 1.02, -0.05 * dir], [-0.3 * dir, 0, 0]);
  } else if (type === 'b') {
    addMesh(g, geoCylinder(0.08, 0.25, 0.76, 6), mainMat, [0, 0.49, 0]);
    addMesh(g, geoTorus(0.22, 0.022, 8, 24), accentMat, [0, 0.78, 0], [Math.PI / 3, 0.4, 0]);
    addMesh(g, geoTorus(0.22, 0.022, 8, 24), accentMat, [0, 0.78, 0], [-Math.PI / 3, -0.4, 0]);
    addMesh(g, geoOctahedron(0.14, 0), accentMat, [0, 1.08, 0], [0, Math.PI / 4, 0]);
  } else if (type === 'q') {
    addMesh(g, geoCylinder(0.14, 0.28, 0.82, 8), mainMat, [0, 0.52, 0]);
    addMesh(g, geoTorus(0.26, 0.025, 8, 24), accentMat, [0, 0.94, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      addMesh(g, geoCone(0.05, 0.26, 4), mainMat, [Math.cos(a) * 0.21, 1.10, Math.sin(a) * 0.21], [0, 0, 0]);
    }
    addMesh(g, geoOctahedron(0.14, 1), accentMat, [0, 1.24, 0]);
  } else if (type === 'k') {
    addMesh(g, geoCylinder(0.18, 0.30, 0.88, 8), mainMat, [0, 0.55, 0]);
    addMesh(g, geoTorus(0.28, 0.028, 10, 8), accentMat, [0, 0.98, 0], [Math.PI / 2, 0, 0]);
    // Levitating reactor core + prism cage
    addMesh(g, geoOctahedron(0.15, 0), accentMat, [0, 1.26, 0]);
    addMesh(g, geoTorus(0.23, 0.02, 8, 24), accentMat, [0, 1.26, 0], [Math.PI / 4, 0, 0]);
    addMesh(g, geoBox(0.06, 0.24, 0.06), accentMat, [0, 1.48, 0]);
    addMesh(g, geoBox(0.18, 0.06, 0.06), accentMat, [0, 1.50, 0]);
  }
  return g;
}

// ---------- 3. MINIMALIST BAUHAUS STYLE ----------
function buildMinimalistPiece(type, colorSide, mainMat, accentMat) {
  const g = new THREE.Group();
  addMesh(g, geoCylinder(0.33, 0.33, 0.07, 32), mainMat, [0, 0.035, 0]);

  if (type === 'p') {
    addMesh(g, geoCylinder(0.12, 0.26, 0.52, 32), mainMat, [0, 0.33, 0]);
    addMesh(g, geoSphere(0.14, 24, 24), accentMat, [0, 0.72, 0]);
  } else if (type === 'r') {
    addMesh(g, geoCylinder(0.24, 0.24, 0.74, 32), mainMat, [0, 0.44, 0]);
    addMesh(g, geoCylinder(0.26, 0.26, 0.08, 32), accentMat, [0, 0.84, 0]);
  } else if (type === 'n') {
    const dir = colorSide === 'w' ? -1 : 1;
    addMesh(g, geoCylinder(0.22, 0.26, 0.44, 32), mainMat, [0, 0.29, 0]);
    addMesh(g, geoBox(0.22, 0.42, 0.24), mainMat, [0, 0.64, 0.04 * dir], [0.35 * dir, 0, 0]);
    addMesh(g, geoBox(0.23, 0.12, 0.28), accentMat, [0, 0.85, 0.14 * dir], [0.15 * dir, 0, 0]);
  } else if (type === 'b') {
    addMesh(g, geoCone(0.26, 0.92, 32), mainMat, [0, 0.53, 0]);
    addMesh(g, geoTorus(0.16, 0.028, 14, 32), accentMat, [0, 0.64, 0], [Math.PI / 2, 0, 0]);
    addMesh(g, geoSphere(0.08, 20, 20), accentMat, [0, 1.05, 0]);
  } else if (type === 'q') {
    addMesh(g, geoCylinder(0.16, 0.28, 0.96, 32), mainMat, [0, 0.55, 0]);
    addMesh(g, geoTorus(0.22, 0.03, 14, 32), accentMat, [0, 1.05, 0], [Math.PI / 2, 0, 0]);
    addMesh(g, geoSphere(0.11, 24, 24), mainMat, [0, 1.18, 0]);
  } else if (type === 'k') {
    addMesh(g, geoCylinder(0.22, 0.28, 1.04, 32), mainMat, [0, 0.59, 0]);
    addMesh(g, geoCylinder(0.29, 0.29, 0.06, 32), accentMat, [0, 1.14, 0]);
    addMesh(g, geoBox(0.12, 0.24, 0.12), accentMat, [0, 1.29, 0]);
    addMesh(g, geoBox(0.24, 0.08, 0.12), accentMat, [0, 1.32, 0]);
  }
  return g;
}

// ---------- 4. MEDIEVAL FORTRESS STYLE ----------
function buildMedievalPiece(type, colorSide, mainMat, accentMat) {
  const g = new THREE.Group();
  // Heavy stone plinth
  addMesh(g, geoCylinder(0.35, 0.38, 0.12, 12), mainMat, [0, 0.06, 0]);
  addMesh(g, geoCylinder(0.31, 0.34, 0.06, 12), accentMat, [0, 0.15, 0]);

  if (type === 'p') {
    // Templar helm & shield silhouette
    addMesh(g, geoCylinder(0.18, 0.26, 0.44, 10), mainMat, [0, 0.38, 0]);
    addMesh(g, geoCylinder(0.17, 0.19, 0.24, 10), mainMat, [0, 0.72, 0]);
    addMesh(g, geoCone(0.19, 0.16, 10), accentMat, [0, 0.90, 0]);
    addMesh(g, geoBox(0.24, 0.04, 0.24), accentMat, [0, 0.72, 0]);
  } else if (type === 'r') {
    addMesh(g, geoCylinder(0.26, 0.31, 0.64, 8), mainMat, [0, 0.48, 0]);
    addMesh(g, geoCylinder(0.32, 0.27, 0.14, 8), accentMat, [0, 0.85, 0]);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      addMesh(g, geoBox(0.16, 0.18, 0.12), mainMat, [Math.cos(a) * 0.25, 1.00, Math.sin(a) * 0.25], [0, -a, 0]);
    }
  } else if (type === 'n') {
    const dir = colorSide === 'w' ? -1 : 1;
    addMesh(g, geoCylinder(0.22, 0.28, 0.38, 8), mainMat, [0, 0.36, 0]);
    addMesh(g, geoBox(0.24, 0.42, 0.30), mainMat, [0, 0.68, 0.02 * dir], [0.18 * dir, 0, 0]);
    // Armored horse chamfron
    addMesh(g, geoCone(0.15, 0.38, 4), accentMat, [0, 0.86, 0.18 * dir], [Math.PI * 0.58 * dir, 0, 0]);
    addMesh(g, geoBox(0.08, 0.34, 0.12), accentMat, [0, 0.86, -0.10 * dir], [-0.25 * dir, 0, 0]);
  } else if (type === 'b') {
    addMesh(g, geoCylinder(0.15, 0.27, 0.68, 10), mainMat, [0, 0.50, 0]);
    addMesh(g, geoCone(0.21, 0.36, 10), mainMat, [0, 1.00, 0]);
    addMesh(g, geoTorus(0.19, 0.03, 10, 16), accentMat, [0, 0.84, 0], [Math.PI / 2, 0, 0]);
    addMesh(g, geoBox(0.06, 0.20, 0.06), accentMat, [0, 1.24, 0]);
    addMesh(g, geoBox(0.16, 0.05, 0.06), accentMat, [0, 1.26, 0]);
  } else if (type === 'q') {
    addMesh(g, geoCylinder(0.19, 0.30, 0.78, 10), mainMat, [0, 0.55, 0]);
    addMesh(g, geoCylinder(0.27, 0.21, 0.18, 10), accentMat, [0, 1.02, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      addMesh(g, geoBox(0.08, 0.16, 0.08), accentMat, [Math.cos(a) * 0.22, 1.18, Math.sin(a) * 0.22], [0, -a, 0]);
    }
    addMesh(g, geoOctahedron(0.10, 0), accentMat, [0, 1.25, 0]);
  } else if (type === 'k') {
    addMesh(g, geoCylinder(0.22, 0.32, 0.86, 10), mainMat, [0, 0.60, 0]);
    addMesh(g, geoCylinder(0.30, 0.24, 0.20, 10), accentMat, [0, 1.12, 0]);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      addMesh(g, geoCone(0.06, 0.18, 4), accentMat, [Math.cos(a) * 0.24, 1.30, Math.sin(a) * 0.24]);
    }
    // Broadsword crown cross
    addMesh(g, geoBox(0.09, 0.30, 0.09), accentMat, [0, 1.40, 0]);
    addMesh(g, geoBox(0.24, 0.07, 0.09), accentMat, [0, 1.42, 0]);
  }
  return g;
}

/**
 * Builds a complete 3D piece mesh group according to piece type, side ('w'|'b'), and customization config.
 */
export function buildChessPiece3D(type, colorSide, pieceConfig) {
  const cfg = pieceConfig || createDefaultPieceConfig();
  const { mainMat, accentMat } = buildMaterials(colorSide, cfg);

  let group;
  switch (cfg.style) {
    case 'futuristic':
      group = buildFuturisticPiece(type, colorSide, mainMat, accentMat);
      break;
    case 'minimalist':
      group = buildMinimalistPiece(type, colorSide, mainMat, accentMat);
      break;
    case 'medieval':
      group = buildMedievalPiece(type, colorSide, mainMat, accentMat);
      break;
    case 'staunton':
    default:
      group = buildStauntonPiece(type, colorSide, mainMat, accentMat);
      break;
  }

  const hScale = Number(cfg.heightScale || 1.0);
  group.scale.set(1, hScale, 1);
  group.userData = { type, color: colorSide };
  return group;
}

/**
 * Dedicated isolated 3D Preview Renderer for the Piece Customization Studio modal.
 */
export class PiecePreviewStudio {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#090d16');

    const w = canvas.clientWidth || 280;
    const h = canvas.clientHeight || 280;
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 30);
    this.camera.position.set(1.75, 1.55, 2.25);
    this.camera.lookAt(0, 0.68, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;

    // Studio lights
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.85));
    const keyLight = new THREE.DirectionalLight('#fff4df', 2.4);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.4);
    rimLight.position.set(-3, 3, -3);
    this.scene.add(rimLight);

    const warmFill = new THREE.PointLight('#f59e0b', 1.1, 10);
    warmFill.position.set(2, 1.5, -2);
    this.scene.add(warmFill);

    // Pedestal disc
    const baseGeo = new THREE.CylinderGeometry(0.68, 0.76, 0.12, 48);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#162033', metalness: 0.65, roughness: 0.28 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.06;
    base.receiveShadow = true;
    this.scene.add(base);

    const ringGeo = new THREE.TorusGeometry(0.69, 0.015, 12, 48);
    const ringMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.005;
    this.scene.add(ring);

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    this._running = false;
    this._raf = null;
  }

  updatePiece(type, colorSide, pieceConfig) {
    while (this.pivot.children.length > 0) {
      const child = this.pivot.children[0];
      this.pivot.remove(child);
    }
    const mesh = buildChessPiece3D(type, colorSide, pieceConfig);
    this.pivot.add(mesh);
  }

  start() {
    if (this._running) return;
    this._running = true;
    const animate = () => {
      if (!this._running) return;
      this.pivot.rotation.y += 0.012;
      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(animate);
    };
    animate();
  }

  stop() {
    this._running = false;
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  resize() {
    if (!this.canvas) return;
    const w = this.canvas.clientWidth || 280;
    const h = this.canvas.clientHeight || 280;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
}
