'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// SketchCanvas2D (SPEC-sketcher2 §7): the FreeCAD-style 2D sketcher over the
// kernel's warm sketch session. An SVG canvas -- every committed row drawn in
// soup coordinates, Y-up, with the flip to SVG's Y-down applied at write time
// (svgY = -y) exactly as the archived engine/play/sketch.js did.
//
// The component holds NO geometry state of its own beyond tool state: the rows
// live on the SketchFeature (geoms/rules), the solved coordinates live in the
// SketchSession2D parameter vector, and every edit is one onChange(doc) so the
// studio's undo records exactly one entry per gesture. Decision logic lives in
// sketch-canvas-core.ts (pure, test-proven); this file only calls it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { angleInArcRange, arcEnds, arcFromClicks, distToCircleStroke, distToSegment, inferLineConstraint, namedPointsOf, nextGeomId, pointWorld, readSolved, renumber, sampleArc, snapAxis, slotRows, arcAngles, toggleConstruction, trimLine, trimPick, splitWeldedCircles, mirrorSelection, copySelection, densifyIds, } from './sketch-canvas-core.js';
import { pointSlots } from '@shuff57/reshape-kernel/sketch-session';
const SNAP_PX = 8;
const HIT_PX = 6;
const AXIS_TOL_DEG = 4;
/** mm of sketch plane visible around the origin, both axes. */
const VIEW = 100;
export default function SketchCanvas2D({ sketch, doc, onChange, onExit }) {
    const svgRef = useRef(null);
    const [tool, setTool] = useState('line');
    const [chain, setChain] = useState(null);
    const [clicks, setClicks] = useState([]);
    const [sel, setSel] = useState([]);
    const [auto, setAuto] = useState(true);
    const [pointer, setPointer] = useState(null);
    const [hoverSnap, setHoverSnap] = useState(null);
    const [dim, setDim] = useState(null);
    const [status, setStatus] = useState('');
    // The rows as the doc carries them (soup or migrated from the legacy
    // polygon -- a legacy sketch's points arrive as soup rows the first time
    // this canvas opens it).
    const geoms = useMemo(() => {
        const own = sketch.geoms ?? sketch.geom;
        if (own)
            return own;
        if (!sketch.points?.length)
            return [];
        if (sketch.shape === 'circle' && sketch.points.length === 2) {
            const [a, b] = sketch.points;
            return [{ k: 'circle', id: 1, c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], r: Math.hypot(b[0] - a[0], b[1] - a[1]) / 2 }];
        }
        return sketch.points.map((p, i) => ({
            k: 'line',
            id: i + 1,
            a: p,
            b: sketch.points[(i + 1) % sketch.points.length],
        }));
    }, [sketch]);
    // Legacy bulges/rounds migrate to plain straight edges in v1: outlineOf()
    // would need the fillet basis machinery to place true arcs, and a legacy
    // rounded polygon is rare; the straight-edge soup still round-trips.
    const rules = useMemo(() => sketch.rules ?? [], [sketch]);
    // --- the session (wasm, warm) ------------------------------------------------
    const sessionRef = useRef(null);
    const [solved, setSolved] = useState([]);
    const [diagnosis, setDiagnosis] = useState(null);
    const rafRef = useRef(null);
    const pendingDrag = useRef(null);
    const writeDoc = useCallback((rawGeoms, rawRules) => {
        // Circle-in-mixed-wire canonicalization (kernel §5.3.10's own advice,
        // applied mechanically): a circle welded to lines by 2 tangencies
        // becomes an arc pair split at the contact points, so wire discovery
        // walks it like any other curve. Sketches without such a circle pass
        // through untouched.
        const split = splitWeldedCircles(rawGeoms, rawRules);
        const nextGeoms = split.geoms;
        const nextRules = split.rules;
        onChange({
            ...doc,
            features: doc.features.map((f) => f.id === sketch.id ? { ...f, geoms: nextGeoms, geom: nextGeoms, rules: nextRules } : f),
        });
    }, [onChange, doc, sketch.id]);
    // Write the migrated soup ONCE: without this, the doc keeps carrying only
    // `points` and every canvas edit would re-migrate (and any rows the canvas
    // had already added would collide with the polygon). One onChange = one
    // undo entry for the migration itself.
    const wroteMigration = useRef(false);
    useEffect(() => {
        if (wroteMigration.current)
            return;
        if (sketch.geoms || sketch.geom || !geoms.length) {
            wroteMigration.current = true;
            return;
        }
        wroteMigration.current = true;
        writeDoc(geoms, []);
    }, [geoms, sketch.geoms, sketch.geom, writeDoc]);
    // Open + solve whenever the rows change; the session is a function of them.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            // One session, one load: StrictMode double-invokes effects, and the
            // second invoke must WAIT for the first one's load() instead of
            // calling open() on an un-initialised module (the race the dogfood run
            // caught). load() resolves immediately once this.wasm is set.
            if (!sessionRef.current) {
                const { SketchSession2D } = await import('@shuff57/reshape-kernel/sketch-session');
                const s = new SketchSession2D();
                sessionRef.current = s;
                await s.load();
            }
            else {
                await sessionRef.current.load();
            }
            const s = sessionRef.current;
            if (cancelled)
                return;
            const err = s.open(geoms, rules);
            if (err) {
                setStatus(err);
                setDiagnosis(null);
                return;
            }
            if (!s.solve()) {
                setStatus(s.lastError() ?? 'the sketch did not solve');
            }
            else {
                setStatus('');
            }
            setDiagnosis(s.diagnose());
            setSolved(readSolved(geoms, s.params));
        })();
        return () => {
            cancelled = true;
        };
    }, [geoms, rules]);
    // --- coordinate mapping ------------------------------------------------------
    const view = useMemo(() => `${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`, []);
    const worldFromEvent = useCallback((e) => {
        const svg = svgRef.current;
        if (!svg)
            return { x: 0, y: 0 };
        const ctm = svg.getScreenCTM();
        if (!ctm)
            return { x: 0, y: 0 };
        // DOMPoint is fine in every browser this app ships to; the polyfill note
        // in HandleOverlay covers the one Safari revision that needed it.
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        return { x: p.x, y: -p.y };
    }, []);
    const screenFromWorld = useCallback((p) => {
        const svg = svgRef.current;
        if (!svg)
            return { x: 0, y: 0 };
        const ctm = svg.getScreenCTM();
        if (!ctm)
            return { x: 0, y: 0 };
        const q = new DOMPoint(p.x, -p.y).matrixTransform(ctm);
        return { x: q.x, y: q.y };
    }, []);
    // --- tool plumbing -----------------------------------------------------------
    const findSnap = useCallback((e) => {
        let best = null;
        let bestDist = SNAP_PX;
        for (const g of solved) {
            for (const { at } of namedPointsOf(g)) {
                const w = pointWorld(g, at);
                if (!w)
                    continue;
                const s = screenFromWorld(w);
                const d = Math.hypot(s.x - e.clientX, s.y - e.clientY);
                if (d < bestDist) {
                    bestDist = d;
                    best = { id: g.id, at, world: w };
                }
            }
        }
        return best;
    }, [solved, screenFromWorld, worldFromEvent]);
    const findHit = useCallback((e) => {
        const w = worldFromEvent(e);
        let best = null;
        let bestDist = HIT_PX;
        for (const g of solved) {
            if (g.k === 'line') {
                const d = distToSegment(w, { x: g.a[0], y: g.a[1] }, { x: g.b[0], y: g.b[1] });
                if (d < bestDist) {
                    bestDist = d;
                    best = { id: g.id, at: null };
                }
            }
            else if (g.k === 'circle') {
                const d = distToCircleStroke(w, { x: g.c[0], y: g.c[1] }, g.r);
                if (d < bestDist) {
                    bestDist = d;
                    best = { id: g.id, at: null };
                }
            }
            else if (g.k === 'arc') {
                const d = distToCircleStroke(w, { x: g.c[0], y: g.c[1] }, g.r);
                if (d < bestDist) {
                    const ang = arcAngles(g);
                    const theta = Math.atan2(w.y - g.c[1], w.x - g.c[0]);
                    if (ang && angleInArcRange(theta, ang.a0, ang.a0 + ang.sweep)) {
                        bestDist = d;
                        best = { id: g.id, at: null };
                    }
                }
            }
        }
        return best;
    }, [solved, worldFromEvent]);
    // --- doc row writers -----------------------------------------------------------
    const pushGeom = useCallback((g) => {
        const id = nextGeomId(geoms);
        const row = { ...g, id };
        writeDoc([...geoms, row], rules);
    }, [geoms, rules, writeDoc]);
    const pushRule = useCallback((r) => {
        writeDoc(geoms, [...rules, r]);
    }, [geoms, rules, writeDoc]);
    // --- tool click handlers ---------------------------------------------------------
    const onLineClick = useCallback((e) => {
        const snap = findSnap(e);
        const world = worldFromEvent(e);
        const pt = snap ? snap.world : world;
        if (!chain) {
            setChain({
                startId: null,
                startAt: null,
                prevX: pt.x,
                prevY: pt.y,
                prevId: null,
                prevAt: null,
                pinOrigin: auto && !snap && Math.hypot(pt.x, pt.y) < 1.5,
            });
            return;
        }
        // Extend the chain: a line from the previous point to this one.
        const from = { x: chain.prevX, y: chain.prevY };
        const id = nextGeomId(geoms);
        let end = pt;
        // Auto-constraints, gated by the toggle and guarded by the DoF check
        // the diagnosis gives us after the write.
        const axisKind = auto ? inferLineConstraint(from, pt, AXIS_TOL_DEG) : null;
        if (axisKind)
            end = snapAxis(from, pt, axisKind);
        const nextGeoms = [...geoms, { k: 'line', id, a: [from.x, from.y], b: [end.x, end.y] }];
        const nextRules = [...rules];
        if (chain.prevId !== null) {
            nextRules.push({ k: 'coincident', a: chain.prevId, aEnd: chain.prevAt ?? 'b', b: id, bEnd: 'a' });
        }
        if (axisKind === 'horizontal')
            nextRules.push({ k: 'horizontal', a: id });
        else if (axisKind === 'vertical')
            nextRules.push({ k: 'vertical', a: id });
        // Close the loop when the endpoint lands on the chain's own start.
        const closes = snap && chain.startId !== null && snap.id === chain.startId && snap.at === (chain.startAt ?? 'a');
        if (closes && chain.startId !== null) {
            nextRules.push({ k: 'coincident', a: id, aEnd: 'b', b: chain.startId, bEnd: chain.startAt ?? 'a' });
        }
        else if (snap && !closes) {
            nextRules.push({ k: 'coincident', a: id, aEnd: 'b', b: snap.id, bEnd: snap.at });
        }
        writeDoc(nextGeoms, nextRules);
        if (closes) {
            setChain(null);
        }
        else {
            setChain({
                startId: chain.startId ?? id,
                startAt: chain.startAt ?? 'a',
                prevX: end.x,
                prevY: end.y,
                prevId: id,
                prevAt: 'b',
                pinOrigin: false,
            });
        }
    }, [auto, chain, findSnap, geoms, rules, writeDoc, worldFromEvent]);
    const onSelectClick = useCallback((e) => {
        const snap = findSnap(e);
        const hit = snap ? { id: snap.id, at: snap.at } : findHit(e);
        setSel((prev) => {
            const base = e.shiftKey ? prev : [];
            if (!hit)
                return base;
            const idx = base.findIndex((s) => s.id === hit.id && s.at === hit.at);
            if (idx >= 0) {
                const copy = [...base];
                copy.splice(idx, 1);
                return copy;
            }
            return [...base, hit];
        });
    }, [findHit, findSnap]);
    const onRectClick = useCallback((e) => {
        const w = worldFromEvent(e);
        if (clicks.length === 0) {
            setClicks([w]);
            return;
        }
        const [c1] = clicks;
        const id = nextGeomId(geoms);
        const a = [c1.x, c1.y];
        const b2 = [w.x, c1.y];
        const c = [w.x, w.y];
        const d = [c1.x, w.y];
        const base = nextGeomId(geoms);
        const nextGeoms = [
            ...geoms,
            { k: 'line', id: base, a, b: b2 },
            { k: 'line', id: base + 1, a: b2, b: c },
            { k: 'line', id: base + 2, a: c, b: d },
            { k: 'line', id: base + 3, a: d, b: a },
        ];
        const nextRules = [
            ...rules,
            { k: 'coincident', a: base, aEnd: 'b', b: base + 1, bEnd: 'a' },
            { k: 'coincident', a: base + 1, aEnd: 'b', b: base + 2, bEnd: 'a' },
            { k: 'coincident', a: base + 2, aEnd: 'b', b: base + 3, bEnd: 'a' },
            { k: 'coincident', a: base + 3, aEnd: 'b', b: base, bEnd: 'a' },
            { k: 'horizontal', a: base },
            { k: 'vertical', a: base + 1 },
        ];
        writeDoc(nextGeoms, nextRules);
        setClicks([]);
    }, [clicks, geoms, rules, writeDoc, worldFromEvent]);
    const onCircleClick = useCallback((e) => {
        if (clicks.length === 0) {
            const snap = findSnap(e);
            setClicks([snap ? snap.world : worldFromEvent(e)]);
            return;
        }
        const [c] = clicks;
        const w = worldFromEvent(e);
        const r = Math.hypot(w.x - c.x, w.y - c.y);
        if (r > 1e-9) {
            pushGeom({ k: 'circle', c: [c.x, c.y], r });
        }
        setClicks([]);
    }, [clicks, findSnap, pushGeom, worldFromEvent]);
    const onArcClick = useCallback((e) => {
        if (clicks.length < 2) {
            const snap = findSnap(e);
            setClicks([...clicks, snap ? snap.world : worldFromEvent(e)]);
            return;
        }
        const [c1, c2] = clicks;
        const arc = arcFromClicks(c1, c2, worldFromEvent(e));
        if (arc) {
            const ends = arcEnds(arc.cx, arc.cy, arc.r, arc.a0, arc.sweep);
            pushGeom({
                k: 'arc',
                c: [arc.cx, arc.cy],
                r: arc.r,
                a: [ends.a.x, ends.a.y],
                b: [ends.b.x, ends.b.y],
                sense: arc.sweep >= 0 ? 'ccw' : 'cw',
            });
        }
        setClicks([]);
    }, [clicks, findSnap, pushGeom, worldFromEvent]);
    const onSlotClick = useCallback((e) => {
        if (clicks.length < 2) {
            const snap = findSnap(e);
            setClicks([...clicks, snap ? snap.world : worldFromEvent(e)]);
            return;
        }
        const [cA, cB] = clicks;
        const base = nextGeomId(geoms);
        const slot = slotRows(cA, cB, worldFromEvent(e), base);
        if (!slot) {
            setStatus('slot: the radius needs a point off the first centre');
            setClicks([]);
            return;
        }
        writeDoc([...geoms, ...slot.geoms], [...rules, ...slot.rules]);
        setClicks([]);
    }, [clicks, findSnap, geoms, rules, worldFromEvent, writeDoc]);
    const onDeleteClick = useCallback(() => {
        if (sel.length === 0)
            return;
        // Descending id order: renumber() shifts ids above the removed one, so a
        // higher id removed first never shifts a lower one out from under us.
        let g = [...geoms];
        let r = [...rules];
        for (const s of [...sel].sort((a, b) => b.id - a.id)) {
            if (s.at !== null)
                continue; // a point selection deletes its geometry too
            const out = renumber(g, r, s.id);
            g = out.geoms;
            r = out.rules;
        }
        // A point named in a selection drops its row when nothing else references
        // it; v1 keeps the row (a point can carry constraints of its own).
        writeDoc(g, r);
        setSel([]);
    }, [geoms, rules, sel, writeDoc]);
    // Trim: click a line; it splits at the nearest crossing with another line
    // and the half under the click is deleted. The split point is found pure
    // (trimPick), the piece bookkeeping pure (trimLine).
    const onTrimClick = useCallback((e) => {
        const hit = findHit(e);
        if (!hit) {
            setStatus('trim: click on a line');
            return;
        }
        const click = worldFromEvent(e);
        const pick = trimPick(geoms, hit.id, click);
        if (!pick) {
            setStatus('trim: the line has no crossing with another line to trim at');
            return;
        }
        const out = trimLine(geoms, rules, hit.id, pick.at, click);
        writeDoc(out.geoms, out.rules);
        setSel([]);
        setStatus('');
    }, [findHit, geoms, rules, worldFromEvent, writeDoc]);
    // --- constraint buttons -----------------------------------------------------------
    const selShapes = useMemo(() => sel.filter((s) => s.at === null), [sel]);
    // Mirror the selected rows about the X or Y axis; copy them shifted. Both
    // duplicate with id offsets, then densifyIds renumbers the whole sketch.
    const onMirror = useCallback((axis) => {
        const ids = selShapes.map((s) => s.id);
        if (ids.length === 0)
            return;
        const out = mirrorSelection(geoms, rules, ids, axis);
        if (!out)
            return;
        const dense = densifyIds(out.geoms, out.rules);
        writeDoc(dense.geoms, dense.rules);
        setSel([]);
    }, [geoms, rules, selShapes, writeDoc]);
    const onCopy = useCallback((dx, dy) => {
        const ids = selShapes.map((s) => s.id);
        if (ids.length === 0)
            return;
        const out = copySelection(geoms, rules, ids, dx, dy);
        if (!out)
            return;
        const dense = densifyIds(out.geoms, out.rules);
        writeDoc(dense.geoms, dense.rules);
        setSel([]);
    }, [geoms, rules, selShapes, writeDoc]);
    // Construction toggle, majority semantics (the archived cConstr): any
    // non-construction shape in the selection turns ALL of them construction;
    // only an all-construction selection toggles back.
    const onConstrClick = useCallback(() => {
        const ids = selShapes.map((s) => s.id);
        if (ids.length === 0)
            return;
        writeDoc(toggleConstruction(geoms, ids), rules);
    }, [geoms, rules, selShapes, writeDoc]);
    const selPoints = useMemo(() => sel.filter((s) => s.at !== null), [sel]);
    const applyRule = useCallback((r) => {
        pushRule(r);
        setSel([]);
    }, [pushRule]);
    const canHoriz = selShapes.length === 1 && geomKind(selShapes[0].id, solved) === 'line';
    const canVert = canHoriz;
    const canCoin = selPoints.length === 2;
    const canParallel = selShapes.length === 2 && bothLines(selShapes.map((s) => s.id), solved);
    const canEqual = canParallel;
    const canPerp = canParallel;
    // Tangent is between a line and a curve, or two curves -- never two lines,
    // which is what parallel/perpendicular are for.
    const canTangent = selShapes.length === 2 && !bothLines(selShapes.map((s) => s.id), solved);
    // A picked point placed onto a picked object -- one of each, from the same
    // click-accumulated selection (onSelectClick splits point-picks from
    // shape-picks by whether the click snapped).
    const canPointOnObject = selPoints.length === 1 && selShapes.length === 1;
    // Three points: the first two go symmetric about the third.
    const canSymmetric = selPoints.length === 3;
    const canLock = selPoints.length === 1;
    const canDimLine = selShapes.length === 1 && geomKind(selShapes[0].id, solved) === 'line';
    const canDimRadius = selShapes.length === 1 && ['circle', 'arc'].includes(String(geomKind(selShapes[0].id, solved)));
    const canDimDiameter = canDimRadius;
    const openDim = useCallback((kind) => {
        const g = solved.find((x) => x.id === selShapes[0]?.id);
        if (!g)
            return;
        if ((kind === 'radius' || kind === 'diameter') && g.k !== 'circle' && g.k !== 'arc')
            return;
        const initial = kind === 'radius'
            ? String(g.r)
            : kind === 'diameter'
                ? String(2 * (g.r ?? 0))
                : kind === 'distance'
                    ? String(Math.hypot((g.b?.[0] ?? 0) - (g.a?.[0] ?? 0), (g.b?.[1] ?? 0) - (g.a?.[1] ?? 0)))
                    : '0';
        setDim({ kind, a: selShapes[0] ?? null, b: null, value: initial });
    }, [selShapes, solved]);
    const commitDim = useCallback(() => {
        if (!dim)
            return;
        const v = Number(dim.value);
        if (!Number.isFinite(v) || (v <= 0 && dim.kind !== 'distanceX' && dim.kind !== 'distanceY')) {
            setStatus('enter a number (positive unless a signed offset)');
            return;
        }
        const g = dim.a ? solved.find((x) => x.id === dim.a.id) : null;
        if (!g)
            return;
        if (dim.kind === 'radius')
            applyRule({ k: 'radius', a: g.id, value: v });
        else if (dim.kind === 'diameter')
            applyRule({ k: 'diameter', a: g.id, value: v });
        else if (dim.kind === 'distance')
            applyRule({ k: 'distance', a: g.id, aEnd: 'a', b: g.id, bEnd: 'b', value: v });
        setDim(null);
    }, [applyRule, dim, solved]);
    // --- drag to solve -----------------------------------------------------------------
    const draggingRef = useRef(null);
    const onPointerDown = useCallback((e) => {
        if (tool !== 'select')
            return;
        const snap = findSnap(e);
        if (!snap)
            return;
        draggingRef.current = { id: snap.id, at: snap.at };
        // Capture keeps moves flowing outside the svg on a real pointer; a
        // synthetic driver has no active pointer, and capture throws NotFound
        // there — losing it is fine, the move handler still fires on the svg.
        try {
            e.target.setPointerCapture?.(e.pointerId);
        }
        catch {
            // no active pointer: nothing to capture, keep the drag ref
        }
    }, [findSnap, tool]);
    const onPointerMove = useCallback((e) => {
        const w = worldFromEvent(e);
        setPointer(w);
        setHoverSnap(findSnap(e));
        const d = draggingRef.current;
        if (!d || !sessionRef.current)
            return;
        const slots = pointSlots(geoms, d.id, d.at);
        if (!slots)
            return;
        const payload = { sa: slots[0], sb: slots[1], tx: w.x, ty: w.y };
        pendingDrag.current = payload;
        if (rafRef.current !== null)
            return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            const p = pendingDrag.current;
            pendingDrag.current = null;
            if (!p)
                return;
            const s = sessionRef.current;
            if (s.drag(p.sa, p.sb, p.tx, p.ty)) {
                setSolved(readSolved(geoms, s.params));
            }
            else {
                setStatus(s.lastError() ?? 'the drag did not solve');
            }
        });
    }, [findSnap, geoms, worldFromEvent]);
    const onPointerUp = useCallback(() => {
        const d = draggingRef.current;
        draggingRef.current = null;
        if (!d)
            return;
        // Commit the dragged positions as row values: read the solved vector back
        // into the doc (one onChange per gesture = one undo entry).
        const rows = readSolved(geoms, sessionRef.current.params);
        writeDoc(rows, rules);
    }, [geoms, rules, writeDoc]);
    // --- keyboard -----------------------------------------------------------------------
    useEffect(() => {
        const onKey = (e) => {
            const tag = e.target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA')
                return;
            if (e.key === 'Escape') {
                if (dim)
                    setDim(null);
                else if (chain || clicks.length) {
                    setChain(null);
                    setClicks([]);
                }
                else
                    onExit?.();
            }
            else if ((e.key === 'Delete' || e.key === 'Backspace') && tool === 'select') {
                onDeleteClick();
            }
            else if (e.key === 'l' && !e.metaKey && !e.ctrlKey)
                setTool('line');
            else if (e.key === 's' && !e.metaKey && !e.ctrlKey)
                setTool('select');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [chain, clicks.length, dim, onDeleteClick, onExit, tool]);
    // --- render --------------------------------------------------------------------------
    const selKey = (id, at) => `${id}:${at ?? ''}`;
    const isSel = (id, at) => sel.some((s) => s.id === id && s.at === at);
    const vertex = (id, at, w, key) => {
        const selected = isSel(id, at);
        return (_jsx("circle", { className: `sk-vertex${selected ? ' sk-vertex-sel' : ''}`, cx: w.x, cy: -w.y, r: 0.9, "data-part": `v:${id}:${at}` }, key));
    };
    const shapes = [];
    for (const g of solved) {
        const shapeSel = isSel(g.id, null);
        const cls = `sk-shape${shapeSel ? ' sk-shape-sel' : ''}${g.construction ? ' sk-constr' : ''}`;
        if (g.k === 'line') {
            shapes.push(_jsx("line", { className: cls, x1: g.a[0], y1: -g.a[1], x2: g.b[0], y2: -g.b[1], "data-part": `s:${g.id}` }, `g${g.id}`));
            shapes.push(vertex(g.id, 'a', { x: g.a[0], y: g.a[1] }, `va${g.id}`));
            shapes.push(vertex(g.id, 'b', { x: g.b[0], y: g.b[1] }, `vb${g.id}`));
        }
        else if (g.k === 'circle') {
            shapes.push(_jsx("circle", { className: cls, cx: g.c[0], cy: -g.c[1], r: g.r, "data-part": `s:${g.id}` }, `g${g.id}`));
            shapes.push(vertex(g.id, 'c', { x: g.c[0], y: g.c[1] }, `vc${g.id}`));
        }
        else if (g.k === 'arc') {
            const ang = arcAngles(g);
            if (ang) {
                const pts = sampleArc(g.c[0], g.c[1], g.r, ang.a0, ang.sweep);
                shapes.push(_jsx("polyline", { className: cls, points: pts.map((p) => `${p.x},${-p.y}`).join(' '), "data-part": `s:${g.id}` }, `g${g.id}`));
            }
            shapes.push(vertex(g.id, 'c', { x: g.c[0], y: g.c[1] }, `vc${g.id}`));
            shapes.push(vertex(g.id, 'a', { x: g.a[0], y: g.a[1] }, `va${g.id}`));
            shapes.push(vertex(g.id, 'b', { x: g.b[0], y: g.b[1] }, `vb${g.id}`));
        }
        else if (g.k === 'point') {
            shapes.push(vertex(g.id, 'a', { x: g.p[0], y: g.p[1] }, `vp${g.id}`));
        }
    }
    // Live preview per tool.
    let preview = null;
    if (tool === 'line' && chain && pointer) {
        const from = { x: chain.prevX, y: chain.prevY };
        const axisKind = auto ? inferLineConstraint(from, pointer, AXIS_TOL_DEG) : null;
        const pt = axisKind ? snapAxis(from, pointer, axisKind) : pointer;
        preview = (_jsxs(_Fragment, { children: [_jsx("line", { className: "sk-rubber", x1: from.x, y1: -from.y, x2: pt.x, y2: -pt.y }), axisKind && (_jsx("text", { className: "sk-axis-hint", x: pt.x + 1.2, y: -pt.y - 1.2, children: axisKind === 'horizontal' ? '—' : '|' }))] }));
    }
    else if (tool === 'rect' && clicks.length === 1 && pointer) {
        const [c1] = clicks;
        preview = (_jsx("rect", { className: "sk-preview", x: Math.min(c1.x, pointer.x), y: -Math.max(c1.y, pointer.y), width: Math.abs(pointer.x - c1.x), height: Math.abs(pointer.y - c1.y) }));
    }
    else if (tool === 'circle' && clicks.length === 1 && pointer) {
        const [c] = clicks;
        preview = (_jsx("circle", { className: "sk-preview", cx: c.x, cy: -c.y, r: Math.hypot(pointer.x - c.x, pointer.y - c.y) }));
    }
    else if (tool === 'arc' && clicks.length === 2 && pointer) {
        const [c1, c2] = clicks;
        const arc = arcFromClicks(c1, c2, pointer);
        if (arc) {
            const pts = sampleArc(arc.cx, arc.cy, arc.r, arc.a0, arc.sweep);
            preview = _jsx("polyline", { className: "sk-preview", points: pts.map((p) => `${p.x},${-p.y}`).join(' ') });
        }
    }
    else if (tool === 'slot' && clicks.length === 2 && pointer) {
        // Slot preview: the two cap circles + the two side lines, at the live
        // radius. The committed rows run the same math (slotRows).
        const [cA, cB] = clicks;
        const r = Math.hypot(pointer.x - cA.x, pointer.y - cA.y);
        if (r > 1e-9) {
            const dx = cB.x - cA.x, dy = cB.y - cA.y;
            const len = Math.hypot(dx, dy);
            if (len > 1e-9) {
                const px = (-dy / len) * r, py = (dx / len) * r;
                const p1 = { x: cA.x + px, y: cA.y + py };
                const p2 = { x: cB.x + px, y: cB.y + py };
                const p3 = { x: cB.x - px, y: cB.y - py };
                const p4 = { x: cA.x - px, y: cA.y - py };
                preview = (_jsxs(_Fragment, { children: [_jsx("circle", { className: "sk-preview", cx: cA.x, cy: -cA.y, r: r }), _jsx("circle", { className: "sk-preview", cx: cB.x, cy: -cB.y, r: r }), _jsx("line", { className: "sk-preview", x1: p1.x, y1: -p1.y, x2: p2.x, y2: -p2.y }), _jsx("line", { className: "sk-preview", x1: p3.x, y1: -p3.y, x2: p4.x, y2: -p4.y })] }));
            }
        }
    }
    const dofClass = diagnosis
        ? diagnosis.bucket === 'conflicting'
            ? 'sk-dof-bad'
            : diagnosis.dof === 0
                ? 'sk-dof-ok'
                : 'sk-dof-warn'
        : '';
    const dofText = diagnosis
        ? diagnosis.bucket === 'conflicting'
            ? 'Over-constrained'
            : diagnosis.dof === 0
                ? 'Fully constrained ✓'
                : `${diagnosis.dof} DoF`
        : '';
    // Docked into the ribbon, same portal target ModelEditor's own toolbar
    // uses -- while a sketch is open, ModelEditor hides its 3D groups behind
    // that same host and leaves File/Edit/Done, so this renders right after
    // them rather than floating a second toolbar over the canvas.
    const ribbonHost = typeof document !== 'undefined' ? document.getElementById('reshapeRibbon') : null;
    return (_jsxs("div", { className: "sk2d-host", children: [_jsx("style", { children: SK2D_CSS }), ribbonHost && createPortal(_jsxs("div", { className: "model-tools", children: [_jsxs("div", { className: "model-tool-group", children: [_jsx("div", { className: "model-tool-icons", children: [
                                    ['select', 'Select'],
                                    ['line', 'Line'],
                                    ['rect', 'Rect'],
                                    ['circle', 'Circle'],
                                    ['arc', 'Arc'],
                                    ['slot', 'Slot'],
                                    ['trim', 'Trim'],
                                ].map(([t, label]) => (_jsx("button", { className: "sk2d-tool", "aria-pressed": tool === t, onClick: () => setTool(t), children: label }, t))) }), _jsx("span", { className: "model-tool-group-label", children: "Draw" })] }), _jsx("div", { className: "model-tool-divider" }), _jsxs("div", { className: "model-tool-group", children: [_jsxs("div", { className: "model-tool-icons", children: [_jsx("button", { className: "sk2d-tool", disabled: !canHoriz, title: "Horizontal", onClick: () => applyRule({ k: 'horizontal', a: selShapes[0].id }), children: "\u27F7" }), _jsx("button", { className: "sk2d-tool", disabled: !canVert, title: "Vertical", onClick: () => applyRule({ k: 'vertical', a: selShapes[0].id }), children: "\u2195" }), _jsx("button", { className: "sk2d-tool", disabled: !canCoin, title: "Coincident", onClick: () => {
                                            const [a, b] = selPoints;
                                            applyRule({ k: 'coincident', a: a.id, aEnd: a.at, b: b.id, bEnd: b.at });
                                        }, children: "Coincident" }), _jsx("button", { className: "sk2d-tool", disabled: !canParallel, title: "Parallel", onClick: () => {
                                            const [a, b] = selShapes;
                                            applyRule({ k: 'parallel', a: a.id, b: b.id });
                                        }, children: "\u2225" }), _jsx("button", { className: "sk2d-tool", disabled: !canEqual, title: "Equal", onClick: () => {
                                            const [a, b] = selShapes;
                                            applyRule({ k: 'equal', a: a.id, b: b.id });
                                        }, children: "=" }), _jsx("button", { className: "sk2d-tool", disabled: !canPerp, title: "Perpendicular", onClick: () => {
                                            const [a, b] = selShapes;
                                            applyRule({ k: 'perpendicular', a: a.id, b: b.id });
                                        }, children: "\u27C2" }), _jsx("button", { className: "sk2d-tool", disabled: !canTangent, title: "Tangent", onClick: () => {
                                            const [a, b] = selShapes;
                                            applyRule({ k: 'tangent', a: a.id, b: b.id });
                                        }, children: "Tangent" }), _jsx("button", { className: "sk2d-tool", disabled: !canPointOnObject, title: "Point on object", onClick: () => {
                                            const [p] = selPoints;
                                            const [s] = selShapes;
                                            applyRule({ k: 'pointOnObject', a: p.id, aEnd: p.at, b: s.id });
                                        }, children: "On Object" }), _jsx("button", { className: "sk2d-tool", disabled: !canSymmetric, title: "Symmetric about the third selected point", onClick: () => {
                                            const [a, b, c] = selPoints;
                                            applyRule({ k: 'symmetric', a: a.id, aEnd: a.at, b: b.id, bEnd: b.at, c: c.id, cEnd: c.at });
                                        }, children: "Symmetric" }), _jsx("button", { className: "sk2d-tool", disabled: !canLock, title: "Lock this point where it is", onClick: () => {
                                            const [p] = selPoints;
                                            applyRule({ k: 'lock', a: p.id, aEnd: p.at });
                                        }, children: "Lock" })] }), _jsx("span", { className: "model-tool-group-label", children: "Constrain" })] }), _jsx("div", { className: "model-tool-divider" }), _jsxs("div", { className: "model-tool-group", children: [_jsxs("div", { className: "model-tool-icons", children: [_jsx("button", { className: "sk2d-tool", disabled: !canDimLine, onClick: () => openDim('distance'), children: "Dim" }), _jsx("button", { className: "sk2d-tool", disabled: !canDimRadius, onClick: () => openDim('radius'), children: "R" }), _jsx("button", { className: "sk2d-tool", disabled: !canDimDiameter, title: "Diameter", onClick: () => openDim('diameter'), children: "\u2300" }), dim && (_jsxs("span", { className: "sk2d-dim", children: [_jsx("input", { autoFocus: true, value: dim.value, onChange: (e) => setDim({ ...dim, value: e.target.value }), onKeyDown: (e) => {
                                                    if (e.key === 'Enter')
                                                        commitDim();
                                                    if (e.key === 'Escape')
                                                        setDim(null);
                                                }, size: 6 }), _jsx("button", { className: "sk2d-tool", onClick: commitDim, children: "\u2713" }), _jsx("button", { className: "sk2d-tool", onClick: () => setDim(null), children: "\u2715" })] }))] }), _jsx("span", { className: "model-tool-group-label", children: "Dimension" })] }), _jsx("div", { className: "model-tool-divider" }), _jsxs("div", { className: "model-tool-group", children: [_jsxs("div", { className: "model-tool-icons", children: [_jsx("button", { className: "sk2d-tool", disabled: sel.length === 0, onClick: onDeleteClick, children: "Delete" }), _jsx("button", { className: "sk2d-tool", disabled: selShapes.length === 0, title: "Toggle construction geometry (dashed; solved but never profiled)", onClick: onConstrClick, children: "Constr" }), _jsx("button", { className: "sk2d-tool", disabled: selShapes.length === 0, title: "Mirror the selected rows about the Y axis (x -> -x)", onClick: () => onMirror('y'), children: "Mirror" }), _jsx("button", { className: "sk2d-tool", disabled: selShapes.length === 0, title: "Copy the selected rows, shifted 10mm right", onClick: () => onCopy(10, 0), children: "Copy" })] }), _jsx("span", { className: "model-tool-group-label", children: "Modify" })] }), _jsx("div", { className: "model-tool-divider" }), _jsxs("div", { className: "model-tool-group", children: [_jsxs("div", { className: "model-tool-icons", children: [_jsxs("label", { className: "sk2d-auto", children: [_jsx("input", { type: "checkbox", checked: auto, onChange: (e) => setAuto(e.target.checked) }), " auto"] }), _jsxs("span", { className: `sk-dof ${dofClass}`, children: [dofClass === 'sk-dof-bad' ? '⨯ ' : '', dofText] }), status && _jsx("span", { className: "sk2d-status", children: status })] }), _jsx("span", { className: "model-tool-group-label", children: "Status" })] })] }), ribbonHost), _jsxs("svg", { ref: svgRef, className: "sk2d-svg", viewBox: view, preserveAspectRatio: "xMidYMid meet", onClick: (e) => {
                    if (tool === 'line')
                        onLineClick(e);
                    else if (tool === 'select')
                        onSelectClick(e);
                    else if (tool === 'rect')
                        onRectClick(e);
                    else if (tool === 'circle')
                        onCircleClick(e);
                    else if (tool === 'arc')
                        onArcClick(e);
                    else if (tool === 'slot')
                        onSlotClick(e);
                    else if (tool === 'trim')
                        onTrimClick(e);
                }, onPointerMove: onPointerMove, onPointerDown: onPointerDown, onPointerUp: onPointerUp, onDoubleClick: () => {
                    setChain(null);
                    setClicks([]);
                }, children: [_jsx("g", { className: "sk2d-grid", children: gridNodes() }), _jsx("g", { className: "sk2d-geom", children: shapes }), _jsx("g", { className: "sk2d-preview", children: preview }), hoverSnap && (_jsx("circle", { className: "sk-snap-ring", cx: hoverSnap.world.x, cy: -hoverSnap.world.y, r: 1.4 }))] })] }));
}
// --- module helpers --------------------------------------------------------------------
const svgRef = { current: null };
function geomKind(id, geoms) {
    return geoms.find((x) => x.id === id)?.k ?? null;
}
function bothLines(ids, geoms) {
    return ids.every((id) => geomKind(id, geoms) === 'line');
}
function gridNodes() {
    const nodes = [];
    for (let i = -VIEW; i <= VIEW; i += 10) {
        if (i === 0)
            continue;
        nodes.push(_jsx("line", { className: "sk-grid", x1: i, y1: -VIEW, x2: i, y2: VIEW }, `v${i}`));
        nodes.push(_jsx("line", { className: "sk-grid", x1: -VIEW, y1: i, x2: VIEW, y2: i }, `h${i}`));
    }
    nodes.push(_jsx("line", { className: "sk-axis-x", x1: -VIEW, y1: 0, x2: VIEW, y2: 0 }, "ax"));
    nodes.push(_jsx("line", { className: "sk-axis-y", x1: 0, y1: -VIEW, x2: 0, y2: VIEW }, "ay"));
    nodes.push(_jsx("circle", { className: "sk-origin", cx: 0, cy: 0, r: 0.8 }, "o"));
    return nodes;
}
const SK2D_CSS = `
.sk2d-host { position: absolute; inset: 0; background: var(--reshape-bg, #282a36); }
/* Docked in the ribbon (see ribbonHost above), so these match the ribbon's
   own button language rather than the standalone-floating-bar padding this
   toolbar used before. */
.sk2d-tool { height: 28px; padding: 0 8px; border-radius: 3px; border: 1px solid transparent;
  background: transparent; color: #d3d5e3; cursor: pointer;
  font-size: 12px; font-family: var(--reshape-font-ui); }
.sk2d-tool:hover:not(:disabled) { background: #3d4051; border-color: #565a70; color: var(--reshape-text); }
.sk2d-tool:disabled { opacity: 0.35; cursor: not-allowed; }
.sk2d-tool[aria-pressed="true"] { background: var(--reshape-border); border-color: var(--reshape-accent-2); color: var(--reshape-text); }
.sk2d-auto { display: flex; align-items: center; gap: 3px; font-size: 12px; color: var(--reshape-text-muted, #6272a4); }
.sk-dof { font-family: var(--reshape-font-mono, monospace); font-size: 12px; padding: 1px 8px;
  border-radius: 999px; border: 1px solid var(--reshape-border, #44475a); }
.sk-dof-ok { color: var(--reshape-success, #50fa7b); border-color: var(--reshape-success, #50fa7b); }
.sk-dof-warn { color: var(--reshape-warn, #ffb86c); border-color: var(--reshape-warn, #ffb86c); }
.sk-dof-bad { color: var(--reshape-danger, #ff5555); border-color: var(--reshape-danger, #ff5555); }
.sk2d-dim { display: flex; gap: 3px; align-items: center; }
.sk2d-dim input { background: var(--reshape-surface, #1e1f29); color: var(--reshape-text);
  border: 1px solid var(--reshape-accent, #8be9fd); border-radius: var(--reshape-radius, 4px);
  padding: 2px 6px; font-family: var(--reshape-font-mono, monospace); }
.sk2d-status { color: var(--reshape-warn, #ffb86c); font-size: 12px; }
.sk2d-svg { width: 100%; height: 100%; cursor: crosshair; touch-action: none; }
.sk-grid { stroke: var(--reshape-text, #f8f8f2); stroke-width: 0.3; opacity: 0.25; }
.sk-axis-x { stroke: #e0685a; stroke-width: 0.25; opacity: 0.85; }
.sk-axis-y { stroke: #5fbf8f; stroke-width: 0.25; opacity: 0.85; }
.sk-origin { fill: var(--reshape-accent, #8be9fd); }
.sk-line, .sk-circle, .sk-arc, polyline { fill: none; }
.sk-shape { stroke: var(--reshape-text, #f8f8f2); stroke-width: 0.35; fill: none; }
.sk-constr { stroke-dasharray: 1 0.8; opacity: 0.6; }
.sk-shape-sel { stroke: var(--reshape-pink, #ff79c6) !important; }
.sk-vertex { fill: var(--reshape-text, #f8f8f2); }
.sk-vertex-sel { fill: var(--reshape-pink, #ff79c6); }
.sk-snap-ring { fill: none; stroke: var(--reshape-accent, #8be9fd); stroke-width: 0.3; }
.sk-rubber { stroke: var(--reshape-accent, #8be9fd); stroke-width: 0.3; stroke-dasharray: 0.8 0.5; fill: none; }
.sk-preview { stroke: var(--reshape-accent, #8be9fd); stroke-width: 0.3; fill: none; opacity: 0.8; }
.sk-axis-hint { fill: var(--reshape-accent, #8be9fd); font-size: 2.5px; }
`;
//# sourceMappingURL=SketchCanvas2D.js.map