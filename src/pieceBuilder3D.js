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
  marvel_heroes: { id: 'marvel_heroes', label: 'Marvel (Coleção Vingadores)', description: 'Homem de Ferro, Feiticeira Escarlate, Thor, Dr. Estranho, Aranha e Capitão América.' },
  dc_heroes: { id: 'dc_heroes', label: 'DC (Liga da Justiça)', description: 'Batman, Mulher-Maravilha, Superman, Lanterna Verde, Flash e Aquaman.' },
  marvel_vs_dc: { id: 'marvel_vs_dc', label: 'Marvel (Brancas) vs DC (Pretas)', description: 'Confronto épico entre os principais heróis da Marvel e da DC.' },
  futuristic: { id: 'futuristic', label: 'Futurista / Cyber', description: 'Prismas facetados, anéis orbitais e núcleo neon.' },
  minimalist: { id: 'minimalist', label: 'Minimalista Bauhaus', description: 'Formas arquitetônicas puras de design moderno.' },
  medieval: { id: 'medieval', label: 'Medieval Fortaleza', description: 'Ameias góticas, elmos templários e coroas de ferro.' },
  hero_ironman: { id: 'hero_ironman', label: 'Marvel • Homem de Ferro', description: 'Capacete Mark-85 com Reator Arc.' },
  hero_scarlet: { id: 'hero_scarlet', label: 'Marvel • Feiticeira Escarlate', description: 'Coroa escarlate de Sokovia e magia do caos.' },
  hero_thor: { id: 'hero_thor', label: 'Marvel • Thor (Mjolnir)', description: 'Martelo Mjolnir de Uru e elmo alado de Asgard.' },
  hero_strange: { id: 'hero_strange', label: 'Marvel • Doutor Estranho', description: 'Manto da Levitação e Olho de Agamotto.' },
  hero_spiderman: { id: 'hero_spiderman', label: 'Marvel • Homem-Aranha', description: 'Máscara aracnídea e lentes angulares.' },
  hero_cap: { id: 'hero_cap', label: 'Marvel • Capitão América', description: 'Escudo concêntrico de Vibranium e elmo A.' },
  hero_wolverine: { id: 'hero_wolverine', label: 'Marvel • Wolverine', description: 'Máscara com abas e garras de Adamantium.' },
  hero_panther: { id: 'hero_panther', label: 'Marvel • Pantera Negra', description: 'Elmo de Wakanda e colar de Vibranium.' },
  hero_batman: { id: 'hero_batman', label: 'DC • Batman', description: 'Capuz do Cavaleiro das Trevas e emblema morcego.' },
  hero_wonderwoman: { id: 'hero_wonderwoman', label: 'DC • Mulher-Maravilha', description: 'Tiara amazona dourada, estrela e Laço da Verdade.' },
  hero_superman: { id: 'hero_superman', label: 'DC • Superman', description: 'Fortaleza da Solidão e escudo pentagonal S.' },
  hero_greenlantern: { id: 'hero_greenlantern', label: 'DC • Lanterna Verde', description: 'Bateria energética de Oa e anel esmeralda.' },
  hero_flash: { id: 'hero_flash', label: 'DC • The Flash', description: 'Capuz velocista com asas de raio douradas.' },
  hero_aquaman: { id: 'hero_aquaman', label: 'DC • Aquaman', description: 'Tridente dourado de Atlântida e armadura escamada.' },
  hero_joker: { id: 'hero_joker', label: 'DC • Coringa', description: 'Cartola clássica, lapela roxa e sorriso escarlate.' },
};

export const MARVEL_ROLE_MAP = {
  k: 'hero_ironman',
  q: 'hero_scarlet',
  r: 'hero_thor',
  b: 'hero_strange',
  n: 'hero_spiderman',
  p: 'hero_cap',
};

export const DC_ROLE_MAP = {
  k: 'hero_batman',
  q: 'hero_wonderwoman',
  r: 'hero_superman',
  b: 'hero_greenlantern',
  n: 'hero_flash',
  p: 'hero_aquaman',
};

export function resolveEffectiveStyle(style, type, colorSide) {
  if (style === 'marvel_heroes') return MARVEL_ROLE_MAP[type] || 'hero_cap';
  if (style === 'dc_heroes') return DC_ROLE_MAP[type] || 'hero_aquaman';
  if (style === 'marvel_vs_dc') {
    return colorSide === 'w'
      ? MARVEL_ROLE_MAP[type] || 'hero_cap'
      : DC_ROLE_MAP[type] || 'hero_aquaman';
  }
  return style || 'staunton';
}

export function getHeroStyleBadgeText(style, type, colorSide) {
  const effective = resolveEffectiveStyle(style, type, colorSide);
  const info = GEOMETRY_STYLES[effective];
  if (style === 'marvel_vs_dc') {
    const wName = GEOMETRY_STYLES[MARVEL_ROLE_MAP[type]]?.label?.replace(/^Marvel • /, '') || 'Marvel';
    const bName = GEOMETRY_STYLES[DC_ROLE_MAP[type]]?.label?.replace(/^DC • /, '') || 'DC';
    return `${wName} (Brancas) vs ${bName} (Pretas)`;
  }
  return info?.label || 'Clássico Staunton';
}

export const MATERIAL_PRESETS = {
  marble_imperial: {
    id: 'marble_imperial',
    label: 'Mármore Imperial',
    whiteColor: '#e8e4dc',
    blackColor: '#1b1d22',
    accentColor: '#a68952',
    metalness: 0.12,
    roughness: 0.24,
    emissiveIntensity: 0.04,
    transmission: 0,
    clearcoat: 0.55,
  },
  marvel_avengers: {
    id: 'marvel_avengers',
    label: 'Vingadores (Titânio & Ouro)',
    whiteColor: '#e5e7eb',
    blackColor: '#18181b',
    accentColor: '#c29b61',
    metalness: 0.55,
    roughness: 0.24,
    emissiveIntensity: 0.16,
    transmission: 0,
    clearcoat: 0.65,
  },
  dc_justice: {
    id: 'dc_justice',
    label: 'Liga da Justiça (Obsidiana & Bronze)',
    whiteColor: '#dce3ec',
    blackColor: '#121317',
    accentColor: '#b89158',
    metalness: 0.48,
    roughness: 0.28,
    emissiveIntensity: 0.12,
    transmission: 0,
    clearcoat: 0.6,
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

export function createHeroSetCustomization(setId = 'staunton') {
  let presetId = 'marble_imperial';
  if (setId === 'marvel_heroes' || setId === 'marvel_vs_dc') presetId = 'marvel_avengers';
  else if (setId === 'dc_heroes') presetId = 'dc_justice';
  else if (setId === 'futuristic') presetId = 'cyber_neon';
  else if (setId === 'medieval') presetId = 'noble_wood';

  const validStyle = GEOMETRY_STYLES[setId] ? setId : 'staunton';
  const pieces = {};
  for (const type of PIECE_TYPES) {
    pieces[type] = createDefaultPieceConfig(validStyle, presetId);
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

// ---------- 5. MARVEL & DC SUPERHEROES ----------
const _heroMaterialCache = new Map();

function getHeroMat(hex, metalness = 0.25, roughness = 0.35, emissiveIntensity = 0) {
  const key = `${hex}|${metalness}|${roughness}|${emissiveIntensity}`;
  let mat = _heroMaterialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex),
      metalness,
      roughness,
      emissive: emissiveIntensity > 0 ? new THREE.Color(hex) : new THREE.Color('#000000'),
      emissiveIntensity,
      clearcoat: 0.45,
    });
    _heroMaterialCache.set(key, mat);
  }
  return mat;
}

function geoExtrude(key, buildShapeFn, extrudeOpts = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 2 }) {
  return getCachedGeo(`ext:${key}`, () => {
    const shape = new THREE.Shape();
    buildShapeFn(shape);
    const geo = new THREE.ExtrudeGeometry(shape, extrudeOpts);
    geo.center();
    return geo;
  });
}

function buildHeroPiece(heroId, type, colorSide, mainMat, accentMat) {
  const g = new THREE.Group();
  const dir = colorSide === 'w' ? -1 : 1; // White pieces face -Z (toward rank 8); Black face +Z

  // Turned chess base & collar in side color (w/b) for instant chess readability
  const plinth = makeLathe([
    [0, 0], [0.36, 0], [0.36, 0.09], [0.29, 0.16], [0.27, 0.22], [0.21, 0.29], [0.001, 0.30]
  ]);
  addMesh(g, plinth, mainMat);
  addMesh(g, geoTorus(0.24, 0.022, 12, 26), accentMat, [0, 0.27, 0], [Math.PI / 2, 0, 0]);

  const inner = new THREE.Group();
  const rankScaleMap = { k: 1.06, q: 1.01, r: 0.94, b: 0.96, n: 0.92, p: 0.80 };
  const s = rankScaleMap[type] || 0.94;
  inner.position.y = 0.28;
  inner.scale.setScalar(s);

  const torsoGeo = geoCylinder(0.17, 0.22, 0.42, 16);
  const headGeo = geoSphere(0.165, 22, 18);

  const goldMat = getHeroMat('#c9a24b', 0.78, 0.22, 0);
  const darkGoldMat = getHeroMat('#9e7b36', 0.72, 0.26, 0);
  const crimsonMat = getHeroMat('#8e1c24', 0.35, 0.32, 0);
  const royalRedMat = getHeroMat('#b91c1c', 0.28, 0.34, 0);
  const silverMat = getHeroMat('#cbd5e1', 0.75, 0.22, 0);
  const obsidianMat = getHeroMat('#141418', 0.32, 0.42, 0);
  const blueMat = getHeroMat('#1d4ed8', 0.25, 0.36, 0);
  const navyMat = getHeroMat('#1e3a5f', 0.28, 0.38, 0);
  const emeraldMat = getHeroMat('#15803d', 0.35, 0.32, 0);
  const greenGlowMat = getHeroMat('#22c55e', 0.2, 0.25, 0.45);
  const arcCyanMat = getHeroMat('#67e8f9', 0.1, 0.2, 0.65);
  const chaosRedMat = getHeroMat('#ef4444', 0.15, 0.22, 0.55);
  const whiteMat = getHeroMat('#f1f5f9', 0.12, 0.3, 0);
  const purpleMat = getHeroMat('#581c87', 0.22, 0.4, 0);
  const tealMat = getHeroMat('#0f766e', 0.45, 0.32, 0);

  // Side armor collar strip so White vs Black teams stay distinct from above
  addMesh(inner, geoCylinder(0.22, 0.24, 0.08, 16), mainMat, [0, 0.04, 0]);

  if (heroId === 'hero_ironman') {
    addMesh(inner, torsoGeo, crimsonMat, [0, 0.25, 0]);
    addMesh(inner, geoBox(0.42, 0.10, 0.22), goldMat, [0, 0.41, 0]);
    // Chest Arc Reactor
    addMesh(inner, geoTorus(0.068, 0.015, 10, 20), silverMat, [0, 0.28, dir * 0.18]);
    addMesh(inner, geoCylinder(0.048, 0.048, 0.025, 16), arcCyanMat, [0, 0.28, dir * 0.185], [Math.PI / 2, 0, 0]);
    // Mark-85 Helmet & Gold Faceplate
    addMesh(inner, headGeo, crimsonMat, [0, 0.62, 0]);
    addMesh(inner, geoBox(0.20, 0.22, 0.08), goldMat, [0, 0.61, dir * 0.13]);
    addMesh(inner, geoBox(0.055, 0.022, 0.03), arcCyanMat, [-0.048, 0.635, dir * 0.165]);
    addMesh(inner, geoBox(0.055, 0.022, 0.03), arcCyanMat, [0.048, 0.635, dir * 0.165]);
  } else if (heroId === 'hero_scarlet') {
    addMesh(inner, torsoGeo, crimsonMat, [0, 0.25, 0]);
    // Mantle collar & crimson cape backplate
    addMesh(inner, geoBox(0.36, 0.24, 0.08), mainMat, [0, 0.26, -dir * 0.18], [dir * 0.18, 0, 0]);
    addMesh(inner, headGeo, mainMat, [0, 0.61, 0]);
    // Sokovia Scarlet Crown
    const tiaraGeo = geoExtrude('scarlet_tiara', (sh) => {
      sh.moveTo(-0.18, 0);
      sh.lineTo(-0.15, 0.24);
      sh.lineTo(-0.07, 0.11);
      sh.lineTo(0, 0.18);
      sh.lineTo(0.07, 0.11);
      sh.lineTo(0.15, 0.24);
      sh.lineTo(0.18, 0);
      sh.lineTo(0.11, -0.05);
      sh.lineTo(0, 0.02);
      sh.lineTo(-0.11, -0.05);
      sh.closePath();
    }, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2 });
    addMesh(inner, tiaraGeo, royalRedMat, [0, 0.72, dir * 0.11]);
    // Chaos magic orb
    addMesh(inner, geoSphere(0.075, 16, 14), chaosRedMat, [0, 0.94, 0]);
    addMesh(inner, geoTorus(0.115, 0.012, 8, 20), chaosRedMat, [0, 0.94, 0], [Math.PI / 3, 0.4, 0]);
  } else if (heroId === 'hero_thor') {
    addMesh(inner, torsoGeo, navyMat, [0, 0.25, 0]);
    // Crimson cape
    addMesh(inner, geoBox(0.34, 0.36, 0.07), crimsonMat, [0, 0.25, -dir * 0.19], [dir * 0.15, 0, 0]);
    // 4 Asgardian chest discs
    for (const [dx, dy] of [[-0.07, 0.33], [0.07, 0.33], [-0.06, 0.21], [0.06, 0.21]]) {
      addMesh(inner, geoCylinder(0.036, 0.036, 0.02, 14), silverMat, [dx, dy, dir * 0.18], [Math.PI / 2, 0, 0]);
    }
    // Winged helmet
    addMesh(inner, headGeo, silverMat, [0, 0.62, 0]);
    const wingGeo = geoExtrude('thor_wing', (sh) => {
      sh.moveTo(0, 0);
      sh.lineTo(0.18, 0.22);
      sh.lineTo(0.09, 0.26);
      sh.lineTo(-0.02, 0.10);
      sh.closePath();
    }, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 1 });
    addMesh(inner, wingGeo, silverMat, [-0.19, 0.72, 0], [0, Math.PI, 0.25]);
    addMesh(inner, wingGeo, silverMat, [0.19, 0.72, 0], [0, 0, -0.25]);
    // Raised Mjolnir
    addMesh(inner, geoCylinder(0.024, 0.024, 0.34, 10), goldMat, [0.27, 0.56, dir * 0.08], [0.3 * dir, 0, -0.15]);
    addMesh(inner, geoBox(0.24, 0.14, 0.14), silverMat, [0.30, 0.74, dir * 0.12], [0.2 * dir, 0, -0.15]);
  } else if (heroId === 'hero_strange') {
    addMesh(inner, torsoGeo, navyMat, [0, 0.25, 0]);
    // High Cloak of Levitation flared collar
    addMesh(inner, geoCylinder(0.26, 0.19, 0.24, 16, 1), crimsonMat, [0, 0.44, -dir * 0.06]);
    addMesh(inner, geoBox(0.42, 0.26, 0.07), crimsonMat, [0, 0.48, -dir * 0.17], [-0.22 * dir, 0, 0]);
    // Eye of Agamotto medallion
    addMesh(inner, geoTorus(0.068, 0.016, 10, 20), goldMat, [0, 0.29, dir * 0.185]);
    addMesh(inner, geoSphere(0.036, 12, 12), greenGlowMat, [0, 0.29, dir * 0.195]);
    addMesh(inner, headGeo, mainMat, [0, 0.63, 0]);
    // Eldritch mystic ring behind crown
    addMesh(inner, geoTorus(0.24, 0.014, 10, 28), darkGoldMat, [0, 0.68, -dir * 0.14]);
  } else if (heroId === 'hero_spiderman') {
    addMesh(inner, torsoGeo, royalRedMat, [0, 0.25, 0]);
    addMesh(inner, geoBox(0.42, 0.24, 0.16), navyMat, [0, 0.18, 0]);
    // Chest spider emblem
    addMesh(inner, geoBox(0.04, 0.09, 0.03), obsidianMat, [0, 0.30, dir * 0.185]);
    addMesh(inner, geoBox(0.12, 0.022, 0.03), obsidianMat, [0, 0.31, dir * 0.185], [0, 0, 0.4]);
    addMesh(inner, geoBox(0.12, 0.022, 0.03), obsidianMat, [0, 0.31, dir * 0.185], [0, 0, -0.4]);
    // Mask & iconic white lenses with dark rims
    addMesh(inner, headGeo, royalRedMat, [0, 0.62, 0]);
    addMesh(inner, geoBox(0.085, 0.065, 0.04), obsidianMat, [-0.065, 0.64, dir * 0.145], [0, -0.25 * dir, -0.28]);
    addMesh(inner, geoBox(0.085, 0.065, 0.04), obsidianMat, [0.065, 0.64, dir * 0.145], [0, 0.25 * dir, 0.28]);
    addMesh(inner, geoBox(0.062, 0.042, 0.045), whiteMat, [-0.065, 0.64, dir * 0.152], [0, -0.25 * dir, -0.28]);
    addMesh(inner, geoBox(0.062, 0.042, 0.045), whiteMat, [0.065, 0.64, dir * 0.152], [0, 0.25 * dir, 0.28]);
  } else if (heroId === 'hero_cap') {
    addMesh(inner, torsoGeo, navyMat, [0, 0.25, 0]);
    addMesh(inner, headGeo, navyMat, [0, 0.62, 0]);
    addMesh(inner, geoBox(0.06, 0.06, 0.04), silverMat, [0, 0.69, dir * 0.15]);
    // Concentric Vibranium Shield mounted cleanly on front-left/chest
    const shieldPos = [0, 0.31, dir * 0.23];
    const shieldRot = [Math.PI / 2, 0, 0];
    addMesh(inner, geoCylinder(0.24, 0.24, 0.035, 28), royalRedMat, shieldPos, shieldRot);
    addMesh(inner, geoCylinder(0.185, 0.185, 0.042, 28), whiteMat, shieldPos, shieldRot);
    addMesh(inner, geoCylinder(0.13, 0.13, 0.048, 28), royalRedMat, shieldPos, shieldRot);
    addMesh(inner, geoCylinder(0.08, 0.08, 0.054, 24), blueMat, shieldPos, shieldRot);
    addMesh(inner, geoOctahedron(0.038, 0), whiteMat, [0, 0.31, dir * 0.26]);
  } else if (heroId === 'hero_wolverine') {
    addMesh(inner, torsoGeo, goldMat, [0, 0.25, 0]);
    addMesh(inner, geoBox(0.44, 0.10, 0.22), obsidianMat, [0, 0.40, 0]);
    addMesh(inner, headGeo, goldMat, [0, 0.62, 0]);
    // Swept Wolverine cowl fins
    const finGeo = geoExtrude('wolverine_fin', (sh) => {
      sh.moveTo(0, 0);
      sh.lineTo(0.22, 0.20);
      sh.lineTo(0.12, 0.25);
      sh.lineTo(-0.04, 0.08);
      sh.closePath();
    }, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1 });
    addMesh(inner, finGeo, obsidianMat, [-0.15, 0.70, dir * 0.04], [0, Math.PI, 0.15]);
    addMesh(inner, finGeo, obsidianMat, [0.15, 0.70, dir * 0.04], [0, 0, -0.15]);
    // 3 Adamantium claws extending on each side
    for (const sideX of [-0.24, 0.24]) {
      for (const dy of [-0.035, 0, 0.035]) {
        addMesh(inner, geoBox(0.016, 0.018, 0.28), silverMat, [sideX, 0.24 + dy, dir * 0.18], [-0.22 * dir, 0, 0]);
      }
    }
  } else if (heroId === 'hero_panther') {
    addMesh(inner, torsoGeo, obsidianMat, [0, 0.25, 0]);
    // Wakandan silver fang necklace
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.35;
      addMesh(inner, geoCone(0.018, 0.07, 6), silverMat, [Math.sin(a) * 0.19, 0.42, dir * Math.cos(a) * 0.19], [Math.PI * 0.85, 0, 0]);
    }
    addMesh(inner, headGeo, obsidianMat, [0, 0.62, 0]);
    // Pointed panther ears & silver eyes
    addMesh(inner, geoCone(0.045, 0.13, 4), obsidianMat, [-0.10, 0.79, -dir * 0.02]);
    addMesh(inner, geoCone(0.045, 0.13, 4), obsidianMat, [0.10, 0.79, -dir * 0.02]);
    addMesh(inner, geoBox(0.055, 0.02, 0.03), silverMat, [-0.05, 0.635, dir * 0.16]);
    addMesh(inner, geoBox(0.055, 0.02, 0.03), silverMat, [0.05, 0.635, dir * 0.16]);
    addMesh(inner, geoTorus(0.18, 0.014, 8, 22), purpleMat, [0, 0.45, 0], [Math.PI / 2, 0, 0]);
  } else if (heroId === 'hero_batman') {
    addMesh(inner, torsoGeo, mainMat, [0, 0.25, 0]);
    // Broad cape mantle shoulders
    addMesh(inner, geoBox(0.46, 0.14, 0.24), obsidianMat, [0, 0.39, -dir * 0.03]);
    addMesh(inner, geoBox(0.42, 0.34, 0.07), obsidianMat, [0, 0.24, -dir * 0.19], [dir * 0.18, 0, 0]);
    // Utility bronze belt & chest bat crest
    addMesh(inner, geoTorus(0.21, 0.02, 10, 22), darkGoldMat, [0, 0.10, 0], [Math.PI / 2, 0, 0]);
    addMesh(inner, geoCylinder(0.085, 0.085, 0.022, 18), darkGoldMat, [0, 0.29, dir * 0.185], [Math.PI / 2, 0, 0]);
    addMesh(inner, geoBox(0.11, 0.035, 0.03), obsidianMat, [0, 0.29, dir * 0.195]);
    // Dark Cowl & Tall Bat Ears
    addMesh(inner, headGeo, obsidianMat, [0, 0.62, 0]);
    addMesh(inner, geoCone(0.042, 0.22, 4), obsidianMat, [-0.11, 0.84, -dir * 0.02]);
    addMesh(inner, geoCone(0.042, 0.22, 4), obsidianMat, [0.11, 0.84, -dir * 0.02]);
    addMesh(inner, geoBox(0.05, 0.018, 0.03), whiteMat, [-0.048, 0.63, dir * 0.16]);
    addMesh(inner, geoBox(0.05, 0.018, 0.03), whiteMat, [0.048, 0.63, dir * 0.16]);
  } else if (heroId === 'hero_wonderwoman') {
    addMesh(inner, torsoGeo, crimsonMat, [0, 0.25, 0]);
    addMesh(inner, geoCylinder(0.205, 0.225, 0.13, 16), navyMat, [0, 0.12, 0]);
    // Coiled Golden Lasso of Truth & WW chest eagle bar
    addMesh(inner, geoTorus(0.235, 0.022, 10, 24), goldMat, [0, 0.09, 0], [Math.PI / 2, 0, 0]);
    addMesh(inner, geoBox(0.20, 0.045, 0.04), goldMat, [0, 0.34, dir * 0.175]);
    // Crown & Amazonian Tiara + Red Star
    addMesh(inner, headGeo, mainMat, [0, 0.62, 0]);
    const wwTiara = geoExtrude('ww_tiara', (sh) => {
      sh.moveTo(-0.16, 0);
      sh.lineTo(-0.09, 0.07);
      sh.lineTo(0, 0.14);
      sh.lineTo(0.09, 0.07);
      sh.lineTo(0.16, 0);
      sh.lineTo(0.14, -0.04);
      sh.lineTo(0, 0.02);
      sh.lineTo(-0.14, -0.04);
      sh.closePath();
    }, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 });
    addMesh(inner, wwTiara, goldMat, [0, 0.72, dir * 0.12]);
    addMesh(inner, geoOctahedron(0.032, 0), royalRedMat, [0, 0.74, dir * 0.155]);
  } else if (heroId === 'hero_superman') {
    addMesh(inner, torsoGeo, blueMat, [0, 0.25, 0]);
    addMesh(inner, geoBox(0.36, 0.36, 0.07), crimsonMat, [0, 0.25, -dir * 0.19], [dir * 0.18, 0, 0]);
    // Pentagonal Superman S Shield
    const shieldGeo = geoExtrude('supes_shield', (sh) => {
      sh.moveTo(-0.09, 0.07);
      sh.lineTo(0.09, 0.07);
      sh.lineTo(0.12, 0.01);
      sh.lineTo(0, -0.10);
      sh.lineTo(-0.12, 0.01);
      sh.closePath();
    }, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 });
    addMesh(inner, shieldGeo, goldMat, [0, 0.30, dir * 0.185]);
    addMesh(inner, shieldGeo, royalRedMat, [0, 0.30, dir * 0.194], [0, 0, 0], [0.76, 0.76, 1]);
    // Crown
    addMesh(inner, headGeo, mainMat, [0, 0.62, 0]);
    addMesh(inner, geoBox(0.24, 0.10, 0.22), obsidianMat, [0, 0.75, -dir * 0.02]);
  } else if (heroId === 'hero_greenlantern') {
    addMesh(inner, torsoGeo, emeraldMat, [0, 0.25, 0]);
    addMesh(inner, geoBox(0.42, 0.10, 0.22), obsidianMat, [0, 0.40, 0]);
    // Oa chest symbol
    addMesh(inner, geoCylinder(0.075, 0.075, 0.025, 20), whiteMat, [0, 0.29, dir * 0.185], [Math.PI / 2, 0, 0]);
    addMesh(inner, geoTorus(0.042, 0.014, 10, 20), greenGlowMat, [0, 0.29, dir * 0.198]);
    addMesh(inner, headGeo, mainMat, [0, 0.62, 0]);
    addMesh(inner, geoBox(0.22, 0.055, 0.12), emeraldMat, [0, 0.64, dir * 0.12]);
    // Lantern crown core
    addMesh(inner, geoCylinder(0.06, 0.08, 0.14, 8), greenGlowMat, [0, 0.85, 0]);
  } else if (heroId === 'hero_flash') {
    addMesh(inner, torsoGeo, royalRedMat, [0, 0.25, 0]);
    addMesh(inner, geoCylinder(0.075, 0.075, 0.025, 20), whiteMat, [0, 0.30, dir * 0.185], [Math.PI / 2, 0, 0]);
    const boltGeo = geoExtrude('flash_bolt', (sh) => {
      sh.moveTo(0.02, 0.08);
      sh.lineTo(-0.04, 0.01);
      sh.lineTo(0.0, 0.01);
      sh.lineTo(-0.03, -0.08);
      sh.lineTo(0.04, -0.01);
      sh.lineTo(0.0, -0.01);
      sh.closePath();
    }, { depth: 0.02, bevelEnabled: false });
    addMesh(inner, boltGeo, goldMat, [0, 0.30, dir * 0.20]);
    // Aerodynamic speedster cowl with swept golden ear-wings
    addMesh(inner, headGeo, royalRedMat, [0, 0.62, 0]);
    addMesh(inner, geoBox(0.028, 0.09, 0.18), goldMat, [-0.175, 0.66, -dir * 0.04], [0.22 * dir, 0, 0]);
    addMesh(inner, geoBox(0.028, 0.09, 0.18), goldMat, [0.175, 0.66, -dir * 0.04], [0.22 * dir, 0, 0]);
  } else if (heroId === 'hero_aquaman') {
    addMesh(inner, torsoGeo, goldMat, [0, 0.25, 0]);
    addMesh(inner, geoCylinder(0.21, 0.23, 0.12, 16), tealMat, [0, 0.10, 0]);
    addMesh(inner, headGeo, mainMat, [0, 0.62, 0]);
    addMesh(inner, geoTorus(0.15, 0.02, 10, 20), goldMat, [0, 0.72, 0], [Math.PI / 2, 0, 0]);
    // Golden Trident of Poseidon
    addMesh(inner, geoCylinder(0.022, 0.022, 0.85, 10), goldMat, [0.28, 0.46, dir * 0.04]);
    addMesh(inner, geoBox(0.18, 0.028, 0.028), goldMat, [0.28, 0.86, dir * 0.04]);
    addMesh(inner, geoCone(0.022, 0.14, 6), goldMat, [0.20, 0.94, dir * 0.04]);
    addMesh(inner, geoCone(0.024, 0.18, 6), goldMat, [0.28, 0.96, dir * 0.04]);
    addMesh(inner, geoCone(0.022, 0.14, 6), goldMat, [0.36, 0.94, dir * 0.04]);
  } else if (heroId === 'hero_joker') {
    addMesh(inner, torsoGeo, purpleMat, [0, 0.25, 0]);
    addMesh(inner, geoBox(0.09, 0.26, 0.04), darkGoldMat, [0, 0.27, dir * 0.17]);
    addMesh(inner, headGeo, whiteMat, [0, 0.62, 0]);
    // Joker grin + emerald hair crown + tilted purple hat
    addMesh(inner, geoBox(0.14, 0.032, 0.04), royalRedMat, [0, 0.56, dir * 0.15]);
    addMesh(inner, geoCylinder(0.22, 0.22, 0.025, 20), emeraldMat, [0, 0.76, 0], [0.1, 0, 0.1]);
    addMesh(inner, geoCylinder(0.13, 0.15, 0.16, 16), purpleMat, [0, 0.85, 0], [0.1, 0, 0.1]);
  }

  g.add(inner);
  return g;
}

/**
 * Builds a complete 3D piece mesh group according to piece type, side ('w'|'b'), and customization config.
 */
export function buildChessPiece3D(type, colorSide, pieceConfig) {
  const cfg = pieceConfig || createDefaultPieceConfig();
  const { mainMat, accentMat } = buildMaterials(colorSide, cfg);
  const effectiveStyle = resolveEffectiveStyle(cfg.style, type, colorSide);

  let group;
  if (effectiveStyle.startsWith('hero_')) {
    group = buildHeroPiece(effectiveStyle, type, colorSide, mainMat, accentMat);
  } else {
    switch (effectiveStyle) {
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
  }

  const hScale = Number(cfg.heightScale || 1.0);
  group.scale.set(1, hScale, 1);
  group.userData = { type, color: colorSide, effectiveStyle };
  return group;
}

/**
 * Dedicated isolated 3D Preview Renderer for the Piece Customization Studio modal.
 */
export class PiecePreviewStudio {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0b0e');

    const w = canvas.clientWidth || 280;
    const h = canvas.clientHeight || 280;
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 30);
    this.camera.position.set(1.75, 1.55, 2.25);
    this.camera.lookAt(0, 0.68, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;

    // Studio lights
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.65));
    const keyLight = new THREE.DirectionalLight('#fff4df', 2.0);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#94a3b8', 0.65);
    rimLight.position.set(-3, 3, -3);
    this.scene.add(rimLight);

    const warmFill = new THREE.PointLight('#c29b61', 0.7, 10);
    warmFill.position.set(2, 1.5, -2);
    this.scene.add(warmFill);

    // Pedestal disc
    const baseGeo = new THREE.CylinderGeometry(0.68, 0.76, 0.12, 48);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#17171b', metalness: 0.35, roughness: 0.45 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.06;
    base.receiveShadow = true;
    this.scene.add(base);

    const ringGeo = new THREE.TorusGeometry(0.69, 0.015, 12, 48);
    const ringMat = new THREE.MeshStandardMaterial({ color: '#8c6f44', emissive: '#000000', emissiveIntensity: 0, metalness: 0.6, roughness: 0.35 });
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
