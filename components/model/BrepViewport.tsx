'use client';

// The B-rep kernel, drawn IN THE PAGE, with no iframe.
//
// WHY NO IFRAME. components/ReshapePreview.tsx builds a runner.html URL and
// sets key={runKey}, so every edit is a full iframe navigation -- the browser
// tears the document down and rebuilds it from nothing. That sandbox earns its
// keep there because the runner EXECUTES STUDENT CODE (script mode): an opaque
// origin is the only thing standing between a student's script and the app's
// session cookie. The mouse path is different in kind, not just in cost --
// nothing here runs code the student wrote. Every shape comes from clicking
// toolbar buttons and dragging handles, which this component turns into a
// ModelDoc and hands to lib/occt-build.ts directly. There is nothing to
// sandbox, so the iframe would be pure latency: a full navigation on every
// dimension drag, for zero security benefit. Do not add one back.
//
// WHY THE KERNEL IS LOADED AT RUNTIME, NOT IMPORTED. public/reshape/kernel/ is
// a compiled bundle of plain ES modules -- replicad_single.js (the 21.9 MB
// OpenCascade wasm build), occt-build.js, occt-mesh.js, sketch-arc.js -- served
// as static files, outside the Next build entirely. A `import ... from
// '/reshape/kernel/occt-build.js'` at the top of this file would ask webpack to
// bundle it: at best that duplicates 20+ MB into the app chunk that ships to
// every page; at worst webpack cannot resolve a path outside its module graph
// and the build fails. So the load happens through dynamicImportKernel() below,
// behind a bundler-opaque call it cannot see coming, at the moment this
// component actually mounts.
//
// WHY THE LOAD IS A MODULE-LEVEL PROMISE. Mounting BrepViewport twice in the
// same page (React StrictMode's double-mount in dev, or navigating away from
// /brep-test and back) must not re-fetch and re-instantiate a 21.9 MB wasm
// module a second time. kernelPromise and rendererScriptPromise live outside
// the component so every mount in the same page shares the one in-flight (or
// already-settled) load.

import { useEffect, useRef, useState } from 'react';
import type { ModelDoc } from '../../lib/model-types';
import { topLevel } from '../../lib/model-types';

const KERNEL_BASE = '/reshape/kernel';
const RENDERER_SRC = '/reshape/lib/jscad-regl-renderer.min.js';

/** The Dracula palette this app already uses everywhere else -- see
 *  app/globals.css and components/AuthButton.tsx. */
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
  /** Passed straight through to tessellate() -- see lib/occt-mesh.ts for what
   *  it trades off. Left undefined to take that file's own default. */
  deflection?: number;
  onStats?: (s: BrepViewportStats) => void;
}

/** The handful of kernel exports this component calls, loaded once. `arc` is
 *  lib/sketch-arc.ts's compiled twin (public/reshape/kernel/sketch-arc.js) --
 *  buildDoc() takes it as an optional third argument and needs it for any doc
 *  containing a sketch, extrude, revolve or blend. Loose typing throughout,
 *  same trade lib/occt-build.ts documents: a wrong name fails at the first
 *  call instead of silently. */
interface Kernel {
  oc: any;
  buildDoc: (oc: any, doc: ModelDoc, arc?: any) => { shapes: Map<string, any> };
  tessellate: (oc: any, shape: any, opts?: { deflection?: number; angular?: number }) => any;
  arc: any;
}

let kernelPromise: Promise<Kernel> | null = null;
let rendererScriptPromise: Promise<void> | null = null;
/** Which import strategy actually worked, set once on the first successful
 *  load. Purely diagnostic -- read it from the console if the dynamic-import
 *  trick ever needs re-verifying against a future Next version. */
let kernelImportStrategy: 'webpackIgnore' | 'new-function' | null = null;

/**
 * Import one kernel module by a runtime-computed URL, hidden from webpack's
 * static analysis.
 *
 * TWO STRATEGIES, tried in order, because which one a given Next/webpack
 * version honors is an empirical question and not one this file should
 * guess at silently:
 *
 *   1. `import(/* webpackIgnore: true *\/ url)` -- the documented webpack
 *      escape hatch. It only works if webpack recognizes the magic comment on
 *      a call whose argument is a variable rather than a string literal,
 *      which is not guaranteed across versions.
 *   2. `new Function('u', 'return import(u)')(url)` -- builds the import()
 *      call inside a function created from a STRING at runtime. Webpack's
 *      bundler-time static analysis walks the AST it parses from source; a
 *      dynamic import minted by the Function constructor was never in that
 *      AST; there is nothing for webpack to try to bundle, so this always
 *      falls through to the browser's native import().
 *
 * Measured against this Next 15 static export (see the component's report to
 * the calling agent for which one fired): if strategy 1 already works, 2 is
 * never reached, and vice versa.
 */
async function dynamicImportKernel(path: string): Promise<any> {
  const url = `${KERNEL_BASE}/${path}`;
  if (kernelImportStrategy === 'new-function') {
    return new Function('u', 'return import(u)')(url);
  }
  try {
    const mod = await import(/* webpackIgnore: true */ url as any);
    kernelImportStrategy = 'webpackIgnore';
    // eslint-disable-next-line no-console
    console.info('[BrepViewport] kernel import strategy: webpackIgnore', path);
    return mod;
  } catch (e) {
    const mod = await new Function('u', 'return import(u)')(url);
    kernelImportStrategy = 'new-function';
    // eslint-disable-next-line no-console
    console.info('[BrepViewport] kernel import strategy: new-function (webpackIgnore failed:', e, ')', path);
    return mod;
  }
}

function loadKernel(): Promise<Kernel> {
  if (!kernelPromise) {
    kernelPromise = (async () => {
      const [replicadMod, buildMod, meshMod, arcMod] = await Promise.all([
        dynamicImportKernel('replicad_single.js'),
        dynamicImportKernel('occt-build.js'),
        dynamicImportKernel('occt-mesh.js'),
        dynamicImportKernel('sketch-arc.js'),
      ]);
      // replicad_single.js's default export is an emscripten factory -- it
      // returns a PROMISE of the initialised module, not the module itself.
      // Same call play.html and every other kernel spike in this repo makes.
      const oc = await replicadMod.default();
      return {
        oc,
        buildDoc: buildMod.buildDoc,
        tessellate: meshMod.tessellate,
        arc: arcMod,
      };
    })();
  }
  return kernelPromise;
}

/** Inject the regl renderer's UMD bundle exactly once per page. It attaches
 *  `window.jscadReglRenderer` rather than exporting anything an import
 *  statement could see, so a <script> tag is the only way to load it -- the
 *  same thing runner.html and every kernel spike page in this repo already
 *  does, just done once here instead of once per iframe navigation. */
function loadRendererScript(): Promise<void> {
  if (!rendererScriptPromise) {
    rendererScriptPromise = new Promise((resolve, reject) => {
      if ((window as any).jscadReglRenderer) { resolve(); return; }
      const script = document.createElement('script');
      script.src = RENDERER_SRC;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Could not load ${RENDERER_SRC}`));
      document.head.appendChild(script);
    });
  }
  return rendererScriptPromise;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Renders a ModelDoc through the OpenCascade B-rep kernel, live, in the page.
 *
 * Face picking and incremental (feature-level) rebuild are NOT here -- every
 * doc change rebuilds every feature from scratch through lib/occt-build.ts,
 * same as the JSCAD path does today. That is deliberately out of scope for
 * this piece; see the task this component was written for.
 */
export default function BrepViewport({ doc, deflection, onStats }: Props) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [loadingNote, setLoadingNote] = useState(
    'loading the modelling kernel -- 22.9 MB, once per session'
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const kernelRef = useRef<Kernel | null>(null);
  /** Created once per mount, on the FIRST successful draw, and reused for
   *  every rebuild after that. Recreating prepareRender() per doc change would
   *  mean a fresh WebGL context (and a fresh camera) on every dimension drag,
   *  which is the exact per-edit cost this component exists to remove. */
  const rendererRef = useRef<((args: any) => void) | null>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  /** The last full entity list drawn (grid + axis + solids), so an orbit/pan/
   *  zoom frame can re-render without rebuilding geometry. */
  const entitiesRef = useRef<any[] | null>(null);
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  // ---- load the kernel + renderer once ------------------------------------
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadKernel(), loadRendererScript()])
      .then(([kernel]) => {
        if (cancelled) return;
        kernelRef.current = kernel;
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

  // ---- pointer orbit / wheel zoom -----------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el || phase !== 'ready') return;

    const applyOrbit = (kind: 'rotate' | 'pan' | 'zoom', delta: [number, number] | number) => {
      const R = (window as any).jscadReglRenderer;
      if (!R || !cameraRef.current || !controlsRef.current) return;
      const fn = kind === 'rotate' ? R.controls.orbit.rotate
        : kind === 'pan' ? R.controls.orbit.pan
        : R.controls.orbit.zoom;
      const step1 = fn({ controls: controlsRef.current, camera: cameraRef.current, speed: 1 }, delta as any);
      controlsRef.current = { ...controlsRef.current, ...step1.controls };
      cameraRef.current = { ...cameraRef.current, ...step1.camera };
      const step2 = R.controls.orbit.update({ controls: controlsRef.current, camera: cameraRef.current });
      controlsRef.current = { ...controlsRef.current, ...step2.controls };
      cameraRef.current = { ...cameraRef.current, ...step2.camera };
      renderFrame();
    };

    let dragging = false;
    let panning = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      // Right button (or shift+left) pans; plain left drag orbits -- the same
      // split every CAD-ish viewport in this app already teaches (Onshape:
      // right-drag pans, left-drag rotates).
      panning = e.button === 2 || e.shiftKey;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (panning) applyOrbit('pan', [dx, dy]);
      else applyOrbit('rotate', [dx / 100, dy / 100]);
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      panning = false;
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyOrbit('zoom', e.deltaY / 100);
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', onContextMenu);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('contextmenu', onContextMenu);
    };
  }, [phase]);

  function renderFrame() {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const entities = entitiesRef.current;
    const R = (window as any).jscadReglRenderer;
    if (!renderer || !camera || !entities || !R) return;
    const { drawCommands } = R;
    renderer({
      camera,
      drawCommands: {
        drawAxis: drawCommands.drawAxis,
        drawGrid: drawCommands.drawGrid,
        drawLines: drawCommands.drawLines,
        drawMesh: drawCommands.drawMesh,
      },
      entities,
    });
  }

  /** Create (first call) or reuse (every call after) the regl renderer, then
   *  draw one or more geom3s. */
  function drawGeoms(geoms: any[]) {
    const container = containerRef.current;
    const R = (window as any).jscadReglRenderer;
    if (!container || !R) throw new Error('the renderer script has not loaded');
    const { prepareRender, cameras, controls, entitiesFromSolids } = R;

    if (!rendererRef.current) {
      const camera = Object.assign({}, cameras.perspective.defaults);
      camera.position = [140, 160, 130];
      camera.target = [0, 0, 0];
      camera.up = [0, 0, 1];
      cameras.perspective.setProjection(camera, camera,
        { width: container.clientWidth, height: container.clientHeight });
      cameras.perspective.update(camera, camera);
      cameraRef.current = camera;
      controlsRef.current = Object.assign({}, controls.orbit.defaults);
      rendererRef.current = prepareRender({
        // preserveDrawingBuffer -- WITHOUT it, the WebGL drawing buffer is
        // cleared right after the browser presents each frame, so anything
        // that reads the canvas back afterwards (toDataURL, drawImage, a
        // headless test's pixel sample) sees blank/black even though the
        // frame the user's eye saw was correct. Costs an extra buffer copy
        // per frame, which is irrelevant here: this renders on demand (a
        // rebuild or a drag), never in a continuous animation loop.
        glOptions: { container, attributes: { preserveDrawingBuffer: true } },
        rendering: {
          background: [0.157, 0.164, 0.212, 1], meshColor: [1, 0.4, 0, 1],
          lightDirection: [0.2, 0.2, 1], lightPosition: [100, 200, 100],
          ambientLightAmount: 0.3, diffuseLightAmount: 0.89,
          specularLightAmount: 0.16, materialShininess: 8.0,
        },
      });
    }

    const solids = entitiesFromSolids({ color: [1, 0.4, 0, 1] }, geoms);
    entitiesRef.current = [
      { visuals: { drawCmd: 'drawGrid', show: true, transparent: true },
        size: [120, 120], ticks: [12, 3], color: [1, 1, 1, 0.35], subColor: [0, 1, 1, 0.15] },
      { visuals: { drawCmd: 'drawAxis', show: true }, size: 60, alwaysVisible: true },
      ...solids,
    ];
    renderFrame();
  }

  // ---- build + mesh + draw, whenever the doc (or deflection) changes ------
  useEffect(() => {
    if (phase !== 'ready') return;
    const kernel = kernelRef.current;
    if (!kernel) return;
    let cancelled = false;

    try {
      const t0 = performance.now();
      const built = kernel.buildDoc(kernel.oc, doc, kernel.arc);
      const buildMs = performance.now() - t0;

      const shapes = topLevel(doc)
        .map((f) => built.shapes.get(f.id))
        .filter(Boolean);
      if (shapes.length === 0) {
        // AN EMPTY DOCUMENT IS NOT A FAILURE, and this is the first thing a
        // student sees: /sandbox/ opens on EMPTY_DOC, so without this branch
        // the workspace greets them with a red "Could not build this model"
        // before they have done anything wrong. Draw the empty stage -- grid
        // and axes, the same as the old engine shows -- and report zero.
        //
        // A doc that HAS features and still yields no top-level shape is a
        // real failure and still throws, which is the distinction worth
        // keeping: silence there would hide a broken build.
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
      const geoms = shapes
        .map((s) => kernel.tessellate(kernel.oc, s, { deflection }))
        .filter(Boolean);
      const meshMs = performance.now() - t1;
      if (geoms.length === 0) {
        throw new Error('The kernel built a solid, but tessellate() returned nothing drawable for it.');
      }

      const t2 = performance.now();
      drawGeoms(geoms);
      const drawMs = performance.now() - t2;

      if (cancelled) return;
      setBuildError(null);
      const triangles = geoms.reduce((n, g) => n + g.polygons.length, 0);
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
