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
// Raycaster (clicking an addressable B-rep face) and world->screen projection
// (dragging a dimension handle). NEITHER IS BUILT HERE -- this component only
// draws. The face-range map tessellateToThree() returns is threaded through
// to mesh.userData for exactly that future use.
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
import type { ModelDoc } from '../../lib/model-types';
import { topLevel } from '../../lib/model-types';
import { tessellateToThree, type FaceRange } from '../../lib/occt-three';

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

interface Props {
  doc: ModelDoc;
  /** Passed straight through to tessellateToThree() -- see lib/occt-mesh.ts
   *  for what it trades off. Left undefined to take that file's own default. */
  deflection?: number;
  onStats?: (s: BrepViewportStats) => void;
}

/** The handful of kernel exports this component calls, loaded once. Loose
 *  typing throughout -- same trade lib/occt-build.ts documents: a wrong name
 *  fails at the first call instead of silently. */
interface Kernel {
  oc: any;
  buildDoc: (oc: any, doc: ModelDoc, arc?: any) => { shapes: Map<string, any> };
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

/**
 * Renders a ModelDoc through the OpenCascade B-rep kernel, live, in the page,
 * using three.js instead of @jscad/regl-renderer.
 *
 * Face picking and incremental (feature-level) rebuild are NOT here, same
 * scope line BrepViewport.tsx draws: every doc change rebuilds every feature
 * from scratch through lib/occt-build.ts.
 */
export default function BrepViewportThree({ doc, deflection, onStats }: Props) {
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

    renderNow();

    return () => {
      controls.removeEventListener('start', onControlsStart);
      if (dampingRafRef.current !== null) cancelAnimationFrame(dampingRafRef.current);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      solidGroup.traverse((obj) => {
        const mesh = obj as THREE_NS.Mesh;
        mesh.geometry?.dispose?.();
      });
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      solidGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /** Replace the drawn solids and render exactly one frame. Never called from
   *  inside a loop -- see the render-on-demand note above. */
  function drawGeoms(meshed: Array<{ geometry: THREE_NS.BufferGeometry; faces: FaceRange[] }>) {
    const three = threeRef.current;
    const group = solidGroupRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!three || !group || !renderer || !scene || !camera) {
      throw new Error('the three.js scene has not been created yet');
    }
    const { THREE } = three;

    group.traverse((obj) => (obj as THREE_NS.Mesh).geometry?.dispose?.());
    group.clear();

    const material = new THREE.MeshStandardMaterial({
      color: 0xff6600, roughness: 0.6, metalness: 0.1,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x1a1a1a });

    for (const { geometry, faces } of meshed) {
      const mesh = new THREE.Mesh(geometry, material);
      // Threaded through for a future Raycaster-based picker to resolve a hit
      // triangle back to a TopoDS_Face -- not built here, see file header.
      mesh.userData.faceRanges = faces;
      group.add(mesh);

      const edgesGeom = new THREE.EdgesGeometry(geometry, EDGE_THRESHOLD_DEGREES);
      const edges = new THREE.LineSegments(edgesGeom, edgeMaterial);
      mesh.add(edges);
    }

    renderer.render(scene, camera);
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
        .map((f) => built.shapes.get(f.id))
        .filter(Boolean);
      if (shapes.length === 0) {
        // AN EMPTY DOCUMENT IS NOT A FAILURE -- same distinction
        // BrepViewport.tsx draws, for the same reason: /sandbox/ opens on
        // EMPTY_DOC, so without this branch the workspace greets a student
        // with an error before they have done anything. Draw the empty stage
        // (grid + axes already sit in the scene) and report zero.
        if (doc.features.length === 0) {
          const t = performance.now();
          drawGeoms([]);
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
        .map((s) => tessellateToThree(three.THREE, kernel.oc, s, { deflection }))
        .filter((m): m is NonNullable<typeof m> => m !== null);
      const meshMs = performance.now() - t1;
      if (meshed.length === 0) {
        throw new Error('The kernel built a solid, but tessellateToThree() returned nothing drawable for it.');
      }

      const t2 = performance.now();
      drawGeoms(meshed);
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
