import * as THREE from 'three';

/**
 * Procedural CCM digital twin inspired by the classic continuous-casting
 * layout (ladle → tundish → mold → roller bow → run-out), as shown in:
 * https://www.comsol.com/blogs/optimizing-continuous-casting-process-simulation
 * Visual style stays neon / translucent HUD — not photoreal CAD.
 */

export type CcmPartId =
  | 'turret'
  | 'ladle-a'
  | 'ladle-b'
  | 'tundish-car'
  | 'tundish'
  | 'strand-1'
  | 'strand-2'
  | 'casting-line';

export interface CcmPartField {
  label: string;
  value: string;
}

export interface CcmPartInfo {
  id: CcmPartId;
  title: string;
  route: string;
  fields: CcmPartField[];
}

export interface CcmLiveState {
  ladleAFill: number;
  ladleBFill: number;
  /** Which ladle is currently over the tundish. */
  activeLadle: 'a' | 'b';
  pouring: boolean;
  rotating: boolean;
  turretAngleDeg: number;
  tundishFill: number;
  strandSpeeds: [number, number];
}

export const CCM_PART_CATALOG: Record<CcmPartId, CcmPartInfo> = {
  turret: {
    id: 'turret',
    title: 'Ladle Turret',
    route: '/turret',
    fields: [
      { label: 'Angle', value: '0°' },
      { label: 'Mode', value: 'Casting' },
      { label: 'Active arm', value: 'A' },
    ],
  },
  'ladle-a': {
    id: 'ladle-a',
    title: 'Ladle A',
    route: '/ladle/a',
    fields: [
      { label: 'No', value: '1' },
      { label: 'Weight', value: '180 t' },
      { label: 'Temp', value: '1560 °C' },
      { label: 'Fill', value: '72%' },
      { label: 'Status', value: 'Casting' },
    ],
  },
  'ladle-b': {
    id: 'ladle-b',
    title: 'Ladle B',
    route: '/ladle/b',
    fields: [
      { label: 'No', value: '2' },
      { label: 'Weight', value: '165 t' },
      { label: 'Temp', value: '1548 °C' },
      { label: 'Fill', value: '88%' },
      { label: 'Status', value: 'Charging' },
    ],
  },
  'tundish-car': {
    id: 'tundish-car',
    title: 'Tundish Car',
    route: '/tundish-car/1',
    fields: [
      { label: 'Position', value: 'Cast pos' },
      { label: 'Tundish', value: 'TD-1' },
      { label: 'Status', value: 'Ready' },
    ],
  },
  tundish: {
    id: 'tundish',
    title: 'Tundish',
    route: '/tundish/1',
    fields: [
      { label: 'No', value: '1' },
      { label: 'Level', value: '68%' },
      { label: 'Temp', value: '1535 °C' },
      { label: 'Sequence', value: '2/10' },
    ],
  },
  'strand-1': {
    id: 'strand-1',
    title: 'Strand 1',
    route: '/strand/1',
    fields: [
      { label: 'Speed', value: '1.2 m/min' },
      { label: 'Status', value: 'Casting' },
      { label: 'Section', value: '150×150' },
    ],
  },
  'strand-2': {
    id: 'strand-2',
    title: 'Strand 2',
    route: '/strand/2',
    fields: [
      { label: 'Speed', value: '1.15 m/min' },
      { label: 'Status', value: 'Casting' },
      { label: 'Section', value: '150×150' },
    ],
  },
  'casting-line': {
    id: 'casting-line',
    title: 'Casting Line',
    route: '/casting-line',
    fields: [
      { label: 'CCM', value: 'Casting On' },
      { label: 'Heat', value: '92608161' },
      { label: 'Grade', value: '3204' },
    ],
  },
};

const STRUCTURE = 0x0a3d5c;
const STRUCTURE_EMISSIVE = 0x003848;
const EDGE = 0x00e5ff;
const MELT = 0xffb020;
const MELT_EMISSIVE = 0xff8800;
const HIGHLIGHT_EMISSIVE = 0x00e5ff;
const COPPER = 0xb87333;
const COPPER_EMISSIVE = 0x4a2208;

/**
 * Vertical process stack (top → bottom):
 *   Casting ladle → tundish → mold/strand → bow rollers → cut → run-out
 * Twin arms on one axis: CASTING at +Z, CHARGING at -Z (180° swap).
 */
const BOW_RADIUS = 2.0;
const BOW_SEGMENTS = 12;
const RUNOUT_START_Z = BOW_RADIUS + 0.35;
const CUT_Z = RUNOUT_START_Z + 3.2;
const RUNOUT_END_Z = 14;
const ARM_REACH = 5.5;
/**
 * Heights chosen so pour is always downward:
 * ladle nozzle (~mountY−1.55) > tundish lid > SEN tip > mold top > bow > floor
 */
const LADLE_MOUNT_Y = 8.5;
const TUNDISH_Y = 4.9;
const MOLD_TOP_Y = 3.9;
const EMPTY_THRESHOLD = 0.14;
const FULL_REFILL = 0.92;

interface SelectableEntry {
  root: THREE.Object3D;
  meshes: THREE.Mesh[];
  originalEmissive: number[];
  originalOpacity: number[];
}

interface FillController {
  mesh: THREE.Mesh;
  baseY: number;
  height: number;
  setFill: (ratio: number) => void;
}

interface AnimatedBillet {
  mesh: THREE.Mesh;
  strand: number;
  /** Distance along post-cut run-out (0 at torch → end). */
  runout: number;
}

interface SpinRoller {
  /** Child mesh spun around local Y (aligned to roller axle). */
  mesh: THREE.Mesh;
  /** rad/s — sign matches strand travel direction. */
  speed: number;
}

/** Machine flow direction in world space (turret/tundish → run-out). */
export const CASTING_FLOW_DIR = new THREE.Vector3(0, 0, 1);

export interface CcmSceneHandle {
  root: THREE.Group;
  selectables: Map<CcmPartId, SelectableEntry>;
  setHighlight: (id: CcmPartId | null) => void;
  setLiveState: (state: Partial<CcmLiveState>) => void;
  getLiveState: () => CcmLiveState;
  /** World-space anchor used for 3D callout placement. */
  getPartAnchor: (id: CcmPartId) => THREE.Vector3 | null;
  /** Casting flow direction in world space (unit). */
  getFlowDirection: () => THREE.Vector3;
  update: (dt: number) => void;
  dispose: () => void;
}

function structureMat(opacity = 0.55): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: STRUCTURE,
    emissive: STRUCTURE_EMISSIVE,
    emissiveIntensity: 0.35,
    metalness: 0.55,
    roughness: 0.35,
    transparent: true,
    opacity,
    depthWrite: opacity > 0.9,
  });
}

function copperMat(opacity = 0.75): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: COPPER,
    emissive: COPPER_EMISSIVE,
    emissiveIntensity: 0.45,
    metalness: 0.85,
    roughness: 0.25,
    transparent: true,
    opacity,
  });
}

function meltMat(opacity = 0.95): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: MELT,
    emissive: MELT_EMISSIVE,
    emissiveIntensity: 1.4,
    metalness: 0.1,
    roughness: 0.45,
    transparent: true,
    opacity,
  });
}

function addEdges(mesh: THREE.Mesh, color = EDGE, opacity = 0.75): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 22);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  mesh.add(line);
  return line;
}

function markSelectable(obj: THREE.Object3D, id: CcmPartId): void {
  obj.userData['ccmId'] = id;
  obj.traverse((child) => {
    child.userData['ccmId'] = id;
  });
}

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
  });
  return meshes;
}

function makeSelectableEntry(root: THREE.Object3D, id?: CcmPartId): SelectableEntry {
  const meshes = collectMeshes(root).filter((m) => {
    if (m.userData['skipHighlight']) return false;
    if (id && m.userData['ccmId'] !== id) return false;
    return true;
  });
  return {
    root,
    meshes,
    originalEmissive: meshes.map((m) => (m.material as THREE.MeshStandardMaterial).emissiveIntensity ?? 0),
    originalOpacity: meshes.map((m) => (m.material as THREE.MeshStandardMaterial).opacity ?? 1),
  };
}

function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos?: [number, number, number],
  rot?: [number, number, number],
  withEdges = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  if (pos) mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  if (withEdges && mat instanceof THREE.MeshStandardMaterial) addEdges(mesh);
  parent.add(mesh);
  return mesh;
}

function createGridFloor(): THREE.Group {
  const group = new THREE.Group();
  const grid = new THREE.GridHelper(56, 56, 0x00a8b8, 0x003848);
  const mat = grid.material as THREE.Material | THREE.Material[];
  const apply = (m: THREE.Material) => {
    m.transparent = true;
    (m as THREE.Material & { opacity: number }).opacity = 0.4;
  };
  if (Array.isArray(mat)) mat.forEach(apply);
  else apply(mat);
  group.add(grid);

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(52, 52),
    new THREE.MeshStandardMaterial({
      color: 0x000814,
      transparent: true,
      opacity: 0.9,
      roughness: 1,
      metalness: 0,
    }),
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = -0.03;
  group.add(plate);
  return group;
}

/** Industrial ladle: tapered shell, trunnions, lid, long shroud nozzle. */
function createLadle(fillRatio: number): { group: THREE.Group; fill: FillController } {
  const group = new THREE.Group();
  const shell = structureMat(0.58);

  addMesh(group, new THREE.CylinderGeometry(1.35, 1.05, 2.8, 32, 1, true), shell, [0, 1.55, 0]);
  addMesh(group, new THREE.CylinderGeometry(1.05, 0.95, 0.35, 32), structureMat(0.72), [0, 0.2, 0]);
  addMesh(group, new THREE.SphereGeometry(1.02, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), shell, [0, 0.15, 0]);

  // Trunnions (lift pins)
  [-1.45, 1.45].forEach((x) => {
    addMesh(group, new THREE.CylinderGeometry(0.18, 0.18, 0.55, 12), structureMat(0.75), [x, 2.0, 0], [0, 0, Math.PI / 2]);
    addMesh(group, new THREE.BoxGeometry(0.2, 0.55, 0.55), structureMat(0.7), [x * 0.92, 2.0, 0]);
  });

  // Rim + sliding gate cover
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.1, 10, 40), structureMat(0.8));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 2.95;
  group.add(rim);
  addMesh(group, new THREE.CylinderGeometry(1.2, 1.2, 0.14, 28), structureMat(0.7), [0, 3.08, 0]);
  addMesh(group, new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16), structureMat(0.75), [0, 3.25, 0]);

  // Refractory bands
  addMesh(group, new THREE.TorusGeometry(1.22, 0.06, 8, 36), structureMat(0.65), [0, 1.1, 0], [Math.PI / 2, 0, 0], false);
  addMesh(group, new THREE.TorusGeometry(1.28, 0.06, 8, 36), structureMat(0.65), [0, 2.2, 0], [Math.PI / 2, 0, 0], false);

  const fillHeight = 2.35;
  const fillMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.85, fillHeight, 28), meltMat());
  fillMesh.userData['skipHighlight'] = true;
  const fill: FillController = {
    mesh: fillMesh,
    baseY: 0.35,
    height: fillHeight,
    setFill(ratio: number) {
      const r = THREE.MathUtils.clamp(ratio, 0.05, 1);
      fillMesh.scale.y = r;
      fillMesh.position.y = this.baseY + (this.height * r) / 2;
    },
  };
  fill.setFill(fillRatio);
  group.add(fillMesh);

  // Long ladle shroud (into tundish)
  addMesh(group, new THREE.CylinderGeometry(0.16, 0.2, 0.4, 14), structureMat(0.75), [0, -0.05, 0]);
  addMesh(group, new THREE.CylinderGeometry(0.12, 0.14, 1.35, 14), structureMat(0.7), [0, -0.9, 0]);
  addMesh(group, new THREE.CylinderGeometry(0.18, 0.18, 0.12, 14), structureMat(0.8), [0, -1.55, 0]);

  return { group, fill };
}

/**
 * Twin-arm turret on one axis: CASTING (+Z) and CHARGING (−Z).
 * Swap = 180° yaw.
 */
function createTurret(): { base: THREE.Group; rotating: THREE.Group } {
  const base = new THREE.Group();
  addMesh(base, new THREE.CylinderGeometry(2.6, 3.0, 0.7, 40), structureMat(0.72), [0, 0.35, 0]);
  addMesh(base, new THREE.CylinderGeometry(1.35, 1.65, 8.2, 32), structureMat(0.58), [0, 4.5, 0]);
  addMesh(base, new THREE.CylinderGeometry(1.85, 1.85, 0.55, 32), structureMat(0.75), [0, 8.85, 0]);

  addMesh(base, new THREE.BoxGeometry(1.4, 1.3, 1.5), structureMat(0.55), [2.0, 6.2, 0]);
  for (let i = 0; i < 14; i++) {
    addMesh(base, new THREE.BoxGeometry(0.55, 0.06, 0.08), structureMat(0.6), [-1.55, 0.9 + i * 0.55, 1.7], undefined, false);
  }
  addMesh(base, new THREE.BoxGeometry(0.08, 7.4, 0.08), structureMat(0.6), [-1.8, 4.4, 1.7], undefined, false);
  addMesh(base, new THREE.BoxGeometry(0.08, 7.4, 0.08), structureMat(0.6), [-1.3, 4.4, 1.7], undefined, false);

  const rotating = new THREE.Group();
  rotating.name = 'turret-rotating';

  // Single boom on Z axis only (two arms, one axis)
  const boomY = 9.35;
  addMesh(rotating, new THREE.BoxGeometry(1.35, 0.75, ARM_REACH * 2 + 1.6), structureMat(0.62), [0, boomY, 0]);
  addMesh(rotating, new THREE.BoxGeometry(2.4, 0.55, 1.2), structureMat(0.62), [0, boomY, 0]);
  addMesh(rotating, new THREE.CylinderGeometry(1.15, 1.15, 0.55, 24), structureMat(0.75), [0, boomY, 0]);

  const mountCradle = (z: number) => {
    addMesh(rotating, new THREE.BoxGeometry(0.45, 1.9, 0.45), structureMat(0.7), [0, boomY - 0.85, z]);
    addMesh(rotating, new THREE.BoxGeometry(1.9, 0.28, 0.95), structureMat(0.7), [0, boomY - 1.85, z]);
    addMesh(rotating, new THREE.TorusGeometry(0.58, 0.08, 8, 20), structureMat(0.75), [0, boomY - 1.85, z], [Math.PI / 2, 0, 0]);
    addMesh(rotating, new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8), structureMat(0.7), [-0.5, boomY - 2.4, z]);
    addMesh(rotating, new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8), structureMat(0.7), [0.5, boomY - 2.4, z]);
  };
  mountCradle(ARM_REACH); // casting side
  mountCradle(-ARM_REACH); // charging side

  base.add(rotating);
  return { base, rotating };
}

/** Tundish with pouring box, weir, cover plates, dual SEN outlets. */
function createTundish(fillRatio: number): { group: THREE.Group; fill: FillController } {
  const group = new THREE.Group();

  // Main vessel — trapezoid-ish via scaled box walls
  addMesh(group, new THREE.BoxGeometry(6.4, 1.55, 2.7), structureMat(0.48), [0, 0.85, 0]);
  addMesh(group, new THREE.BoxGeometry(5.7, 1.15, 2.15), structureMat(0.22), [0, 0.9, 0], undefined, false);

  // Pouring box (impact pad zone under ladle shroud)
  addMesh(group, new THREE.BoxGeometry(1.8, 1.35, 1.5), structureMat(0.55), [-2.0, 0.95, 0]);
  addMesh(group, new THREE.BoxGeometry(0.12, 1.0, 1.35), structureMat(0.6), [-1.15, 0.9, 0]); // weir

  // Cover plates
  addMesh(group, new THREE.BoxGeometry(2.0, 0.12, 2.5), structureMat(0.65), [-2.0, 1.7, 0]);
  addMesh(group, new THREE.BoxGeometry(3.8, 0.12, 2.5), structureMat(0.55), [1.0, 1.7, 0]);

  // Lift lugs
  [-2.8, 2.8].forEach((x) => {
    addMesh(group, new THREE.BoxGeometry(0.35, 0.55, 0.35), structureMat(0.7), [x, 1.85, 0.9]);
    addMesh(group, new THREE.TorusGeometry(0.18, 0.05, 8, 14), structureMat(0.75), [x, 2.15, 0.9], [0, 0, Math.PI / 2]);
  });

  const fillHeight = 0.95;
  const fillMesh = new THREE.Mesh(new THREE.BoxGeometry(5.3, fillHeight, 1.95), meltMat(0.9));
  fillMesh.userData['skipHighlight'] = true;
  const fill: FillController = {
    mesh: fillMesh,
    baseY: 0.28,
    height: fillHeight,
    setFill(ratio: number) {
      const r = THREE.MathUtils.clamp(ratio, 0.08, 1);
      fillMesh.scale.y = r;
      fillMesh.position.y = this.baseY + (this.height * r) / 2;
    },
  };
  fill.setFill(fillRatio);
  group.add(fillMesh);

  // Submerged entry nozzles (SEN) — short so tip stays above mold
  [-1.35, 1.35].forEach((x) => {
    addMesh(group, new THREE.CylinderGeometry(0.16, 0.2, 0.28, 12), structureMat(0.75), [x, -0.05, 0]);
    addMesh(group, new THREE.CylinderGeometry(0.12, 0.14, 0.55, 12), structureMat(0.7), [x, -0.45, 0]);
  });

  return { group, fill };
}

/** Copper mold + oscillation table frame. */
function createMoldAssembly(): THREE.Group {
  const group = new THREE.Group();

  // Oscillation table
  addMesh(group, new THREE.BoxGeometry(1.6, 0.22, 1.6), structureMat(0.7), [0, 0.15, 0]);
  addMesh(group, new THREE.BoxGeometry(1.85, 0.12, 1.85), structureMat(0.65), [0, -0.05, 0]);

  // Copper mold tube (distinct copper tint)
  const mold = addMesh(group, new THREE.BoxGeometry(0.72, 2.15, 0.72), copperMat(0.8), [0, 1.25, 0]);
  mold.userData['isCopperMold'] = true;

  // Water jacket shell around mold
  addMesh(group, new THREE.BoxGeometry(1.05, 2.0, 1.05), structureMat(0.35), [0, 1.25, 0], undefined, false);
  addMesh(group, new THREE.BoxGeometry(1.2, 0.2, 1.2), structureMat(0.7), [0, 2.4, 0]);

  // Cooling pipes
  [[0.55, 0.55], [0.55, -0.55], [-0.55, 0.55], [-0.55, -0.55]].forEach(([x, z]) => {
    addMesh(group, new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), structureMat(0.6), [x, 1.2, z], undefined, false);
  });

  // Foot rolls under mold
  addMesh(group, new THREE.CylinderGeometry(0.12, 0.12, 0.9, 12), structureMat(0.75), [0, -0.35, 0.35], [0, 0, Math.PI / 2]);
  addMesh(group, new THREE.CylinderGeometry(0.12, 0.12, 0.9, 12), structureMat(0.75), [0, -0.35, -0.35], [0, 0, Math.PI / 2]);

  return group;
}

/**
 * Sample point on caster bow: angle 0 at mold bottom (vertical down),
 * angle π/2 at horizontal run-out start. Center of curvature at (0, bowY, 0)
 * in strand-local space where mold sits above.
 */
function bowPoint(angle: number, bowY: number): THREE.Vector3 {
  // Start going down from mold, curve toward +Z
  const x = 0;
  const y = bowY - BOW_RADIUS * Math.sin(angle);
  const z = BOW_RADIUS * (1 - Math.cos(angle));
  return new THREE.Vector3(x, y, z);
}

function bowTangent(angle: number): THREE.Vector3 {
  // d/dθ of bowPoint
  return new THREE.Vector3(0, -BOW_RADIUS * Math.cos(angle), BOW_RADIUS * Math.sin(angle)).normalize();
}

/** Roller axle = world ±X (out of bow plane); spins around local Y after alignment. */
function addAxleRoller(
  parent: THREE.Object3D,
  position: THREE.Vector3,
  radius: number,
  length: number,
  speed: number,
  rollers: SpinRoller[],
): void {
  const pivot = new THREE.Group();
  pivot.position.copy(position);
  // Local Y → world X (roller axle across strand width)
  pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), structureMat(0.75));
  addEdges(roller, EDGE, 0.45);
  pivot.add(roller);
  parent.add(pivot);
  rollers.push({ mesh: roller, speed });
}

function createStrandMachine(strandIndex: number): {
  group: THREE.Group;
  billets: AnimatedBillet[];
  rollers: SpinRoller[];
  torchFlash: THREE.Mesh;
  moldTopLocal: THREE.Vector3;
  runY: number;
} {
  const group = new THREE.Group();
  const billets: AnimatedBillet[] = [];
  const rollers: SpinRoller[] = [];

  // Compact mold under tundish SEN
  const mold = createMoldAssembly();
  mold.scale.set(0.85, 0.7, 0.85);
  // Unscaled top ≈ 2.4; scaled height ≈ 1.68 → place top at MOLD_TOP_Y
  mold.position.set(0, MOLD_TOP_Y - 1.68, 0.05);
  group.add(mold);

  const moldExitY = MOLD_TOP_Y - 1.55;
  const bowY = moldExitY;
  const runY = bowY - BOW_RADIUS;

  addMesh(group, new THREE.BoxGeometry(0.22, 3.2, 0.22), structureMat(0.55), [0.9, (MOLD_TOP_Y + runY) * 0.5, 1.2]);
  addMesh(group, new THREE.BoxGeometry(0.22, 3.2, 0.22), structureMat(0.55), [-0.9, (MOLD_TOP_Y + runY) * 0.5, 1.2]);

  // Continuous strand tube along bow → cut
  const strandCurve = new THREE.CurvePath<THREE.Vector3>();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= BOW_SEGMENTS; i++) {
    pts.push(bowPoint((i / BOW_SEGMENTS) * (Math.PI / 2), bowY));
  }
  for (let i = 0; i < pts.length - 1; i++) {
    strandCurve.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  }
  strandCurve.add(new THREE.LineCurve3(pts[pts.length - 1], new THREE.Vector3(0, runY, CUT_Z)));

  const strandTube = new THREE.Mesh(new THREE.TubeGeometry(strandCurve, 56, 0.18, 10, false), meltMat(0.78));
  strandTube.userData['skipHighlight'] = true;
  group.add(strandTube);

  // Bow rollers: only lower face (upper rollers removed). Axle along X.
  const bowCenter = new THREE.Vector3(0, bowY, BOW_RADIUS);
  for (let i = 1; i < BOW_SEGMENTS; i++) {
    const a = (i / BOW_SEGMENTS) * (Math.PI / 2);
    const p = bowPoint(a, bowY);
    const inward = bowCenter.clone().sub(p).normalize();
    // −inward = outer/lower side of the strand along the bow
    addAxleRoller(group, p.clone().addScaledVector(inward, -0.4), 0.15, 0.9, -3.4, rollers);
  }

  // Pinch / withdrawal (horizontal run)
  const pinchZ = RUNOUT_START_Z;
  addAxleRoller(group, new THREE.Vector3(0, runY + 0.32, pinchZ), 0.26, 1.05, 3.6, rollers);
  addAxleRoller(group, new THREE.Vector3(0, runY - 0.32, pinchZ), 0.26, 1.05, -3.6, rollers);
  addMesh(group, new THREE.BoxGeometry(1.35, 1.2, 0.65), structureMat(0.55), [0, runY, pinchZ - 0.5]);

  for (let i = 0; i < 5; i++) {
    const z = pinchZ + 0.55 + i * 0.55;
    addAxleRoller(group, new THREE.Vector3(0, runY - 0.02, z), 0.18, 0.95, 3.8, rollers);
  }

  addMesh(group, new THREE.BoxGeometry(0.85, 0.95, 0.38), structureMat(0.65), [0, runY + 0.5, CUT_Z]);
  const torchFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffee88,
      emissive: 0xffaa00,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.15,
    }),
  );
  torchFlash.position.set(0, runY + 0.12, CUT_Z);
  torchFlash.userData['skipHighlight'] = true;
  group.add(torchFlash);

  for (let b = 0; b < 7; b++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.3), meltMat(0.98));
    mesh.userData['skipHighlight'] = true;
    billets.push({ mesh, strand: strandIndex, runout: b * 1.65 });
    mesh.position.set(0, runY, CUT_Z + 0.85 + b * 1.65);
    group.add(mesh);
  }

  return {
    group,
    billets,
    rollers,
    torchFlash,
    moldTopLocal: new THREE.Vector3(0, MOLD_TOP_Y, 0.05),
    runY,
  };
}

function createCastingLine(): {
  group: THREE.Group;
  billets: AnimatedBillet[];
  rollers: SpinRoller[];
  torchFlashes: THREE.Mesh[];
  strandRoots: [THREE.Group, THREE.Group];
  runY: number;
  moldLocalTops: [THREE.Vector3, THREE.Vector3];
} {
  const group = new THREE.Group();
  const billets: AnimatedBillet[] = [];
  const rollers: SpinRoller[] = [];
  const torchFlashes: THREE.Mesh[] = [];
  const moldLocalTops: [THREE.Vector3, THREE.Vector3] = [
    new THREE.Vector3(0, MOLD_TOP_Y, 0.05),
    new THREE.Vector3(0, MOLD_TOP_Y, 0.05),
  ];

  let runY = MOLD_TOP_Y - 2.15 - BOW_RADIUS;
  const bedY = runY - 0.32;
  addMesh(group, new THREE.BoxGeometry(4.4, 0.26, 12), structureMat(0.55), [0, bedY, CUT_Z + 4.8]);

  for (let i = 0; i < 12; i++) {
    const z = CUT_Z + 0.5 + i * 0.9;
    addAxleRoller(group, new THREE.Vector3(0, bedY + 0.26, z), 0.15, 4.0, 2.8, rollers);
  }

  addMesh(group, new THREE.BoxGeometry(0.12, 0.4, 11), structureMat(0.5), [-2.05, bedY + 0.35, CUT_Z + 4.5]);
  addMesh(group, new THREE.BoxGeometry(0.12, 0.4, 11), structureMat(0.5), [2.05, bedY + 0.35, CUT_Z + 4.5]);

  const strandRoots: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  // Under tundish SEN positions (±1.35)
  strandRoots[0].position.set(-1.35, 0, 0);
  strandRoots[1].position.set(1.35, 0, 0);

  strandRoots.forEach((strand, idx) => {
    const built = createStrandMachine(idx);
    runY = built.runY;
    billets.push(...built.billets);
    rollers.push(...built.rollers);
    torchFlashes.push(built.torchFlash);
    moldLocalTops[idx] = built.moldTopLocal.clone();
    strand.add(built.group);
    group.add(strand);
  });

  return { group, billets, rollers, torchFlashes, strandRoots, runY, moldLocalTops };
}

/**
 * Position a cylinder spanning `from` → `to`.
 * Always draws top→bottom: if caller swapped ends, we correct by Y.
 */
function alignFlow(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3): void {
  let a = from;
  let b = to;
  if (a.y < b.y) {
    a = to;
    b = from;
  }
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 0.05) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  mesh.position.copy(mid);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
}

function createFlowStream(radius = 0.09): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.85, radius, 1, 12), meltMat(0.92));
  mesh.userData['skipHighlight'] = true;
  mesh.userData['isFlow'] = true;
  return mesh;
}

function createMeltDroplets(count: number): THREE.Mesh[] {
  const drops: THREE.Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), meltMat(0.95));
    d.userData['skipHighlight'] = true;
    d.userData['dropT'] = i / count;
    drops.push(d);
  }
  return drops;
}

function placeDroplets(drops: THREE.Mesh[], from: THREE.Vector3, to: THREE.Vector3, time: number): void {
  // Always fall top → bottom
  const top = from.y >= to.y ? from : to;
  const bottom = from.y >= to.y ? to : from;
  const dir = bottom.clone().sub(top);
  drops.forEach((d) => {
    const t = (d.userData['dropT'] + time * 0.45) % 1;
    d.position.copy(top).addScaledVector(dir, t);
    // slight outward splash, never upward against gravity
    d.position.x += Math.sin(t * Math.PI * 2) * 0.04;
    const s = 0.65 + (1 - t) * 0.45;
    d.scale.setScalar(s);
  });
}

export function createCcmScene(initial?: Partial<CcmLiveState>): CcmSceneHandle {
  const state: CcmLiveState = {
    ladleAFill: initial?.ladleAFill ?? 0.78,
    ladleBFill: initial?.ladleBFill ?? 0.88,
    activeLadle: initial?.activeLadle ?? 'a',
    pouring: initial?.pouring ?? true,
    rotating: false,
    turretAngleDeg: 0,
    tundishFill: initial?.tundishFill ?? 0.68,
    strandSpeeds: initial?.strandSpeeds ?? [1.2, 1.15],
  };

  const root = new THREE.Group();
  root.name = 'ccm-root';
  root.add(createGridFloor());

  const selectables = new Map<CcmPartId, SelectableEntry>();

  // Turret centered so casting seat (+Z) sits over tundish
  const turretParts = createTurret();
  const turretRoot = new THREE.Group();
  turretRoot.add(turretParts.base);
  turretRoot.position.set(0, 0, 0);
  // Mark structure first; ladles overwrite their own ccmId after parenting.
  markSelectable(turretParts.base, 'turret');
  markSelectable(turretParts.rotating, 'turret');
  root.add(turretRoot);

  // A = CASTING arm (+Z), B = CHARGING arm (−Z) — same axis
  const ladleA = createLadle(state.ladleAFill);
  ladleA.group.position.set(0, LADLE_MOUNT_Y, ARM_REACH);
  turretParts.rotating.add(ladleA.group);
  markSelectable(ladleA.group, 'ladle-a');
  selectables.set('ladle-a', makeSelectableEntry(ladleA.group, 'ladle-a'));

  const ladleB = createLadle(state.ladleBFill);
  ladleB.group.position.set(0, LADLE_MOUNT_Y, -ARM_REACH);
  turretParts.rotating.add(ladleB.group);
  markSelectable(ladleB.group, 'ladle-b');
  selectables.set('ladle-b', makeSelectableEntry(ladleB.group, 'ladle-b'));

  selectables.set('turret', makeSelectableEntry(turretRoot, 'turret'));

  // Tundish directly under casting ladle (+Z), above strands (no tundish car)
  const tundish = createTundish(state.tundishFill);
  tundish.group.position.set(0, TUNDISH_Y, ARM_REACH);
  markSelectable(tundish.group, 'tundish');
  root.add(tundish.group);
  selectables.set('tundish', makeSelectableEntry(tundish.group));

  // Strands / molds under tundish (same Z as casting seat)
  const casting = createCastingLine();
  casting.group.position.set(0, 0, ARM_REACH);
  root.add(casting.group);

  markSelectable(casting.strandRoots[0], 'strand-1');
  markSelectable(casting.strandRoots[1], 'strand-2');
  selectables.set('strand-1', makeSelectableEntry(casting.strandRoots[0]));
  selectables.set('strand-2', makeSelectableEntry(casting.strandRoots[1]));

  const lineMeshes: THREE.Mesh[] = [];
  casting.group.children.forEach((child) => {
    if (casting.strandRoots.includes(child as THREE.Group)) return;
    child.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && !mesh.userData['skipHighlight']) {
        mesh.userData['ccmId'] = 'casting-line';
        lineMeshes.push(mesh);
      }
    });
  });
  selectables.set('casting-line', {
    root: casting.group,
    meshes: lineMeshes,
    originalEmissive: lineMeshes.map(
      (m) => (m.material as THREE.MeshStandardMaterial).emissiveIntensity ?? 0.35,
    ),
    originalOpacity: lineMeshes.map(
      (m) => (m.material as THREE.MeshStandardMaterial).opacity ?? 0.55,
    ),
  });

  // Melt flows
  const ladleFlow = createFlowStream(0.11);
  root.add(ladleFlow);
  const ladleDrops = createMeltDroplets(10);
  ladleDrops.forEach((d) => root.add(d));

  const tundishFlows = [createFlowStream(0.08), createFlowStream(0.08)];
  tundishFlows.forEach((f) => root.add(f));
  const tundishDropSets = [createMeltDroplets(7), createMeltDroplets(7)];
  tundishDropSets.forEach((set) => set.forEach((d) => root.add(d)));

  const tmpFrom = new THREE.Vector3();
  const tmpTo = new THREE.Vector3();
  const senLocals = [new THREE.Vector3(-1.35, -0.72, 0), new THREE.Vector3(1.35, -0.72, 0)];

  let highlighted: CcmPartId | null = null;
  let pulse = 0;
  let cutTimer = 0;
  let yaw = 0;
  let yawTarget = 0;
  let steps = 0; // number of 180° swaps

  const setHighlight = (id: CcmPartId | null) => {
    if (highlighted === id) return;
    if (highlighted) {
      const prev = selectables.get(highlighted);
      prev?.meshes.forEach((mesh, i) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mesh.userData['skipHighlight']) return;
        mat.emissiveIntensity = prev.originalEmissive[i] ?? 0.35;
        mat.opacity = prev.originalOpacity[i] ?? 0.55;
        if (mat.emissive.getHex() === HIGHLIGHT_EMISSIVE) {
          mat.emissive.setHex(mesh.userData['isCopperMold'] ? COPPER_EMISSIVE : STRUCTURE_EMISSIVE);
        }
      });
    }
    highlighted = id;
    if (!id) return;
    const next = selectables.get(id);
    next?.meshes.forEach((mesh) => {
      if (mesh.userData['skipHighlight']) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(HIGHLIGHT_EMISSIVE);
      mat.emissiveIntensity = 1.15;
      mat.opacity = Math.min(0.92, (mat.opacity || 0.55) + 0.25);
    });
  };

  const syncCatalogStatus = () => {
    const aCasting = state.activeLadle === 'a' && !state.rotating;
    const bCasting = state.activeLadle === 'b' && !state.rotating;
    CCM_PART_CATALOG['ladle-a'].fields = CCM_PART_CATALOG['ladle-a'].fields.map((f) =>
      f.label === 'Status'
        ? {
            ...f,
            value: state.rotating ? 'Indexing' : aCasting ? (state.pouring ? 'Casting' : 'Casting') : 'Charging',
          }
        : f,
    );
    CCM_PART_CATALOG['ladle-b'].fields = CCM_PART_CATALOG['ladle-b'].fields.map((f) =>
      f.label === 'Status'
        ? {
            ...f,
            value: state.rotating ? 'Indexing' : bCasting ? (state.pouring ? 'Casting' : 'Casting') : 'Charging',
          }
        : f,
    );
    CCM_PART_CATALOG.turret.fields = CCM_PART_CATALOG.turret.fields.map((f) => {
      if (f.label === 'Angle') return { ...f, value: `${Math.round(state.turretAngleDeg)}°` };
      if (f.label === 'Active arm') return { ...f, value: state.activeLadle.toUpperCase() };
      if (f.label === 'Mode') return { ...f, value: state.rotating ? 'Rotating 180°' : 'Casting' };
      return f;
    });
  };

  const setLiveState = (partial: Partial<CcmLiveState>) => {
    Object.assign(state, partial);
    if (partial.ladleAFill != null) ladleA.fill.setFill(partial.ladleAFill);
    if (partial.ladleBFill != null) ladleB.fill.setFill(partial.ladleBFill);
    if (partial.tundishFill != null) tundish.fill.setFill(partial.tundishFill);
    syncCatalogStatus();
  };

  setLiveState(state);

  const getLiveState = () => ({
    ...state,
    strandSpeeds: [...state.strandSpeeds] as [number, number],
  });

  const _anchor = new THREE.Vector3();
  const getPartAnchor = (id: CcmPartId): THREE.Vector3 | null => {
    const entry = selectables.get(id);
    if (!entry) return null;
    // Prefer mesh bounds center for a stable HUD pin
    if (entry.meshes.length > 0) {
      const box = new THREE.Box3();
      entry.meshes.forEach((m) => box.expandByObject(m));
      if (!box.isEmpty()) return box.getCenter(_anchor).clone();
    }
    entry.root.getWorldPosition(_anchor);
    return _anchor.clone();
  };

  const getFlowDirection = () => new THREE.Vector3(0, 0, 1);

  const update = (dt: number) => {
    pulse += dt;
    cutTimer += dt;
    const glow = 0.85 + Math.sin(pulse * 3.5) * 0.3;

    // --- Turret 180° swap when casting ladle empties ---
    if (!state.rotating && state.pouring) {
      const fill = state.activeLadle === 'a' ? state.ladleAFill : state.ladleBFill;
      if (fill <= EMPTY_THRESHOLD) {
        state.pouring = false;
        state.rotating = true;
        yawTarget = yaw + Math.PI;
        steps += 1;
      } else {
        const next = Math.max(EMPTY_THRESHOLD - 0.01, fill - dt * 0.045);
        if (state.activeLadle === 'a') {
          state.ladleAFill = next;
          ladleA.fill.setFill(next);
        } else {
          state.ladleBFill = next;
          ladleB.fill.setFill(next);
        }
        state.tundishFill = THREE.MathUtils.clamp(
          state.tundishFill + (0.72 - state.tundishFill) * dt * 0.4,
          0.35,
          0.92,
        );
        tundish.fill.setFill(state.tundishFill);
      }
    }

    if (state.rotating) {
      const speed = 0.85;
      const remaining = yawTarget - yaw;
      const step = Math.sign(remaining) * Math.min(Math.abs(remaining), speed * dt);
      yaw += step;
      turretParts.rotating.rotation.y = yaw;
      state.turretAngleDeg = ((THREE.MathUtils.radToDeg(yaw) % 360) + 360) % 360;
      if (Math.abs(yawTarget - yaw) < 0.012) {
        yaw = yawTarget;
        turretParts.rotating.rotation.y = yaw;
        state.rotating = false;
        state.activeLadle = steps % 2 === 1 ? 'b' : 'a';
        if (state.activeLadle === 'b') {
          state.ladleAFill = FULL_REFILL;
          ladleA.fill.setFill(FULL_REFILL);
        } else {
          state.ladleBFill = FULL_REFILL;
          ladleB.fill.setFill(FULL_REFILL);
        }
        state.pouring = true;
        state.turretAngleDeg = ((THREE.MathUtils.radToDeg(yaw) % 360) + 360) % 360;
        syncCatalogStatus();
      }
    } else {
      syncCatalogStatus();
    }

    // --- Ladle nozzle (high) → tundish lid (lower) ---
    const activeGroup = state.activeLadle === 'a' ? ladleA.group : ladleB.group;
    activeGroup.getWorldPosition(tmpFrom);
    tmpFrom.y -= 1.55; // shroud tip

    tundish.group.getWorldPosition(tmpTo);
    tmpTo.y += 1.55; // lid / pouring-box top

    const showLadlePour = state.pouring && !state.rotating && tmpFrom.y > tmpTo.y;
    ladleFlow.visible = showLadlePour;
    ladleDrops.forEach((d) => (d.visible = showLadlePour));
    if (showLadlePour) {
      alignFlow(ladleFlow, tmpFrom, tmpTo);
      (ladleFlow.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 * glow;
      placeDroplets(ladleDrops, tmpFrom, tmpTo, pulse);
    }

    // --- Tundish SEN (high) → mold top (lower) ---
    const showStrandPour = !state.rotating;
    tundishFlows.forEach((flow, i) => {
      tundish.group.getWorldPosition(tmpFrom);
      tmpFrom.add(senLocals[i]);

      casting.strandRoots[i].localToWorld(tmpTo.copy(casting.moldLocalTops[i]));

      const ok = showStrandPour && tmpFrom.y > tmpTo.y;
      flow.visible = ok;
      tundishDropSets[i].forEach((d) => (d.visible = ok));
      if (!ok) return;

      alignFlow(flow, tmpFrom, tmpTo);
      (flow.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.3 * glow;
      placeDroplets(tundishDropSets[i], tmpFrom, tmpTo, pulse + i * 0.2);
    });

    if (showStrandPour && !state.pouring) {
      state.tundishFill = Math.max(0.35, state.tundishFill - dt * 0.02);
      tundish.fill.setFill(state.tundishFill);
    }

    // --- Rollers spin on axle (local Y) in strand travel direction ---
    casting.rollers.forEach((r) => {
      r.mesh.rotation.y += r.speed * dt;
    });

    // --- Torch cut flash + billets after cut meterage ---
    const cutting = cutTimer % 2.2 < 0.28;
    casting.torchFlashes.forEach((flash) => {
      const mat = flash.material as THREE.MeshStandardMaterial;
      mat.opacity = cutting ? 0.85 : 0.12;
      mat.emissiveIntensity = cutting ? 4 : 0.6;
      flash.scale.setScalar(cutting ? 1.4 : 0.7);
    });

    casting.billets.forEach((billet) => {
      const speed = (state.strandSpeeds[billet.strand] ?? 1) * 0.85;
      billet.runout += speed * dt;
      const maxRun = RUNOUT_END_Z - CUT_Z;
      if (billet.runout > maxRun) billet.runout = 0.2;
      billet.mesh.position.set(0, casting.runY, CUT_Z + 0.85 + billet.runout);
    });
  };

  const dispose = () => {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else (mesh.material as THREE.Material).dispose();
      }
    });
  };

  return {
    root,
    selectables,
    setHighlight,
    setLiveState,
    getLiveState,
    getPartAnchor,
    getFlowDirection,
    update,
    dispose,
  };
}
