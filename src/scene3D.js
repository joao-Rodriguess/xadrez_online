import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildChessPiece3D } from './pieceBuilder3D.js';

export const LIGHTING_MODES = {
  dark: {
    id: 'dark',
    label: 'Sem Luz (Escuro)',
    shortLabel: 'Sem Luz',
    ambientIntensity: 0.24,
    dirIntensity: 0.88,
    rimIntensity: 0.0,
    warmIntensity: 0.0,
    exposure: 0.78,
    bgMultiplier: 0.55,
    showAmbientParticles: false,
    showTrailSparks: false,
    tileClearcoat: 0.12,
  },
  dim: {
    id: 'dim',
    label: 'Penumbra (Padrão)',
    shortLabel: 'Penumbra',
    ambientIntensity: 0.34,
    dirIntensity: 1.32,
    rimIntensity: 0.18,
    warmIntensity: 0.28,
    exposure: 0.94,
    bgMultiplier: 0.78,
    showAmbientParticles: false,
    showTrailSparks: false,
    tileClearcoat: 0.25,
  },
  lit: {
    id: 'lit',
    label: 'Com Luz (Estúdio)',
    shortLabel: 'Com Luz',
    ambientIntensity: 0.48,
    dirIntensity: 1.95,
    rimIntensity: 0.45,
    warmIntensity: 0.55,
    exposure: 1.12,
    bgMultiplier: 1.0,
    showAmbientParticles: true,
    showTrailSparks: true,
    tileClearcoat: 0.48,
  },
};

export const BOARD_THEMES = {
  dark_obsidian: {
    id: 'dark_obsidian',
    label: 'Obsidiana & Grafite (Escuro)',
    lightSquare: '#78756e',
    darkSquare: '#1c1c21',
    frame: '#0e0e11',
    frameAccent: '#9a7b4f',
    groutColor: '#09090b',
    bgColor: '#070709',
    roughness: 0.46,
    metalness: 0.12,
  },
  classic_wood: {
    id: 'classic_wood',
    label: 'Madeira Nobre Clássica',
    lightSquare: '#d8be9e',
    darkSquare: '#5e3514',
    frame: '#26150a',
    frameAccent: '#b08948',
    groutColor: '#160c05',
    bgColor: '#090807',
    roughness: 0.38,
    metalness: 0.06,
  },
  marble_royal: {
    id: 'marble_royal',
    label: 'Mármore Imperial',
    lightSquare: '#d9dee6',
    darkSquare: '#232934',
    frame: '#101217',
    frameAccent: '#b5924c',
    groutColor: '#0a0b0e',
    bgColor: '#08090c',
    roughness: 0.22,
    metalness: 0.14,
  },
  cyber_neon: {
    id: 'cyber_neon',
    label: 'Cyber Neon',
    lightSquare: '#2b3b54',
    darkSquare: '#080e1a',
    frame: '#04070e',
    frameAccent: '#00f5d4',
    groutColor: '#003d38',
    bgColor: '#04060d',
    roughness: 0.22,
    metalness: 0.65,
    emissiveGrid: '#00f5d4',
  },
  crystal_glass: {
    id: 'crystal_glass',
    label: 'Cristal & Safira',
    lightSquare: '#cdeeff',
    darkSquare: '#19375e',
    frame: '#0a1528',
    frameAccent: '#38bdf8',
    groutColor: '#061224',
    bgColor: '#060c18',
    roughness: 0.08,
    metalness: 0.25,
  },
  medieval_stone: {
    id: 'medieval_stone',
    label: 'Pedra Medieval',
    lightSquare: '#c7cec0',
    darkSquare: '#343b33',
    frame: '#1a1d19',
    frameAccent: '#a86b2d',
    groutColor: '#111311',
    bgColor: '#090b09',
    roughness: 0.65,
    metalness: 0.10,
  },
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const SQUARE_SIZE = 1.0;

export function squareToCoords(square) {
  const fileIdx = FILES.indexOf(square[0]);
  const rankNum = parseInt(square[1], 10); // 1..8
  // Rank 1 at +Z (White side), Rank 8 at -Z (Black side)
  const x = (fileIdx - 3.5) * SQUARE_SIZE;
  const z = (4.5 - rankNum) * SQUARE_SIZE;
  return { x, z, fileIdx, rankIdx: 8 - rankNum };
}

export function coordsToSquare(x, z) {
  const fileIdx = Math.round(x / SQUARE_SIZE + 3.5);
  const rankNum = Math.round(4.5 - z / SQUARE_SIZE);
  if (fileIdx < 0 || fileIdx > 7 || rankNum < 1 || rankNum > 8) return null;
  return `${FILES[fileIdx]}${rankNum}`;
}

function createProceduralTileTexture(hexColor, isLight, themeId, squareLabel) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 256, 256);

  if (themeId === 'classic_wood') {
    ctx.strokeStyle = isLight ? 'rgba(139, 90, 43, 0.14)' : 'rgba(20, 10, 2, 0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 42; i++) {
      ctx.beginPath();
      const y = (i / 42) * 256;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(85, y + Math.sin(i) * 8, 170, y - Math.cos(i) * 8, 256, y);
      ctx.stroke();
    }
  } else if (themeId === 'marble_royal' || themeId === 'crystal_glass') {
    ctx.strokeStyle = isLight ? 'rgba(71, 85, 105, 0.18)' : 'rgba(226, 232, 240, 0.14)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(((i * 37) % 256), 0);
      ctx.quadraticCurveTo(((i * 73) % 256), 128, ((i * 53 + 40) % 256), 256);
      ctx.stroke();
    }
  } else if (themeId === 'cyber_neon') {
    ctx.strokeStyle = isLight ? 'rgba(56, 189, 248, 0.45)' : 'rgba(0, 245, 212, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, 246, 246);
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 20, 216, 216);
  } else if (themeId === 'medieval_stone') {
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
      ctx.fillRect((i * 41) % 252, (i * 89) % 252, 4, 4);
    }
  }

  // Subtle square border bevel for crisp 64-square readability
  ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);

  // Discreet coordinate stamp on corner of each square
  if (squareLabel) {
    ctx.fillStyle = isLight ? 'rgba(15, 23, 42, 0.42)' : 'rgba(248, 250, 252, 0.38)';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(squareLabel, 242, 244);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCoordinateLabelMesh(text, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = colorHex;
  ctx.font = 'bold 34px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.40), mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export class Scene3D {
  constructor(container, callbacks) {
    this.container = container;
    if (typeof callbacks === 'function') {
      this.onSquareClick = callbacks;
      this.canDragSquare = () => false;
      this.onPieceSelect = null;
      this.onPieceDrop = null;
    } else {
      this.onSquareClick = callbacks?.onSquareClick;
      this.canDragSquare = callbacks?.canDragSquare || (() => false);
      this.onPieceSelect = callbacks?.onPieceSelect;
      this.onPieceDrop = callbacks?.onPieceDrop;
    }

    this.scene = new THREE.Scene();
    this.themeId = 'dark_obsidian';
    this.lightingMode = 'dim';
    const theme = BOARD_THEMES[this.themeId];
    this.scene.background = new THREE.Color(theme.bgColor);
    this.scene.fog = new THREE.FogExp2(theme.bgColor, 0.02);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(0, 8.2, 8.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // Environment reflection for PBR metals/marble/crystal
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.minPolarAngle = 0.15;
    this.controls.minDistance = 5.5;
    this.controls.maxDistance = 22.0;
    this.controls.target.set(0, 0.15, 0);

    this._setupLights();

    // Groups
    this.boardGroup = new THREE.Group();
    this.piecesGroup = new THREE.Group();
    this.markersGroup = new THREE.Group();
    this.ghostGroup = new THREE.Group();
    this.particlesGroup = new THREE.Group();
    this.effectsGroup = new THREE.Group();
    this.ambientGroup = new THREE.Group();
    this.scene.add(
      this.boardGroup,
      this.piecesGroup,
      this.markersGroup,
      this.ghostGroup,
      this.particlesGroup,
      this.effectsGroup,
      this.ambientGroup
    );

    this.squareMeshes = new Map();
    this.pieceMeshes = new Map(); // square -> THREE.Group
    this.activeAnimations = [];
    this.particles = [];
    this.shockwaves = [];
    this.fallAnimation = null;
    this.cameraGoal = null;
    this.menuOrbit = false;
    this._menuOrbitAngle = 0.65;
    this._currentCameraPreset = 'w';

    // Shared reusable geometries & cached ghost materials/meshes for 60+ FPS animations
    this._sharedSparkGeo = new THREE.OctahedronGeometry(0.036, 0);
    this._sharedCaptureGeo = new THREE.OctahedronGeometry(0.06, 0);
    this._sharedShockwaveGeo = new THREE.RingGeometry(0.18, 0.28, 32);
    this._ghostPieceCache = new Map();
    this._ghostMoveMat = null;
    this._ghostCaptureMat = null;

    // Selection, hover preview & 3D Hold-and-Drag state
    this.selectedSquare = null;
    this.legalMoveTargets = new Map(); // toSquare -> moveObj
    this.hoveredTargetSquare = null;
    this.lastBoardMatrix = null;
    this.lastCustomization = null;
    this.dragState = null;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.58);
    this.dragIntersect = new THREE.Vector3();
    this.dragFloorRing = null;
    this.floorMesh = null;

    this._buildBoard();
    this.setLightingMode(this.lightingMode);

    // Pointer interaction (click + hold-and-drag + hover ghost preview)
    this.raycaster = new THREE.Raycaster();
    this._pointerDownPos = { x: 0, y: 0 };
    this._bindEvents();

    this._clock = new THREE.Clock();
    this._animateLoop();
  }

  _setupLights() {
    this.ambientLight = new THREE.AmbientLight('#ffffff', 0.34);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight('#fff6e5', 1.32);
    this.dirLight.position.set(6, 12, 7);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 2;
    this.dirLight.shadow.camera.far = 28;
    const d = 6;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.rimLight = new THREE.DirectionalLight('#94a3b8', 0.18);
    this.rimLight.position.set(-7, 6, -7);
    this.scene.add(this.rimLight);

    this.warmLight = new THREE.PointLight('#d69e2e', 0.28, 18);
    this.warmLight.position.set(0, 5, 0);
    this.scene.add(this.warmLight);
  }

  setLightingMode(modeId = 'dim') {
    const cfg = LIGHTING_MODES[modeId] || LIGHTING_MODES.dim;
    this.lightingMode = cfg.id;

    if (this.ambientLight) this.ambientLight.intensity = cfg.ambientIntensity;
    if (this.dirLight) this.dirLight.intensity = cfg.dirIntensity;
    if (this.rimLight) this.rimLight.intensity = cfg.rimIntensity;
    if (this.warmLight) this.warmLight.intensity = cfg.warmIntensity;
    if (this.renderer) this.renderer.toneMappingExposure = cfg.exposure;

    const theme = BOARD_THEMES[this.themeId] || BOARD_THEMES.dark_obsidian;
    const bg = new THREE.Color(theme.bgColor).multiplyScalar(cfg.bgMultiplier);
    this.scene.background = bg;
    if (this.scene.fog) this.scene.fog.color.copy(bg);
    if (this.floorMesh?.material) {
      this.floorMesh.material.color.copy(bg);
    }
    if (this.ambientGroup) {
      this.ambientGroup.visible = Boolean(cfg.showAmbientParticles);
    }
    for (const mesh of this.squareMeshes.values()) {
      if (mesh.material && 'clearcoat' in mesh.material) {
        mesh.material.clearcoat = cfg.tileClearcoat;
      }
    }
  }

  _buildBoard() {
    while (this.boardGroup.children.length > 0) {
      this.boardGroup.remove(this.boardGroup.children[0]);
    }
    this.squareMeshes.clear();

    const theme = BOARD_THEMES[this.themeId] || BOARD_THEMES.marble_royal;
    this.scene.background = new THREE.Color(theme.bgColor);
    this.scene.fog = new THREE.FogExp2(theme.bgColor, 0.02);

    // Outer luxury bevel frame (top at y = -0.06, safely below squares)
    const frameGeo = new THREE.BoxGeometry(9.4, 0.36, 9.4);
    const frameMat = new THREE.MeshStandardMaterial({
      color: theme.frame,
      metalness: 0.4,
      roughness: 0.3,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = -0.24;
    frameMesh.receiveShadow = true;
    frameMesh.castShadow = true;
    this.boardGroup.add(frameMesh);

    // Glowing/gold trim bezel framing the 8x8 grid (top at y = -0.04)
    const trimGeo = new THREE.BoxGeometry(8.28, 0.24, 8.28);
    const trimMat = new THREE.MeshStandardMaterial({
      color: theme.frameAccent,
      metalness: 0.8,
      roughness: 0.2,
      emissive: theme.emissiveGrid ? new THREE.Color(theme.emissiveGrid) : new THREE.Color('#000000'),
      emissiveIntensity: theme.emissiveGrid ? 0.55 : 0,
    });
    const trimMesh = new THREE.Mesh(trimGeo, trimMat);
    trimMesh.position.y = -0.16;
    trimMesh.receiveShadow = true;
    this.boardGroup.add(trimMesh);

    // Dark recessed grout bed beneath the 64 individual tiles (top at y = -0.03)
    const groutGeo = new THREE.BoxGeometry(8.06, 0.10, 8.06);
    const groutMat = new THREE.MeshStandardMaterial({
      color: theme.groutColor || '#0a0f18',
      roughness: 0.5,
      metalness: 0.25,
    });
    const groutMesh = new THREE.Mesh(groutGeo, groutMat);
    groutMesh.position.y = -0.08;
    groutMesh.receiveShadow = true;
    this.boardGroup.add(groutMesh);

    // 64 individual beveled tiles (0.96 x 0.10 x 0.96, top surface exactly at y = 0.00)
    const tileGeo = new THREE.BoxGeometry(0.96, 0.10, 0.96);

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const rank = 8 - r;
        const square = `${FILES[f]}${rank}`;
        const isLight = (r + f) % 2 === 0;
        const tileHex = isLight ? theme.lightSquare : theme.darkSquare;
        const tileTex = createProceduralTileTexture(tileHex, isLight, this.themeId, square);
        const mat = new THREE.MeshPhysicalMaterial({
          map: tileTex,
          roughness: theme.roughness,
          metalness: theme.metalness,
          clearcoat: 0.55,
        });
        const mesh = new THREE.Mesh(tileGeo, mat);
        const { x, z } = squareToCoords(square);
        mesh.position.set(x, -0.05, z);
        mesh.receiveShadow = true;
        mesh.userData = { square, isLight };
        this.boardGroup.add(mesh);
        this.squareMeshes.set(square, mesh);
      }
    }

    // Coordinates on board rim (resting cleanly above frame top y = -0.06)
    const labelColor = theme.frameAccent;
    for (let i = 0; i < 8; i++) {
      const fileLabel = createCoordinateLabelMesh(FILES[i].toUpperCase(), labelColor);
      fileLabel.position.set((i - 3.5) * SQUARE_SIZE, -0.055, 4.42);
      this.boardGroup.add(fileLabel);

      const fileLabelTop = createCoordinateLabelMesh(FILES[i].toUpperCase(), labelColor);
      fileLabelTop.position.set((i - 3.5) * SQUARE_SIZE, -0.055, -4.42);
      fileLabelTop.rotation.z = Math.PI;
      this.boardGroup.add(fileLabelTop);

      const rankNum = String(8 - i);
      const rankLabelLeft = createCoordinateLabelMesh(rankNum, labelColor);
      rankLabelLeft.position.set(-4.42, -0.055, (i - 3.5) * SQUARE_SIZE);
      this.boardGroup.add(rankLabelLeft);

      const rankLabelRight = createCoordinateLabelMesh(rankNum, labelColor);
      rankLabelRight.position.set(4.42, -0.055, (i - 3.5) * SQUARE_SIZE);
      rankLabelRight.rotation.z = Math.PI;
      this.boardGroup.add(rankLabelRight);
    }

    // Subtle reflective pedestal floor beneath the board
    const floorGeo = new THREE.CircleGeometry(14, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: theme.bgColor,
      roughness: 0.75,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.44;
    floor.receiveShadow = true;
    this.floorMesh = floor;
    this.boardGroup.add(floor);

    this._buildAmbientParticles(theme.frameAccent || '#9a7b4f');
  }

  _buildAmbientParticles(accentHex) {
    while (this.ambientGroup.children.length > 0) {
      const c = this.ambientGroup.children[0];
      this.ambientGroup.remove(c);
      c.geometry?.dispose();
      c.material?.dispose();
    }
    const count = 48;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 5.2 + Math.random() * 5.2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.2 + Math.random() * 4.2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: accentHex,
      size: 0.08,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    this.ambientGroup.add(points);
  }

  setBoardTheme(themeId) {
    if (!BOARD_THEMES[themeId]) return;
    this.themeId = themeId;
    this._buildBoard();
    this.setLightingMode(this.lightingMode);
  }

  _updatePointerRay(e) {
    const dom = this.renderer.domElement;
    const rect = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
  }

  _getSquareFromPointerEvent(e) {
    this._updatePointerRay(e);
    const targets = [...this.piecesGroup.children, ...this.squareMeshes.values()];
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && !obj.userData?.square) {
        obj = obj.parent;
      }
      return obj?.userData?.square || null;
    }
    return null;
  }

  _updateDragFloorRing(x, z, isValidTarget) {
    if (!this.dragFloorRing) {
      this.dragFloorRing = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.44, 32),
        new THREE.MeshBasicMaterial({ color: '#c29b61', side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
      );
      this.dragFloorRing.rotation.x = -Math.PI / 2;
      this.effectsGroup.add(this.dragFloorRing);
    }
    this.dragFloorRing.position.set(x, 0.025, z);
    this.dragFloorRing.material.color.set(isValidTarget ? '#6fa889' : '#c29b61');
  }

  _clearDragFloorRing() {
    if (this.dragFloorRing) {
      this.effectsGroup.remove(this.dragFloorRing);
      this.dragFloorRing.geometry.dispose();
      this.dragFloorRing.material.dispose();
      this.dragFloorRing = null;
    }
  }

  _bindEvents() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      this._pointerDownPos = { x: e.clientX, y: e.clientY };

      const sq = this._getSquareFromPointerEvent(e);
      if (sq && this.canDragSquare(sq) && this.pieceMeshes.has(sq)) {
        const wasSelected = this.selectedSquare === sq;
        if (!wasSelected && this.onPieceSelect) {
          this.onPieceSelect(sq);
        }
        const group = this.pieceMeshes.get(sq);
        if (group) {
          this.dragState = {
            fromSquare: sq,
            wasSelected,
            group,
            hasMoved: false,
            pointerId: e.pointerId,
            targetX: group.position.x,
            targetZ: group.position.z,
            hoverSquare: sq,
            sparkAcc: 0,
          };
          this.controls.enabled = false;
          try {
            dom.setPointerCapture(e.pointerId);
          } catch {
            // ignore capture errors
          }
          dom.style.cursor = 'grabbing';
        }
      }
    });

    dom.addEventListener('pointermove', (e) => {
      if (this.dragState) {
        const dx = e.clientX - this._pointerDownPos.x;
        const dy = e.clientY - this._pointerDownPos.y;
        if (Math.hypot(dx, dy) > 7) {
          this.dragState.hasMoved = true;
        }

        this._updatePointerRay(e);
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersect)) {
          const clampedX = Math.max(-4.35, Math.min(4.35, this.dragIntersect.x));
          const clampedZ = Math.max(-4.35, Math.min(4.35, this.dragIntersect.z));
          const hoverSq = coordsToSquare(clampedX, clampedZ);
          const isLegal = Boolean(hoverSq && this.legalMoveTargets.has(hoverSq));

          if (isLegal) {
            const dest = squareToCoords(hoverSq);
            // Gentle magnetic snap pull toward legal square center
            this.dragState.targetX = THREE.MathUtils.lerp(clampedX, dest.x, 0.36);
            this.dragState.targetZ = THREE.MathUtils.lerp(clampedZ, dest.z, 0.36);
            if (hoverSq !== this.hoveredTargetSquare) {
              this.hoveredTargetSquare = hoverSq;
              this._renderGhostPreview(hoverSq);
            }
          } else {
            this.dragState.targetX = clampedX;
            this.dragState.targetZ = clampedZ;
            if (this.hoveredTargetSquare) {
              this.hoveredTargetSquare = null;
              this._clearGhostPreview();
            }
          }
          this.dragState.hoverSquare = hoverSq;
          this._updateDragFloorRing(this.dragState.targetX, this.dragState.targetZ, isLegal);
        }
        return;
      }

      if (!this.selectedSquare || this.legalMoveTargets.size === 0) {
        if (this.hoveredTargetSquare) {
          this.hoveredTargetSquare = null;
          this._clearGhostPreview();
        }
        dom.style.cursor = 'default';
        return;
      }

      const sq = this._getSquareFromPointerEvent(e);
      if (sq && this.legalMoveTargets.has(sq)) {
        dom.style.cursor = 'pointer';
        if (sq !== this.hoveredTargetSquare) {
          this.hoveredTargetSquare = sq;
          this._renderGhostPreview(sq);
        }
      } else {
        dom.style.cursor = sq ? 'pointer' : 'default';
        if (this.hoveredTargetSquare) {
          this.hoveredTargetSquare = null;
          this._clearGhostPreview();
        }
      }
    });

    const finishDragOrClick = (e, cancelled = false) => {
      if (this.dragState) {
        const drag = this.dragState;
        this.dragState = null;
        this.controls.enabled = true;
        this._clearDragFloorRing();
        dom.style.cursor = 'default';
        try {
          dom.releasePointerCapture(drag.pointerId);
        } catch {
          // ignore
        }

        drag.group.rotation.set(0, 0, 0);

        if (!cancelled && drag.hasMoved) {
          const dropSq = drag.hoverSquare;
          if (dropSq && dropSq !== drag.fromSquare && this.legalMoveTargets.has(dropSq) && this.onPieceDrop) {
            this.onPieceDrop(drag.fromSquare, dropSq);
            return;
          }
          // Spring back smoothly to origin square if dropped on invalid square
          const origin = squareToCoords(drag.fromSquare);
          this.activeAnimations.push({
            group: drag.group,
            startPos: drag.group.position.clone(),
            endPos: new THREE.Vector3(origin.x, 0, origin.z),
            progress: 0,
            duration: 0.24,
            arcHeight: 0.25,
            tiltFactor: 0.05,
            landingColor: '#c29b61',
          });
          return;
        }

        // Quick tap/click on an already-selected piece toggles selection off
        if (!cancelled && !drag.hasMoved && drag.wasSelected && this.onSquareClick) {
          this.onSquareClick(drag.fromSquare);
        }
        return;
      }

      if (cancelled) return;
      const dx = e.clientX - this._pointerDownPos.x;
      const dy = e.clientY - this._pointerDownPos.y;
      if (Math.hypot(dx, dy) > 8) return; // Was dragging camera

      const sq = this._getSquareFromPointerEvent(e);
      if (sq && this.onSquareClick) {
        this.onSquareClick(sq);
      }
    };

    dom.addEventListener('pointerup', (e) => finishDragOrClick(e, false));
    dom.addEventListener('pointercancel', (e) => finishDragOrClick(e, true));

    window.addEventListener('resize', () => this.resize());
  }

  _clearGhostPreview() {
    while (this.ghostGroup.children.length > 0) {
      this.ghostGroup.remove(this.ghostGroup.children[0]);
    }
  }

  _getGhostMaterial(isCapture) {
    if (isCapture) {
      if (!this._ghostCaptureMat) {
        this._ghostCaptureMat = new THREE.MeshPhysicalMaterial({
          color: '#c95b63',
          emissive: '#c95b63',
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.34,
          roughness: 0.35,
          metalness: 0.08,
          depthWrite: false,
        });
      }
      return this._ghostCaptureMat;
    }
    if (!this._ghostMoveMat) {
      this._ghostMoveMat = new THREE.MeshPhysicalMaterial({
        color: '#74a88e',
        emissive: '#74a88e',
        emissiveIntensity: 0.15,
        transparent: true,
        opacity: 0.34,
        roughness: 0.35,
        metalness: 0.08,
        depthWrite: false,
      });
    }
    return this._ghostMoveMat;
  }

  _renderGhostPreview(targetSquare) {
    if (!this.selectedSquare || !this.pieceMeshes.has(this.selectedSquare)) {
      this._clearGhostPreview();
      return;
    }

    const sourcePiece = this.pieceMeshes.get(this.selectedSquare);
    const { type, color } = sourcePiece.userData;
    const pieceCfg = this.lastCustomization?.pieces?.[type];
    const cacheKey = `${type}:${color}:${pieceCfg?.style || 'staunton'}:${pieceCfg?.heightScale || 1}`;

    if (!this._ghostPieceCache) {
      this._ghostPieceCache = new Map();
    }

    const isCapture = Boolean(this.legalMoveTargets.get(targetSquare)?.captured);
    const ghostMat = this._getGhostMaterial(isCapture);

    let ghostMesh = this._ghostPieceCache.get(cacheKey);
    if (!ghostMesh) {
      ghostMesh = buildChessPiece3D(type, color, pieceCfg);
      ghostMesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          child.material = ghostMat;
        }
      });
      ghostMesh.userData.ghostFloat = true;
      ghostMesh.userData.lastMat = ghostMat;
      this._ghostPieceCache.set(cacheKey, ghostMesh);
    } else if (ghostMesh.userData.lastMat !== ghostMat) {
      ghostMesh.traverse((child) => {
        if (child.isMesh) {
          child.material = ghostMat;
        }
      });
      ghostMesh.userData.lastMat = ghostMat;
    }

    if (this.ghostGroup.children.length !== 1 || this.ghostGroup.children[0] !== ghostMesh) {
      this._clearGhostPreview();
      this.ghostGroup.add(ghostMesh);
    }

    const { x, z } = squareToCoords(targetSquare);
    ghostMesh.position.set(x, 0.04, z);
  }

  _getAspectZoomMultiplier() {
    const w = this.container?.clientWidth || window.innerWidth;
    const h = this.container?.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    if (aspect < 1.0) {
      return Math.min(2.05, Math.max(1.0, 1.12 / Math.max(0.48, aspect)));
    }
    return 1.0;
  }

  resize() {
    if (!this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (!this.menuOrbit) {
      this.setCameraView(this._currentCameraPreset || 'w');
    }
  }

  setCameraView(preset = 'w') {
    this.menuOrbit = false;
    this._currentCameraPreset = preset;
    const zoom = this._getAspectZoomMultiplier();
    let basePos;
    const target = new THREE.Vector3(0, 0.15, 0);
    if (preset === 'w') {
      basePos = new THREE.Vector3(0, 7.6, 8.2);
    } else if (preset === 'b') {
      basePos = new THREE.Vector3(0, 7.6, -8.2);
    } else if (preset === 'top') {
      basePos = new THREE.Vector3(0, 11.5, 0.6);
    } else if (preset === 'cinematic') {
      basePos = new THREE.Vector3(6.8, 6.2, 7.0);
    } else {
      basePos = new THREE.Vector3(0, 7.6, 8.2);
    }
    basePos.multiplyScalar(zoom);
    this.cameraGoal = { pos: basePos, target };
  }

  setMenuOrbit(enabled) {
    this.menuOrbit = Boolean(enabled);
    if (this.menuOrbit) {
      this.cameraGoal = null;
      this.controls.target.set(0, 0.25, 0);
    }
  }

  /**
   * Rebuilds all pieces cleanly from chess.board() matrix and customization config.
   */
  syncBoard(boardMatrix, customization, moveAnim = null) {
    this.lastBoardMatrix = boardMatrix;
    this.lastCustomization = customization;

    // Handle animated move if supplied and piece exists on origin square
    if (moveAnim && moveAnim.from && moveAnim.to && this.pieceMeshes.has(moveAnim.from)) {
      const movingGroup = this.pieceMeshes.get(moveAnim.from);
      const capturedGroup = this.pieceMeshes.get(moveAnim.to);

      // Capture particle explosion
      if (capturedGroup) {
        const capPos = squareToCoords(moveAnim.to);
        const capColor = capturedGroup.userData.color === 'w' ? '#f8fafc' : '#f43f5e';
        this.spawnCaptureParticles(capPos.x, 0.5, capPos.z, capColor);
        this.piecesGroup.remove(capturedGroup);
        this.pieceMeshes.delete(moveAnim.to);
      }

      // En passant capture removal
      if (moveAnim.enPassantSquare && this.pieceMeshes.has(moveAnim.enPassantSquare)) {
        const epGroup = this.pieceMeshes.get(moveAnim.enPassantSquare);
        const epPos = squareToCoords(moveAnim.enPassantSquare);
        this.spawnCaptureParticles(epPos.x, 0.4, epPos.z, '#fbbf24');
        this.piecesGroup.remove(epGroup);
        this.pieceMeshes.delete(moveAnim.enPassantSquare);
      }

      this.pieceMeshes.delete(moveAnim.from);
      movingGroup.userData.square = moveAnim.to;
      this.pieceMeshes.set(moveAnim.to, movingGroup);

      const destCoords = squareToCoords(moveAnim.to);
      const isKnight = movingGroup.userData.type === 'n';
      const dist = movingGroup.position.distanceTo(new THREE.Vector3(destCoords.x, 0, destCoords.z));
      const wasDragged = movingGroup.position.y > 0.35;
      this.activeAnimations.push({
        group: movingGroup,
        startPos: movingGroup.position.clone(),
        endPos: new THREE.Vector3(destCoords.x, 0, destCoords.z),
        progress: 0,
        duration: wasDragged ? 0.22 : isKnight ? 0.52 : Math.min(0.55, 0.34 + dist * 0.03),
        arcHeight: wasDragged ? 0.18 : isKnight ? 1.65 : 0.42 + dist * 0.06,
        tiltFactor: wasDragged ? 0.04 : 0.14,
        trailColor: capturedGroup ? '#c95b63' : '#c29b61',
        landingColor: capturedGroup ? '#c95b63' : '#c29b61',
        sparkAcc: 0,
        onComplete: () => {
          movingGroup.rotation.set(0, 0, 0);
          if (moveAnim.promotion) {
            this.rebuildAllPieces(boardMatrix, customization);
          }
        },
      });

      // Handle castling rook animation
      if (moveAnim.rookFrom && moveAnim.rookTo && this.pieceMeshes.has(moveAnim.rookFrom)) {
        const rookGroup = this.pieceMeshes.get(moveAnim.rookFrom);
        this.pieceMeshes.delete(moveAnim.rookFrom);
        rookGroup.userData.square = moveAnim.rookTo;
        this.pieceMeshes.set(moveAnim.rookTo, rookGroup);
        const rookDest = squareToCoords(moveAnim.rookTo);
        this.activeAnimations.push({
          group: rookGroup,
          startPos: rookGroup.position.clone(),
          endPos: new THREE.Vector3(rookDest.x, 0, rookDest.z),
          progress: 0,
          duration: 0.48,
          arcHeight: 0.85,
          tiltFactor: 0.1,
          trailColor: '#b89158',
          landingColor: '#b89158',
          sparkAcc: 0,
        });
      }
      return;
    }

    // Full rebuild fallback (new game, undo, customization update, remote FEN sync)
    this.rebuildAllPieces(boardMatrix, customization);
  }

  rebuildAllPieces(boardMatrix, customization) {
    this.lastBoardMatrix = boardMatrix;
    this.lastCustomization = customization;
    this.activeAnimations = [];
    this.fallAnimation = null;
    while (this.piecesGroup.children.length > 0) {
      this.piecesGroup.remove(this.piecesGroup.children[0]);
    }
    this.pieceMeshes.clear();

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = boardMatrix[r][f];
        if (!cell) continue;
        const square = `${FILES[f]}${8 - r}`;
        const pieceCfg = customization?.pieces?.[cell.type];
        const group = buildChessPiece3D(cell.type, cell.color, pieceCfg);
        const { x, z } = squareToCoords(square);
        group.position.set(x, 0, z);
        group.userData.square = square;
        this.piecesGroup.add(group);
        this.pieceMeshes.set(square, group);
      }
    }
  }

  updateHighlights({
    selectedSquare,
    legalMoves = [],
    lastMove = null,
    checkSquare = null,
    hintMove = null,
    kothMode = false,
    threatMap = null,
  }) {
    this.selectedSquare = selectedSquare;
    this.legalMoveTargets.clear();
    for (const mv of legalMoves) {
      this.legalMoveTargets.set(mv.to, mv);
    }
    this.hoveredTargetSquare = null;
    this._clearGhostPreview();

    while (this.markersGroup.children.length > 0) {
      this.markersGroup.remove(this.markersGroup.children[0]);
    }

    // Reset tile emissive tints and ensure non-selected pieces sit cleanly on y = 0
    for (const [sq, mesh] of this.squareMeshes.entries()) {
      mesh.material.emissive.set('#000000');
      mesh.material.emissiveIntensity = 0;

      if (lastMove && (sq === lastMove.from || sq === lastMove.to)) {
        mesh.material.emissive.set('#b89158');
        mesh.material.emissiveIntensity = 0.14;
      }
      if (sq === selectedSquare) {
        mesh.material.emissive.set('#c29b61');
        mesh.material.emissiveIntensity = 0.22;
      }
      if (hintMove && (sq === hintMove.from || sq === hintMove.to)) {
        mesh.material.emissive.set('#6fa889');
        mesh.material.emissiveIntensity = 0.26;
      }
      if (threatMap && threatMap[sq]) {
        const tm = threatMap[sq];
        if (tm === 'danger') {
          mesh.material.emissive.set('#c95b63');
          mesh.material.emissiveIntensity = Math.max(mesh.material.emissiveIntensity, 0.22);
        } else if (tm === 'safe') {
          mesh.material.emissive.set('#5c8a72');
          mesh.material.emissiveIntensity = Math.max(mesh.material.emissiveIntensity, 0.16);
        } else if (tm === 'contested') {
          mesh.material.emissive.set('#b89158');
          mesh.material.emissiveIntensity = Math.max(mesh.material.emissiveIntensity, 0.22);
        }
      }
    }

    // King of the Hill altar highlights (d4, e4, d5, e5)
    if (kothMode) {
      for (const hillSq of ['d4', 'e4', 'd5', 'e5']) {
        const { x, z } = squareToCoords(hillSq);
        const hillPad = new THREE.Mesh(
          new THREE.RingGeometry(0.38, 0.46, 4),
          new THREE.MeshBasicMaterial({ color: '#b89158', side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
        );
        hillPad.rotation.x = -Math.PI / 2;
        hillPad.rotation.z = Math.PI / 4;
        hillPad.position.set(x, 0.012, z);
        this.markersGroup.add(hillPad);
      }
    }

    for (const [sq, pGroup] of this.pieceMeshes.entries()) {
      const isAnimating = this.activeAnimations.some((a) => a.group === pGroup);
      if (!isAnimating && sq !== selectedSquare) {
        pGroup.position.y = 0;
      }
    }

    // Selected square clean bronze perimeter frame
    if (selectedSquare) {
      const originCoords = squareToCoords(selectedSquare);
      const selFrame = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.62, 4),
        new THREE.MeshBasicMaterial({
          color: '#c29b61',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
        })
      );
      selFrame.rotation.x = -Math.PI / 2;
      selFrame.rotation.z = Math.PI / 4;
      selFrame.position.set(originCoords.x, 0.014, originCoords.z);
      this.markersGroup.add(selFrame);
    }

    // Classic sober tactical markers on valid target squares
    legalMoves.forEach((mv) => {
      const dest = squareToCoords(mv.to);
      const isCapture = Boolean(mv.captured);

      if (isCapture) {
        const capPad = new THREE.Mesh(
          new THREE.PlaneGeometry(0.88, 0.88),
          new THREE.MeshBasicMaterial({
            color: '#c95b63',
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        capPad.rotation.x = -Math.PI / 2;
        capPad.position.set(dest.x, 0.008, dest.z);
        this.markersGroup.add(capPad);

        const capRing = new THREE.Mesh(
          new THREE.RingGeometry(0.35, 0.43, 32),
          new THREE.MeshBasicMaterial({
            color: '#c95b63',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.82,
            depthWrite: false,
          })
        );
        capRing.rotation.x = -Math.PI / 2;
        capRing.position.set(dest.x, 0.016, dest.z);
        this.markersGroup.add(capRing);
      } else {
        const dot = new THREE.Mesh(
          new THREE.CircleGeometry(0.14, 24),
          new THREE.MeshBasicMaterial({
            color: '#74a88e',
            transparent: true,
            opacity: 0.68,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(dest.x, 0.014, dest.z);
        this.markersGroup.add(dot);
      }
    });

    // Check alert ring
    if (checkSquare) {
      const { x, z } = squareToCoords(checkSquare);
      const alertRing = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.46, 32),
        new THREE.MeshBasicMaterial({ color: '#b84a54', side: THREE.DoubleSide, transparent: true, opacity: 0.88 })
      );
      alertRing.rotation.x = -Math.PI / 2;
      alertRing.position.set(x, 0.022, z);
      this.markersGroup.add(alertRing);
    }

    // AI Hint arrow
    if (hintMove) {
      const fromC = squareToCoords(hintMove.from);
      const toC = squareToCoords(hintMove.to);
      const dir = new THREE.Vector3(toC.x - fromC.x, 0, toC.z - fromC.z);
      const len = dir.length();
      if (len > 0.01) {
        const arrow = new THREE.ArrowHelper(
          dir.clone().normalize(),
          new THREE.Vector3(fromC.x, 0.24, fromC.z),
          len,
          0x6fa889,
          0.38,
          0.22
        );
        this.markersGroup.add(arrow);
      }
    }
  }

  spawnCaptureParticles(x, y, z, colorHex) {
    const count = 22;
    const geo = this._sharedCaptureGeo;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 1,
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 2.5;
      p.userData.vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.2 + Math.random() * 2.5,
        Math.sin(angle) * speed
      );
      p.userData.life = 0;
      p.userData.maxLife = 0.65;
      this.particlesGroup.add(p);
      this.particles.push(p);
    }
  }

  spawnTrailSpark(x, y, z, colorHex) {
    const geo = this._sharedSparkGeo;
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(x + (Math.random() - 0.5) * 0.16, y + 0.15, z + (Math.random() - 0.5) * 0.16);
    p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 0.35, 0.35 + Math.random() * 0.4, (Math.random() - 0.5) * 0.35);
    p.userData.life = 0;
    p.userData.maxLife = 0.32;
    this.particlesGroup.add(p);
    this.particles.push(p);
  }

  spawnLandingShockwave(x, z, colorHex = '#c29b61') {
    const ring = new THREE.Mesh(
      this._sharedShockwaveGeo,
      new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.022, z);
    ring.userData.life = 0;
    ring.userData.maxLife = 0.42;
    this.effectsGroup.add(ring);
    this.shockwaves.push(ring);
  }

  triggerCheckmateFall(kingSquare) {
    if (!kingSquare || !this.pieceMeshes.has(kingSquare)) return;
    const kingGroup = this.pieceMeshes.get(kingSquare);
    const { x, z } = squareToCoords(kingSquare);
    this.fallAnimation = {
      group: kingGroup,
      progress: 0,
      duration: 0.95,
      targetRotZ: 1.32,
    };
    this.spawnLandingShockwave(x, z, '#b84a54');
    setTimeout(() => this.spawnLandingShockwave(x, z, '#c29b61'), 240);
    // Gentle dramatic camera zoom toward the fallen King
    if (!this.menuOrbit) {
      const zoom = this._getAspectZoomMultiplier();
      this.cameraGoal = {
        pos: new THREE.Vector3(x + 3.4 * zoom, 4.6 * zoom, z + 4.4 * zoom),
        target: new THREE.Vector3(x, 0.3, z),
      };
    }
  }

  _animateLoop() {
    requestAnimationFrame(() => this._animateLoop());
    const dt = Math.min(this._clock.getDelta(), 0.05);
    const elapsed = this._clock.elapsedTime;

    // Smooth camera preset glide or main-menu showcase orbit
    if (this.cameraGoal) {
      this.camera.position.lerp(this.cameraGoal.pos, 0.1);
      this.controls.target.lerp(this.cameraGoal.target, 0.1);
      if (this.camera.position.distanceTo(this.cameraGoal.pos) < 0.06) {
        this.cameraGoal = null;
      }
    } else if (this.menuOrbit) {
      this._menuOrbitAngle += dt * 0.22;
      const radius = 9.6 * this._getAspectZoomMultiplier();
      this.camera.position.set(
        Math.sin(this._menuOrbitAngle) * radius,
        6.2 * this._getAspectZoomMultiplier(),
        Math.cos(this._menuOrbitAngle) * radius
      );
      this.controls.target.set(0, 0.25, 0);
    }

    // Active Hold-and-Drag piece physics & tilt
    if (this.dragState) {
      const drag = this.dragState;
      const g = drag.group;
      const prevX = g.position.x;
      const prevZ = g.position.z;
      g.position.x = THREE.MathUtils.lerp(prevX, drag.targetX, 0.38);
      g.position.z = THREE.MathUtils.lerp(prevZ, drag.targetZ, 0.38);
      g.position.y = THREE.MathUtils.lerp(g.position.y, 0.62 + Math.sin(elapsed * 8) * 0.03, 0.32);

      const vx = (g.position.x - prevX) / Math.max(dt, 0.008);
      const vz = (g.position.z - prevZ) / Math.max(dt, 0.008);
      g.rotation.z = THREE.MathUtils.clamp(-vx * 0.035, -0.35, 0.35);
      g.rotation.x = THREE.MathUtils.clamp(vz * 0.035, -0.35, 0.35);

      drag.sparkAcc += dt;
      if (drag.hasMoved && drag.sparkAcc > 0.045 && LIGHTING_MODES[this.lightingMode]?.showTrailSparks) {
        drag.sparkAcc = 0;
        this.spawnTrailSpark(g.position.x, g.position.y * 0.5, g.position.z, '#c29b61');
      }
    } else if (this.selectedSquare && this.pieceMeshes.has(this.selectedSquare)) {
      // Selected piece gentle hover levitation
      const selPiece = this.pieceMeshes.get(this.selectedSquare);
      const isAnimating = this.activeAnimations.some((a) => a.group === selPiece);
      if (!isAnimating) {
        selPiece.position.y = 0.18 + Math.sin(elapsed * 5.0) * 0.045;
      }
    }

    // Ghost preview gentle bob
    for (const ghost of this.ghostGroup.children) {
      if (ghost.userData.ghostFloat) {
        ghost.position.y = 0.05 + Math.sin(elapsed * 6.0) * 0.03;
      }
    }

    // Active piece move animations with dynamic flight tilt, trail sparks & landing shockwave
    for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
      const anim = this.activeAnimations[i];
      const animDt = anim.firstFrame === false ? dt : 0.016;
      anim.firstFrame = false;
      anim.progress += animDt / anim.duration;
      const t = Math.min(1, anim.progress);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const baseY = THREE.MathUtils.lerp(anim.startPos.y, anim.endPos.y, ease);
      anim.group.position.x = THREE.MathUtils.lerp(anim.startPos.x, anim.endPos.x, ease);
      anim.group.position.z = THREE.MathUtils.lerp(anim.startPos.z, anim.endPos.z, ease);
      anim.group.position.y = baseY + Math.sin(t * Math.PI) * anim.arcHeight;

      const dx = anim.endPos.x - anim.startPos.x;
      const dz = anim.endPos.z - anim.startPos.z;
      const tilt = Math.sin(t * Math.PI) * (anim.tiltFactor ?? 0.12);
      anim.group.rotation.z = THREE.MathUtils.clamp(-dx * tilt, -0.32, 0.32);
      anim.group.rotation.x = THREE.MathUtils.clamp(dz * tilt, -0.32, 0.32);

      anim.sparkAcc = (anim.sparkAcc || 0) + animDt;
      if (anim.sparkAcc > 0.055 && anim.trailColor && LIGHTING_MODES[this.lightingMode]?.showTrailSparks) {
        anim.sparkAcc = 0;
        this.spawnTrailSpark(anim.group.position.x, anim.group.position.y, anim.group.position.z, anim.trailColor);
      }

      if (t >= 1) {
        anim.group.position.copy(anim.endPos);
        anim.group.rotation.set(0, 0, 0);
        this.spawnLandingShockwave(anim.endPos.x, anim.endPos.z, anim.landingColor || '#c29b61');
        this.activeAnimations.splice(i, 1);
        if (anim.onComplete) anim.onComplete();
      }
    }

    // Landing shockwaves expansion
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.userData.life += dt;
      const p = Math.min(1, sw.userData.life / sw.userData.maxLife);
      sw.scale.setScalar(1 + p * 2.1);
      sw.material.opacity = (1 - p) * 0.38;
      if (p >= 1) {
        this.effectsGroup.remove(sw);
        if (sw.geometry !== this._sharedShockwaveGeo) {
          sw.geometry.dispose();
        }
        sw.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    // Animated move markers (beacons, sonar ripples, spinning crosshairs, trajectory orbs)
    for (const marker of this.markersGroup.children) {
      if (marker.userData.spinFloat) {
        const { baseY, amp, phase } = marker.userData.spinFloat;
        marker.position.y = baseY + Math.sin(elapsed * 4.5 + phase) * amp;
        marker.rotation.y += dt * 2.4;
      } else if (marker.userData.pulse) {
        const s = 1 + Math.sin(elapsed * 6) * 0.08;
        marker.scale.set(s, s, 1);
      } else if (marker.userData.spinZ) {
        marker.rotation.z += dt * marker.userData.spinZ;
      } else if (marker.userData.padPulse) {
        const { base, phase } = marker.userData.padPulse;
        marker.material.opacity = base + Math.sin(elapsed * 4.2 + phase) * 0.09;
      } else if (marker.userData.ripple) {
        const t = ((elapsed * 1.15 + marker.userData.ripple.phase) % 1);
        const s = 0.6 + t * 1.75;
        marker.scale.set(s, s, 1);
        marker.material.opacity = (1 - t) * 0.78;
      } else if (marker.userData.pathCurve) {
        const { curve, offset, speed } = marker.userData.pathCurve;
        const u = (elapsed * speed + offset) % 1;
        const pt = curve.getPoint(u);
        marker.position.copy(pt);
        marker.material.opacity = Math.sin(u * Math.PI) * 0.95;
      }
    }

    // Capture particles physics
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life += dt;
      p.userData.vel.y -= 9.2 * dt;
      p.position.addScaledVector(p.userData.vel, dt);
      p.rotation.x += dt * 6;
      p.rotation.y += dt * 5;
      const alpha = Math.max(0, 1 - p.userData.life / p.userData.maxLife);
      p.material.opacity = alpha;
      p.scale.setScalar(Math.max(0.01, alpha));
      if (p.userData.life >= p.userData.maxLife) {
        this.particlesGroup.remove(p);
        p.material?.dispose();
        this.particles.splice(i, 1);
      }
    }

    // Ambient particles slow drift
    for (const pts of this.ambientGroup.children) {
      pts.rotation.y += dt * 0.04;
    }

    // Checkmate fallen king animation
    if (this.fallAnimation) {
      this.fallAnimation.progress = Math.min(1, this.fallAnimation.progress + dt / this.fallAnimation.duration);
      const t = this.fallAnimation.progress;
      const bounceEase = t < 0.75 ? (t / 0.75) * (t / 0.75) : 1 - Math.sin(((t - 0.75) / 0.25) * Math.PI) * 0.06;
      this.fallAnimation.group.rotation.z = bounceEase * this.fallAnimation.targetRotZ;
      this.fallAnimation.group.position.y = Math.sin(t * Math.PI) * 0.08;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
