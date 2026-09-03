'use client';

// The three.js twin of components/model/BrepViewport.tsx -- same OpenCascade
// kernel, same ModelDoc, same props, a different renderer underneath. Built
// alongside the JSCAD/regl viewport rather than in place of it so the two can
// be measured side by side; see app/brep-three/page.tsx and
// app/brep-test/page.tsx, which run the identical hardcoded document.
//
// WHY THIS EXISTS AT ALL. @jscad/regl-renderer is the last piece of JSCAD
// still in the B-rep path -- lib/occt-mesh.ts exists purely to translate an
// OpenCascade solid into JSCAD's own geom3 shape so that renderer can draw it.
// three.js replaces it, and unlocks two things regl cannot do structurally:
// Raycaster (clicking an addressable B-rep face or edge) and world->screen
// projection (dragging a dimension handle). Only the first is built here --
// world->screen projection is still a future use.
//
// PICKING, IN TWO HALVES. A hover or a click first resolves to a piece of
// three.js geometry (a triangle range for a face, one THREE.Line for an
// edge) -- that half is pure raycasting and lives entirely in this file. The
// SECOND half, turning that geometry back into a stable TopoName the model
// can keep after a rebuild, is deliberately NOT reinvented here: a face uses
// the FaceRange map tessellateToThree() already returns, and an edge uses
// nameEdgeOnCurrentShape() in lib/topo-resolve.ts, the same naming machinery
// a Fillet feature resolves against when it rebuilds -- run backwards, as a
// search, so it answers for an edge on a Move or a Hole's untouched faces
// too, not only a bare primitive. Picking and naming staying two different
// files is what lets naming be tested against arithmetic (see
// topo-resolve.ts's own header) rather than only through a live Raycaster.
//
// EDGE PICKING GEOMETRY IS NOT THE DRAWN SILHOUETTE. The EdgesGeometry lines
// drawGeoms() adds below are a display-only silhouette over the
// TESSELLATION, at a 25-degree normal threshold -- good-looking, and not the
// kernel's own topology (see EDGE_THRESHOLD_DEGREES). A pickable edge has to
// be a real TopoDS_Edge, discretised straight off the B-rep curve, so this
// keeps a SEPARATE, invisible set of THREE.Line objects (see
// lib/occt-three.ts's edgesToThree()) purely for Raycaster to hit.
//
// KERNEL LOADING is copied from BrepViewport.tsx, not imported from it -- that
// file is under a measurement freeze right now (see the task this component
// was written for) and this one needs its own module-level promises anyway,
// since the two components can be mounted on different pages in the same
// session. See BrepViewport.tsx for the long-form reasoning on why the kernel
// is loaded through a runtime-computed import rather than a static one, and
// why that load lives in a module-level (not component-level) promise.

import { useEffect, useRef, useState } from 'react';
import type * as THREE_NS from 'three';
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Feature, ModelDoc } from '../../lib/model-types';
import { topLevel } from '../../lib/model-types';
import { edgeToThreeGeometry, edgesToThree, tessellateToThree, type EdgePick, type FaceRange } from '../../lib/occt-three';
import { nameEdgeOnCurrentShape, resolveName } from '../../lib/topo-resolve';
import type { TopoName } from '../../lib/topo-name';
import type { BuildResult } from '../../lib/occt-build';

const KERNEL_BASE = '/reshape/kernel';

/** The Dracula palette this app already uses everywhere else -- see
 *  app/globals.css and BrepViewport.tsx. */
const COLORS = {
  bg: '#282a36',
  panel: '#21222c',
  line: '#44475a',
  fg: '#f8f8f2',
  dim: '#6272a4',
  ok: '#50fa7b',
  bad: '#ff5555',
  accent: '#bd93f9',
};

export interface BrepViewportStats {
  buildMs: number;
  meshMs: number;
  drawMs: number;
  triangles: number;
}

/**
 * What a click in the viewport landed on.
 *
 * `faceIndex` is a FaceRange.index -- the face's position in the shape's own
 * face walk, stable across camera moves and rebuilds of an unchanged shape
 * (see lib/occt-three.ts). An edge's `name` is null when the edge is real
 * and gets highlighted like any other, but could not be traced back to any
 * primitive -- see nameEdgeOnCurrentShape() in lib/topo-resolve.ts for
 * which edges that covers and which it honestly refuses. The caller can
 * still show it was picked; it just cannot build a Fillet from it.
 */
export type ViewportPick =
  | { kind: 'face'; target: string; faceIndex: number }
  | { kind: 'edge'; target: string; name: TopoName | null };

interface Props {
  doc: ModelDoc;
  /** Passed straight through to tessellateToThree() -- see lib/occt-mesh.ts
   *  for what it trades off. Left undefined to take that file's own default. */
  deflection?: number;
  onStats?: (s: BrepViewportStats) => void;
  /** Fired on every click that lands on the model (a face or an edge), and
   *  on a click that lands on nothing (null, clearing the selection). */
  onPick?: (pick: ViewportPick | null) => void;
  /**
   * The edge selection to keep highlighted, LIFTED rather than kept as
   * internal state, because this component cannot keep it on its own: every
   * doc change throws away every mesh and rebuilds from zero (see the file
   * header), so "the edge the student picked" has to survive as a NAME, not
   * an object reference. Re-resolved against the fresh shape on every
   * rebuild via resolveName() -- the same mechanism a real FilletFeature
   * resolves against. Absent or null both mean nothing is pinned; a face
   * selection has no equivalent prop because nothing outside this component
   * consumes one yet (see the header).
   */
  pick?: { target: string; name: TopoName } | null;
  /**
   * How many shapes are currently selected in the model tree (ModelEditor's
   * own `selected` array, lifted here purely for display) -- rendered as a
   * small "N Selected" badge over the canvas.
   *
   * Cheap, and worth stealing: Chili3D (chili3d.com), the OCCT-in-WASM +
   * three.js reference this viewport is measured against, shows a running
   * count so nobody has to count highlights on screen by eye. 0 or
   * undefined shows nothing -- an empty badge is not information.
   */
  selectedCount?: number;
}

/** The handful of kernel exports this component calls, loaded once. Loose
 *  typing throughout -- same trade lib/occt-build.ts documents: a wrong name
 *  fails at the first call instead of silently. */
interface Kernel {
  oc: any;
  buildDoc: (oc: any, doc: ModelDoc, arc?: any) => BuildResult;
  arc: any;
}

let kernelPromise: Promise<Kernel> | null = null;
/** Which import strategy actually worked, set once on the first successful
 *  load. Purely diagnostic -- see BrepViewport.tsx's own copy of this. */
let kernelImportStrategy: 'webpackIgnore' | 'new-function' | null = null;

/** Import one kernel module by a runtime-computed URL, hidden from webpack's
 *  static analysis. Copied from BrepViewport.tsx -- see that file for the
 *  full account of why two strategies are tried in order. */
async function dynamicImportKernel(path: string): Promise<any> {
  const url = `${KERNEL_BASE}/${path}`;
  if (kernelImportStrategy === 'new-function') {
    return new Function('u', 'return import(u)')(url);
  }
  try {
    const mod = await import(/* webpackIgnore: true */ url as any);
    kernelImportStrategy = 'webpackIgnore';
    // eslint-disable-next-line no-console
    console.info('[BrepViewportThree] kernel import strategy: webpackIgnore', path);
    return mod;
  } catch (e) {
    const mod = await new Function('u', 'return import(u)')(url);
    kernelImportStrategy = 'new-function';
    // eslint-disable-next-line no-console
    console.info('[BrepViewportThree] kernel import strategy: new-function (webpackIgnore failed:', e, ')', path);
    return mod;
  }
}

function loadKernel(): Promise<Kernel> {
  if (!kernelPromise) {
    kernelPromise = (async () => {
      const [replicadMod, buildMod, arcMod] = await Promise.all([
        dynamicImportKernel('replicad_single.js'),
        dynamicImportKernel('occt-build.js'),
        dynamicImportKernel('sketch-arc.js'),
      ]);
      // replicad_single.js's default export is an emscripten factory -- it
      // returns a PROMISE of the initialised module, not the module itself.
      const oc = await replicadMod.default();
      return { oc, buildDoc: buildMod.buildDoc, arc: arcMod };
    })();
  }
  return kernelPromise;
}

/**
 * three.js itself, loaded dynamically so it code-splits out of the main
 * bundle rather than shipping to every page in the app. A REAL import()
 * (three is a real npm dependency, unlike the kernel's static files above) --
 * webpack sees this one and is meant to: that is what makes it a separate
 * chunk instead of an inline one.
 */
let threePromise: Promise<{ THREE: typeof THREE_NS; OrbitControls: typeof OrbitControlsType }> | null = null;
function loadThree() {
  if (!threePromise) {
    threePromise = Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([THREE, controlsMod]) => ({ THREE, OrbitControls: controlsMod.OrbitControls }));
  }
  return threePromise;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** How far a triangle's normal may differ from its neighbor before
 *  EdgesGeometry draws a line there, in degrees. Tuned above three's own
 *  1-degree default so a curved face's own facets (at the 0.3 rad / ~17 degree
 *  ANGULAR tolerance lib/occt-mesh.ts defaults to -- see that file's measured
 *  table) mostly do not draw as edges, while a real corner (a box's 90-degree
 *  faces, a cylinder's cap-to-side seam) still does.
 *
 *  These edges follow the TESSELLATION, not the exact B-rep curve -- a
 *  faceted cylinder's rim is a many-sided polygon, not a circle. An exact
 *  curve would need BRepAdaptor_Curve / Poly_PolygonOnTriangulation, neither
 *  of which is in this app's custom kernel build's 89 bound symbols, and
 *  adding them means rebuilding that kernel, not this renderer. */
const EDGE_THRESHOLD_DEGREES = 25;

/** How fat a hovered/selected edge highlight tube is, in world units --
 *  real geometry, not a screen-space line width (see edgeTubeGeometry()'s
 *  own doc comment for why that distinction is the whole fix). Selected is
 *  thicker than hover on purpose: it is meant to stay the more emphatic of
 *  the two states once both are actually visible, which is a genuine
 *  distinction worth keeping -- not hover being loud enough that it needed
 *  compensating for. Tuned by eye against this app's own primitive sizes
 *  (10-40 unit boxes and cylinders): visible at a glance without reading as
 *  a bigger part of the model than it is. */
const HOVER_EDGE_RADIUS = 0.6;
const SELECTED_EDGE_RADIUS = 0.9;

/**
 * Renders a ModelDoc through the OpenCascade B-rep kernel, live, in the page,
 * using three.js instead of @jscad/regl-renderer.
 *
 * Face picking and incremental (feature-level) rebuild are NOT here, same
 * scope line BrepViewport.tsx draws: every doc change rebuilds every feature
 * from scratch through lib/occt-build.ts.
 */
export default function BrepViewportThree({ doc, deflection, onStats, onPick, pick, selectedCount }: Props) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [loadingNote, setLoadingNote] = useState(
    'loading the modelling kernel + three.js -- the kernel is ~22.9 MB, once per session'
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const kernelRef = useRef<Kernel | null>(null);
  const threeRef = useRef<{ THREE: typeof THREE_NS; OrbitControls: typeof OrbitControlsType } | null>(null);

  /** Created once per mount, on the first successful draw, and reused for
   *  every rebuild after that -- recreating any of this per doc change would
   *  mean a fresh WebGL context (and a fresh camera) on every dimension drag,
   *  the exact per-edit cost this component exists to avoid. */
  const rendererRef = useRef<THREE_NS.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE_NS.Scene | null>(null);
  const cameraRef = useRef<THREE_NS.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControlsType | null>(null);
  /** The current solid(s), as a group, so a rebuild can dispose the old
   *  geometry rather than leaking a WebGL buffer per edit. */
  const solidGroupRef = useRef<THREE_NS.Group | null>(null);
  /** requestAnimationFrame handle for the damping tail after a drag ends.
   *  Null whenever nothing is animating -- see renderOnDemand() below for why
   *  that matters. */
  const dampingRafRef = useRef<number | null>(null);
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;
  // The scene-setup effect below only re-runs on a `phase` change (see its
  // own dep array), so its onClick closure is created ONCE and would
  // otherwise keep reading whatever `doc` was current at that moment --
  // stale the instant the student adds a second feature. nameEdgeOnCurrentShape()
  // needs the CURRENT feature list to enumerate primitive candidates, so it
  // reads this ref, not `doc` directly.
  const docRef = useRef(doc);
  docRef.current = doc;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const pickRef = useRef(pick);
  pickRef.current = pick;

  /** All CURRENT pickable edge lines, flat across every mesh -- rebuilt by
   *  drawGeoms() on every doc change. Flat rather than found by searching
   *  group.children each time, so a raycast can test edges independently of
   *  faces (see hitAt() below) with one intersectObjects() call. */
  const edgePickLinesRef = useRef<THREE_NS.Line[]>([]);
  /** Overlay objects for the four highlight states (hover/selected x
   *  face/edge). Created once, in the scene-setup effect below, and sit
   *  directly on `scene` rather than inside solidGroup -- so a rebuild's
   *  group.clear() (see drawGeoms()) never touches them. They get repointed
   *  at fresh geometry instead of recreated; see paintFaceHighlight() and
   *  restorePicks(). */
  const hoverFaceMeshRef = useRef<THREE_NS.Mesh | null>(null);
  const selectedFaceMeshRef = useRef<THREE_NS.Mesh | null>(null);
  // Edge highlights are TUBE MESHES, not THREE.Line -- see edgeTubeGeometry()'s
  // doc comment for why a line's own width cannot be trusted to be visible.
  const hoverEdgeMeshRef = useRef<THREE_NS.Mesh | null>(null);
  const selectedEdgeMeshRef = useRef<THREE_NS.Mesh | null>(null);
  /** The student's face selection, kept LOCALLY rather than lifted the way
   *  the edge `pick` prop is: nothing outside this component consumes a
   *  picked face yet (see the file header), so there is no TopoName to
   *  resolve it against after a rebuild. Re-applied by feature id +
   *  FaceRange.index instead -- a weaker guarantee than a real name, good
   *  enough for a selection nothing downstream depends on yet. */
  const selectedFaceStateRef = useRef<{ featureId: string; faceIndex: number } | null>(null);
  /** The most recent successful build, cached so a `pick` change ALONE (the
   *  student cleared the selection from the model tree, say, rather than by
   *  clicking the viewport) can re-run restorePicks() without repeating the
   *  actual kernel rebuild -- see the effect below that watches `pick`. */
  const lastBuiltRef = useRef<BuildResult | null>(null);
  const lastMeshesRef = useRef<THREE_NS.Mesh[]>([]);

  // ---- load the kernel + three.js once -------------------------------------
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadKernel(), loadThree()])
      .then(([kernel, three]) => {
        if (cancelled) return;
        kernelRef.current = kernel;
        threeRef.current = three;
        setLoadingNote(`kernel ready (${kernelImportStrategy}) -- ${Object.keys(kernel.oc).length} exports`);
        setPhase('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(String(e?.message ?? e));
        setPhase('error');
      });
    return () => { cancelled = true; };
  }, []);

  // ---- create the scene once the container exists and everything loaded ---
  useEffect(() => {
    const container = containerRef.current;
    const three = threeRef.current;
    if (!container || !three || phase !== 'ready' || rendererRef.current) return;
    const { THREE, OrbitControls } = three;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);

    const camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 5000,
    );
    // Z-up, matching every other view of a ModelDoc in this app (the sketch
    // planes, the JSCAD/regl viewport) -- extrude runs along +Z, not +Y.
    camera.up.set(0, 0, 1);
    camera.position.set(140, 160, 130);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      // WITHOUT this, the drawing buffer clears right after the browser
      // presents each frame, so a headless test reading the canvas back
      // (toDataURL, a pixel sample) sees blank even though the frame the eye
      // saw was correct. Same reasoning, same flag, as BrepViewport.tsx.
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(100, 200, 150);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-120, -80, 60);
    scene.add(ambient, key, fill);

    // Default GridHelper lies in the XZ (y=0) plane -- a Y-up convention.
    // Rotated onto the XY (z=0) plane to match the Z-up scene.
    const grid = new THREE.GridHelper(120, 24, 0x8be9fd, 0x44475a);
    grid.rotation.x = Math.PI / 2;
    (grid.material as THREE_NS.Material).transparent = true;
    (grid.material as THREE_NS.Material).opacity = 0.35;
    scene.add(grid);

    const axes = new THREE.AxesHelper(60);
    scene.add(axes);

    const solidGroup = new THREE.Group();
    scene.add(solidGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    const renderNow = () => renderer.render(scene, camera);

    // RENDER ON DEMAND, not a continuous rAF loop -- this is the point of the
    // move, not a style preference. A loop that repaints on every frame
    // whether or not anything changed is exactly what makes GPU-upload
    // timing unmeasurable, which is why the OLD JSCAD/regl runner (364
    // repaints/sec while idle) could never be timed on draw calls. OrbitControls
    // with damping DOES need per-frame update() calls while it settles after a
    // drag, so the loop below runs ONLY for that tail: each frame calls
    // controls.update() (which returns whether it changed something) and
    // stops scheduling the next frame the moment it returns false. No
    // 'change' listener drives it, because that would restart on every damped
    // frame's own 'change' event, which is the loop this exists to avoid.
    const dampingTick = () => {
      const stillMoving = controls.update();
      renderNow();
      dampingRafRef.current = stillMoving ? requestAnimationFrame(dampingTick) : null;
    };
    const onControlsStart = () => {
      if (dampingRafRef.current === null) dampingRafRef.current = requestAnimationFrame(dampingTick);
    };
    controls.addEventListener('start', onControlsStart);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    solidGroupRef.current = solidGroup;

    // ---- pick highlights ----------------------------------------------------
    // Four persistent objects, mutated on hover/click rather than recreated --
    // allocating a THREE.Mesh on every pointermove is exactly the per-frame
    // cost the render-on-demand design above exists to avoid. All four sit on
    // `scene` directly, not inside `solidGroup`, so they survive a rebuild's
    // group.clear(); drawGeoms() and restorePicks() repoint them at fresh
    // geometry instead.
    const hoverFaceMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color: 0xf1fa8c, transparent: true, opacity: 0.35,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      }),
    );
    hoverFaceMesh.visible = false;
    hoverFaceMesh.renderOrder = 1;
    scene.add(hoverFaceMesh);

    const selectedFaceMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color: 0xff79c6, transparent: true, opacity: 0.5,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      }),
    );
    selectedFaceMesh.visible = false;
    selectedFaceMesh.renderOrder = 1;
    scene.add(selectedFaceMesh);

    // Edges are TUBE MESHES (real geometry, real width -- see
    // edgeTubeGeometry()'s doc comment) rather than THREE.Line, and draw ON
    // TOP (depthTest off) rather than offset like the faces above: a face
    // highlight can ride the same surface it highlights, but an edge
    // highlight sitting exactly on the model's own silhouette z-fights no
    // matter how small an offset is chosen. Cyan for hover, matching this
    // app's own existing "informational" accent (the grid and the Z axis
    // already use it) -- distinct from the model's orange, from selected's
    // pink, and not a copy of any color a competing tool uses for the same
    // state.
    const hoverEdgeMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0x8be9fd, depthTest: false }),
    );
    hoverEdgeMesh.visible = false;
    hoverEdgeMesh.renderOrder = 2;
    scene.add(hoverEdgeMesh);

    const selectedEdgeMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0xff79c6, depthTest: false }),
    );
    selectedEdgeMesh.visible = false;
    selectedEdgeMesh.renderOrder = 2;
    scene.add(selectedEdgeMesh);

    hoverFaceMeshRef.current = hoverFaceMesh;
    selectedFaceMeshRef.current = selectedFaceMesh;
    hoverEdgeMeshRef.current = hoverEdgeMesh;
    selectedEdgeMeshRef.current = selectedEdgeMesh;

    // ---- raycasting -----------------------------------------------------
    const raycaster = new THREE.Raycaster();
    let pendingHoverRaf: number | null = null;
    let lastPointer: { x: number; y: number } | null = null;

    type Hit =
      | { kind: 'face'; mesh: THREE_NS.Mesh; range: FaceRange }
      | { kind: 'edge'; line: THREE_NS.Line };

    function hitAt(clientX: number, clientY: number): Hit | null {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);

      // A world-space threshold has to track how far the camera sits from
      // what it is looking at, or an edge feels grabbable at one zoom level
      // and impossible at another. Onshape's own "pickable slightly before
      // the cursor is exactly on it" is a constant SCREEN distance;
      // scaling by distance-to-target is the closest a world-space
      // threshold can get to that without also reading the camera's FOV and
      // viewport height. 0.006 was tuned by eye against this app's own
      // primitive sizes (10-40 unit boxes and cylinders): generous enough to
      // grab an edge a few pixels early, not so generous that two edges of a
      // small part both claim the same click. The floor keeps a very close
      // camera from shrinking the threshold to nothing.
      const dist = camera.position.distanceTo(controls.target);
      raycaster.params.Line = { threshold: Math.max(0.4, dist * 0.006) };

      // Edges are tested FIRST and win outright on any hit within threshold
      // -- the same "pickable slightly before exact" priority Onshape gives
      // edges over the face behind them.
      const edgeHits = raycaster.intersectObjects(edgePickLinesRef.current, false);
      if (edgeHits.length > 0) return { kind: 'edge', line: edgeHits[0].object as THREE_NS.Line };

      const faceHits = raycaster.intersectObjects(solidGroup.children, false);
      const hit = faceHits.find((h) => h.faceIndex != null);
      if (!hit) return null;
      const range = faceRangeFor(hit.object as THREE_NS.Mesh, hit.faceIndex!);
      return range ? { kind: 'face', mesh: hit.object as THREE_NS.Mesh, range } : null;
    }

    function applyHover(hit: Hit | null) {
      hoverFaceMesh.visible = false;
      hoverEdgeMesh.visible = false;
      // A cheap, immediate second cue: the cursor tells a student an edge or
      // face is interactive before they have even noticed the highlight, or
      // known that picking exists at all. Reverts to the container's own
      // CSS cursor (the inline 'grab' set below, while phase is 'ready')
      // rather than a hardcoded default.
      renderer.domElement.style.cursor = hit ? 'pointer' : '';
      if (!hit) return;
      if (hit.kind === 'face') {
        paintFaceHighlight(THREE, hoverFaceMesh, hit.mesh, hit.range);
      } else {
        const pos = hit.line.geometry.getAttribute('position');
        if (pos) {
          hoverEdgeMesh.geometry.dispose();
          hoverEdgeMesh.geometry = edgeTubeGeometry(THREE, pos.array, HOVER_EDGE_RADIUS);
          hoverEdgeMesh.visible = true;
        }
      }
    }

    function onPointerMove(e: PointerEvent) {
      lastPointer = { x: e.clientX, y: e.clientY };
      // Throttled to the FRAME, not a timer: at most one raycast is ever in
      // flight, and it runs on the very next animation frame -- that is the
      // <16ms bar this was built to hit, and a setTimeout-based throttle
      // cannot promise it.
      if (pendingHoverRaf !== null) return;
      pendingHoverRaf = requestAnimationFrame(() => {
        pendingHoverRaf = null;
        if (!lastPointer) return;
        applyHover(hitAt(lastPointer.x, lastPointer.y));
        renderNow();
      });
    }
    function onPointerLeave() {
      lastPointer = null;
      applyHover(null);
      renderNow();
    }
    function onClick(e: MouseEvent) {
      // Left click only. This app's own navigation convention is right-drag
      // to orbit and left-drag is a deliberate no-op (see HANDOFF.md), so a
      // plain left click never contends with OrbitControls for the gesture.
      if (e.button !== 0) return;
      const hit = hitAt(e.clientX, e.clientY);
      if (!hit) {
        selectedFaceMesh.visible = false;
        selectedEdgeMesh.visible = false;
        selectedFaceStateRef.current = null;
        onPickRef.current?.(null);
        renderNow();
        return;
      }
      if (hit.kind === 'face') {
        const featureId = hit.mesh.userData.featureId as string;
        selectedFaceStateRef.current = { featureId, faceIndex: hit.range.index };
        paintFaceHighlight(THREE, selectedFaceMesh, hit.mesh, hit.range);
        selectedEdgeMesh.visible = false;
        onPickRef.current?.({ kind: 'face', target: featureId, faceIndex: hit.range.index });
      } else {
        const { featureId, kernelEdge } = hit.line.userData as {
          featureId: string; kernelEdge: any;
        };
        // Resolved down to whichever primitive actually produced this edge,
        // however many features (a Move, a Hole, ...) sit on top of it --
        // see nameEdgeOnCurrentShape()'s own doc comment for how, and for
        // why some edges (a fresh wall a Hole drilled, the seam of a
        // Combine) genuinely have no answer and come back null. The edge
        // still gets highlighted either way; only the ability to build a
        // Fillet from it depends on the name. lastBuiltRef holds the most
        // recent BuildResult -- the same one drawGeoms() just drew from --
        // so this never re-runs the kernel build to answer a click.
        const built = lastBuiltRef.current;
        const name = built
          ? nameEdgeOnCurrentShape(kernelRef.current!.oc, built, docRef.current, featureId, kernelEdge)
          : null;
        const pos = hit.line.geometry.getAttribute('position');
        if (pos) {
          selectedEdgeMesh.geometry.dispose();
          selectedEdgeMesh.geometry = edgeTubeGeometry(THREE, pos.array, SELECTED_EDGE_RADIUS);
          selectedEdgeMesh.visible = true;
        }
        selectedFaceMesh.visible = false;
        selectedFaceStateRef.current = null;
        onPickRef.current?.({ kind: 'edge', target: featureId, name });
      }
      renderNow();
    }
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('click', onClick);

    renderNow();

    return () => {
      controls.removeEventListener('start', onControlsStart);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('click', onClick);
      if (pendingHoverRaf !== null) cancelAnimationFrame(pendingHoverRaf);
      if (dampingRafRef.current !== null) cancelAnimationFrame(dampingRafRef.current);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      solidGroup.traverse((obj) => {
        const mesh = obj as THREE_NS.Mesh;
        mesh.geometry?.dispose?.();
      });
      [hoverFaceMesh, selectedFaceMesh, hoverEdgeMesh, selectedEdgeMesh].forEach((obj) => {
        obj.geometry.dispose();
        (obj.material as THREE_NS.Material).dispose();
      });
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      solidGroupRef.current = null;
      hoverFaceMeshRef.current = null;
      selectedFaceMeshRef.current = null;
      hoverEdgeMeshRef.current = null;
      selectedEdgeMeshRef.current = null;
      edgePickLinesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /** Which FaceRange a hit triangle belongs to -- the geometric half of
   *  resolving a Raycaster hit back to a TopoDS_Face. `triangleIndex` is
   *  three.js's own `faceIndex` (the index-BUFFER position divided by 3,
   *  Mesh.raycast()'s own convention), not the FaceRange.index this returns
   *  -- see lib/occt-three.ts for why the two are different numbers. */
  function faceRangeFor(mesh: THREE_NS.Mesh, triangleIndex: number): FaceRange | null {
    const ranges: FaceRange[] = mesh.userData.faceRanges ?? [];
    const bufIdx = triangleIndex * 3;
    return ranges.find((r) => bufIdx >= r.start && bufIdx < r.start + r.count) ?? null;
  }

  /**
   * Paint one face's triangle range into a highlight mesh, by sharing the
   * source mesh's own position/normal attributes (zero-copy -- the same
   * BufferAttribute objects, not clones) and slicing a VIEW of its index
   * buffer down to just this FaceRange.
   *
   * Shared attributes are safe to keep past this call because a highlight
   * mesh's geometry only ever gets REPOINTED, never read after the source it
   * was borrowing from is disposed -- drawGeoms() clears both hover and
   * selection every rebuild before disposing the old meshes, and
   * restorePicks() repaints a persisted selection from the FRESH mesh, not
   * the stale one.
   *
   * Used for hover, for a fresh click, and for restoring a face selection
   * after a rebuild -- see restorePicks().
   */
  function paintFaceHighlight(
    THREE: typeof THREE_NS, target: THREE_NS.Mesh, source: THREE_NS.Mesh, range: FaceRange,
  ) {
    const geom = target.geometry;
    const position = source.geometry.getAttribute('position');
    if (position) geom.setAttribute('position', position);
    const normal = source.geometry.getAttribute('normal');
    if (normal) geom.setAttribute('normal', normal);
    const idx = source.geometry.getIndex();
    if (idx) {
      // tessellateToThree() hands a plain number[] to BufferGeometry.setIndex(),
      // which picks Uint16 or Uint32 for itself depending on the largest
      // value -- so this cannot assume either width and reads it back as `any`.
      const arr: any = idx.array;
      geom.setIndex(new THREE.BufferAttribute(arr.subarray(range.start, range.start + range.count), 1));
    }
    target.visible = true;
  }

  /**
   * Build a tube mesh geometry following an edge's own discretised points
   * exactly -- one straight LineCurve3 per consecutive pair, never a spline
   * fit through them, so the highlight cannot drift from the real curve the
   * way smoothing the same points could.
   *
   * WHY A TUBE, NOT A THICKER LINE. THREE.LineBasicMaterial's `linewidth` is
   * capped at 1px on almost every WebGL platform -- a limitation of the
   * underlying graphics API, not a setting three.js can override. A blind
   * side-by-side against Chili3D measured exactly this: our edge highlight
   * was "confined to a ~7px-wide strip... a subtle colour shift, not a
   * thickness change" and lost on visibility alone even though the
   * hover/selected colours WERE genuinely different. A tube is real 3D
   * geometry with real width in every renderer, not a line-rendering
   * feature that may or may not be honoured.
   */
  function edgeTubeGeometry(
    THREE: typeof THREE_NS, points: ArrayLike<number>, radius: number,
  ): THREE_NS.BufferGeometry {
    const verts: THREE_NS.Vector3[] = [];
    for (let i = 0; i + 2 < points.length; i += 3) {
      verts.push(new THREE.Vector3(points[i], points[i + 1], points[i + 2]));
    }
    if (verts.length < 2) return new THREE.BufferGeometry();
    const path = new THREE.CurvePath<THREE_NS.Vector3>();
    for (let i = 0; i < verts.length - 1; i++) {
      path.add(new THREE.LineCurve3(verts[i], verts[i + 1]));
    }
    return new THREE.TubeGeometry(path, Math.max(2, verts.length * 4), radius, 8, false);
  }

  /** Replace the drawn solids and render exactly one frame. Never called from
   *  inside a loop -- see the render-on-demand note above. Returns the meshes
   *  it created so the caller can re-apply a persisted selection against
   *  them -- see restorePicks(). */
  function drawGeoms(meshed: Array<{
    id: string; kind: Feature['kind']; shape: any;
    geometry: THREE_NS.BufferGeometry; faces: FaceRange[];
  }>): THREE_NS.Mesh[] {
    const three = threeRef.current;
    const kernel = kernelRef.current;
    const group = solidGroupRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const hoverFaceMesh = hoverFaceMeshRef.current;
    const selectedFaceMesh = selectedFaceMeshRef.current;
    const hoverEdgeMesh = hoverEdgeMeshRef.current;
    const selectedEdgeMesh = selectedEdgeMeshRef.current;
    if (!three || !kernel || !group || !renderer || !scene || !camera
      || !hoverFaceMesh || !selectedFaceMesh || !hoverEdgeMesh || !selectedEdgeMesh) {
      throw new Error('the three.js scene has not been created yet');
    }
    const { THREE } = three;

    // Both highlights are hidden BEFORE the meshes they might be borrowing
    // attributes from are disposed below -- a highlight left pointing at a
    // disposed geometry is a stale GPU buffer, not just a stale selection.
    // restorePicks(), called after this returns, is what re-shows the
    // selection against the fresh meshes.
    hoverFaceMesh.visible = false;
    hoverEdgeMesh.visible = false;
    selectedFaceMesh.visible = false;
    selectedEdgeMesh.visible = false;

    group.traverse((obj) => (obj as THREE_NS.Mesh).geometry?.dispose?.());
    group.clear();
    // Every pick line was a child of a mesh just disposed above -- the flat
    // lookup list has to be rebuilt from zero or hitAt() would raycast
    // against geometry belonging to a shape that no longer exists.
    edgePickLinesRef.current = [];

    const material = new THREE.MeshStandardMaterial({
      color: 0xff6600, roughness: 0.6, metalness: 0.1,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
    // Never drawn (every pick line is invisible -- see below), so one shared
    // material for all of them is fine; three.js does not read material
    // state during a raycast.
    const pickLineMaterial = new THREE.LineBasicMaterial();
    const meshes: THREE_NS.Mesh[] = [];

    for (const { id, kind, shape, geometry, faces } of meshed) {
      const mesh = new THREE.Mesh(geometry, material);
      // Threaded through so a raycast hit's triangle resolves back to a
      // TopoDS_Face -- see faceRangeFor() above and lib/occt-three.ts's
      // FaceRange.
      mesh.userData.faceRanges = faces;
      mesh.userData.featureId = id;
      mesh.userData.featureKind = kind;
      mesh.userData.kernelShape = shape;
      group.add(mesh);
      meshes.push(mesh);

      const edgesGeom = new THREE.EdgesGeometry(geometry, EDGE_THRESHOLD_DEGREES);
      const edges = new THREE.LineSegments(edgesGeom, edgeMaterial);
      mesh.add(edges);

      // The PICKABLE edges -- real topology, not the display silhouette
      // above. See the file header for why these have to be a separate set.
      // Invisible on purpose: they exist only for Raycaster to hit, never to
      // be drawn -- three.js does not consult `.visible` during a raycast
      // (confirmed against node_modules/three/src/core/Raycaster.js; no
      // `visible` check exists there), which is exactly what is wanted here.
      for (const { edge, geometry: lineGeom } of edgesToThree(THREE, kernel.oc, shape)) {
        const line = new THREE.Line(lineGeom, pickLineMaterial);
        line.visible = false;
        line.userData.featureId = id;
        line.userData.featureKind = kind;
        line.userData.kernelShape = shape;
        line.userData.kernelEdge = edge;
        mesh.add(line);
        edgePickLinesRef.current.push(line);
      }
    }

    renderer.render(scene, camera);
    return meshes;
  }

  /**
   * Re-apply the persisted selection(s) against FRESH meshes.
   *
   * Runs after every successful drawGeoms() -- a rebuild throws away every
   * mesh (see drawGeoms()), so "the edge is still selected" only survives a
   * dimension edit if this runs every single time, not just once at mount.
   * Also called on its own, without a rebuild, when only the `pick` PROP
   * changes -- see the effect below that watches it.
   */
  function restorePicks(meshes: THREE_NS.Mesh[], built: BuildResult) {
    const three = threeRef.current;
    const kernel = kernelRef.current;
    const selectedEdgeMesh = selectedEdgeMeshRef.current;
    const selectedFaceMesh = selectedFaceMeshRef.current;
    if (!three || !kernel || !selectedEdgeMesh || !selectedFaceMesh) return;
    const { THREE } = three;

    const p = pickRef.current;
    const edge = p ? resolveName(kernel.oc, p.name, built) : null;
    if (edge) {
      // edgeToThreeGeometry() hands back a bare position-only line geometry
      // -- exactly what discretizeEdge() sampled, nothing more -- so its
      // points are read back and rebuilt as a tube rather than assigned to
      // this Mesh directly; a Mesh with no index and only a position
      // attribute renders as garbage triangles, not a line.
      const lineGeom = edgeToThreeGeometry(THREE, kernel.oc, edge);
      const pos = lineGeom.getAttribute('position');
      selectedEdgeMesh.geometry.dispose();
      selectedEdgeMesh.geometry = pos
        ? edgeTubeGeometry(THREE, pos.array, SELECTED_EDGE_RADIUS)
        : new THREE.BufferGeometry();
      lineGeom.dispose();
      selectedEdgeMesh.visible = true;
    } else {
      // Either nothing is picked, or the name no longer resolves -- see
      // whyNameLost() in lib/topo-name.ts for why in words a student can
      // act on. That story is the caller's to tell; this component only
      // stops showing a selection that no longer exists.
      selectedEdgeMesh.visible = false;
    }

    const sel = selectedFaceStateRef.current;
    const mesh = sel ? meshes.find((m) => m.userData.featureId === sel.featureId) : undefined;
    const range = mesh && sel
      ? (mesh.userData.faceRanges as FaceRange[]).find((r) => r.index === sel.faceIndex)
      : undefined;
    if (mesh && range) {
      paintFaceHighlight(THREE, selectedFaceMesh, mesh, range);
    } else {
      selectedFaceMesh.visible = false;
      selectedFaceStateRef.current = null;
    }
  }

  // ---- build + mesh + draw, whenever the doc (or deflection) changes -------
  useEffect(() => {
    if (phase !== 'ready') return;
    const kernel = kernelRef.current;
    const three = threeRef.current;
    if (!kernel || !three || !rendererRef.current) return;
    let cancelled = false;

    try {
      const t0 = performance.now();
      const built = kernel.buildDoc(kernel.oc, doc, kernel.arc);
      const buildMs = performance.now() - t0;

      const shapes = topLevel(doc)
        .map((f) => ({ id: f.id, kind: f.kind, shape: built.shapes.get(f.id) }))
        .filter((s): s is { id: string; kind: Feature['kind']; shape: any } => Boolean(s.shape));
      if (shapes.length === 0) {
        // AN EMPTY DOCUMENT IS NOT A FAILURE -- same distinction
        // BrepViewport.tsx draws, for the same reason: /sandbox/ opens on
        // EMPTY_DOC, so without this branch the workspace greets a student
        // with an error before they have done anything. Draw the empty stage
        // (grid + axes already sit in the scene) and report zero.
        if (doc.features.length === 0) {
          const t = performance.now();
          const meshes = drawGeoms([]);
          lastBuiltRef.current = built;
          lastMeshesRef.current = meshes;
          restorePicks(meshes, built);
          if (cancelled) return;
          setBuildError(null);
          onStatsRef.current?.({
            buildMs: round(buildMs), meshMs: 0, drawMs: round(performance.now() - t), triangles: 0,
          });
          return;
        }
        throw new Error('The document built without error, but nothing came out as a top-level shape.');
      }

      const t1 = performance.now();
      const meshed = shapes
        .map((s) => {
          const m = tessellateToThree(three.THREE, kernel.oc, s.shape, { deflection });
          return m ? { id: s.id, kind: s.kind, shape: s.shape, geometry: m.geometry, faces: m.faces } : null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);
      const meshMs = performance.now() - t1;
      if (meshed.length === 0) {
        throw new Error('The kernel built a solid, but tessellateToThree() returned nothing drawable for it.');
      }

      const t2 = performance.now();
      const meshes = drawGeoms(meshed);
      lastBuiltRef.current = built;
      lastMeshesRef.current = meshes;
      restorePicks(meshes, built);
      const drawMs = performance.now() - t2;

      if (cancelled) return;
      setBuildError(null);
      const triangles = meshed.reduce((n, m) => n + (m.geometry.getIndex()?.count ?? 0) / 3, 0);
      onStatsRef.current?.({
        buildMs: round(buildMs), meshMs: round(meshMs), drawMs: round(drawMs), triangles,
      });
    } catch (e: any) {
      if (!cancelled) setBuildError(String(e?.message ?? e));
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, doc, deflection]);

  // ---- keep the edge highlight in sync when ONLY `pick` changes -------------
  // Clearing a selection from the model tree, or picking a different edge
  // there, changes `pick` without touching `doc` -- and the effect above
  // only re-runs on a doc/deflection change, for the same reason a full
  // kernel rebuild is expensive and a selection change should not pay for
  // one. lastBuiltRef/lastMeshesRef (set at the end of that effect) are what
  // let restorePicks() run here without repeating the build.
  useEffect(() => {
    if (phase !== 'ready' || !lastBuiltRef.current) return;
    restorePicks(lastMeshesRef.current, lastBuiltRef.current);
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (renderer && scene && camera) renderer.render(scene, camera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pick]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 320, background: COLORS.bg }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', touchAction: 'none', cursor: phase === 'ready' ? 'grab' : 'default' }}
      />
      {phase === 'loading' && (
        <div style={overlayStyle}>
          <div style={{ color: COLORS.dim }}>{loadingNote}</div>
        </div>
      )}
      {phase === 'error' && (
        <div style={overlayStyle}>
          <div style={{ color: COLORS.bad, fontWeight: 700, marginBottom: 6 }}>
            The B-rep kernel failed to load.
          </div>
          <div style={{ color: COLORS.fg, maxWidth: 480, textAlign: 'center' }}>{loadError}</div>
        </div>
      )}
      {phase === 'ready' && buildError && (
        <div style={errorPanelStyle}>
          <div style={{ color: COLORS.bad, fontWeight: 700, marginBottom: 4 }}>Could not build this model</div>
          <div style={{ color: COLORS.fg }}>{buildError}</div>
        </div>
      )}
      {phase === 'ready' && !!selectedCount && (
        <div style={selectionBadgeStyle}>{selectedCount} Selected</div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexDirection: 'column', gap: 8, font: '13px ui-monospace, Menlo, Consolas, monospace',
  background: COLORS.bg, pointerEvents: 'none',
};

const errorPanelStyle: React.CSSProperties = {
  position: 'absolute', left: 12, right: 12, bottom: 12, padding: '10px 14px',
  background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 6,
  font: '13px ui-monospace, Menlo, Consolas, monospace', pointerEvents: 'none',
};

// top: 56, not 12 -- Build mode floats a 48px tool ribbon OVER the top of
// this component's own canvas (see HANDOFF.md's "Build floats a 48px ribbon
// over that band"), so a plain top-right corner sits directly under its
// buttons. This clears it while staying a normal top-right badge on every
// OTHER host (app/brep-three/page.tsx has no ribbon at all).
const selectionBadgeStyle: React.CSSProperties = {
  position: 'absolute', top: 56, right: 12, padding: '4px 10px',
  background: COLORS.panel, border: `1px solid ${COLORS.line}`, borderRadius: 999,
  font: '12px ui-monospace, Menlo, Consolas, monospace', color: COLORS.fg, pointerEvents: 'none',
};
