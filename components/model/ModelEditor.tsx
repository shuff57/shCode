'use client';

// The mouse half of the JSCAD workspace: a toolbar of shapes and operations,
// and the ordered list of what they built.
//
// The list is the point. Each row is a statement, the order decides the result,
// and Cut 1 reading "Box 1 - Cylinder 1" is the same fact as
// booleans.subtract(box1, cyl1) in the generated file next to it.
//
// Toolbar grouping mirrors Onshape's Part Studio bar (fetched from
// cad.onshape.com/help — see .gauntlet/parity.json "chrome" entry): tools run
// create -> modify -> pattern/transform -> delete, separated by dividers, and
// a family with variants (five primitives, three booleans, fillet/chamfer,
// linear/circular pattern, move/copy) collapses into ONE button with a caret
// flyout whose face shows the last variant used, instead of one button per
// variant. Search tools (Onshape: alt+c) is the same idea here.
//
// Deliberately NOT copied: Onshape puts Undo/Redo at the far left and buries
// Delete mid-bar next to Transform. shCAD keeps Undo/Redo/Delete clustered at
// the end, as it already did before this pass — for a first CS course "the
// row at the end for fixing mistakes" is one easy-to-teach unit, and there is
// no reach-distance problem here worth optimizing away from that.

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box as BoxIcon,
  Circle,
  Cylinder as CylIcon,
  Cone as ConeIcon,
  Torus as TorusIcon,
  Combine,
  Scissors,
  SquareDashedBottom,
  PenLine,
  MoveUp,
  Plus,
  RotateCw,
  Trash2,
  Undo2,
  Redo2,
  ChevronUp,
  ChevronDown,
  Search,
  Disc3,
  FlipHorizontal2,
  FlipHorizontal,
  FlipVertical2,
  MoveHorizontal,
  RefreshCw,
  CircleDot,
  Grid2x2,
  PackageOpen,
  Move as MoveIcon,
  Copy as CopyIcon,
  SquareRoundCorner,
  Octagon,
} from 'lucide-react';
import SketchConstraints from './SketchConstraints';
import type { Constraint } from '../../lib/sketch-solve';
import { filletCorner, whyCannotRoundCorner } from '../../lib/sketch-arc';
import {
  type Feature,
  type ModelDoc,
  type RoundStyle,
  type SketchPlane,
  addCorner,
  canRotate,
  dependsOn,
  isRoundable,
  maxRound,
  nameMap,
  newCircleSketch,
  newExtrude,
  newHole,
  newHoleCorners,
  newMirror,
  newPattern,
  newRevolve,
  newShape,
  newShell,
  newSketch,
  newMove,
  nextId,
  type ShapeKind,
  topLevel,
  whyCannotOrbit,
  whyCannotRound,
} from '../../lib/model-types';

interface Props {
  doc: ModelDoc;
  onChange: (next: ModelDoc) => void;
  /** Lifted so the preview knows whose drag handles to draw. */
  selected: string[];
  onSelect: (ids: string[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

type BoolOp = 'union' | 'subtract' | 'intersect';
type PatternMode = 'linear' | 'circular';
type MenuId = 'shape' | 'bool' | 'round' | 'pattern' | 'move' | 'mirror' | 'hole' | null;

function shapeIcon(kind: ShapeKind) {
  if (kind === 'box') return <BoxIcon size={14} />;
  if (kind === 'cylinder') return <CylIcon size={14} />;
  if (kind === 'cone') return <ConeIcon size={14} />;
  if (kind === 'torus') return <TorusIcon size={14} />;
  return <Circle size={14} />;
}
function shapeLabel(kind: ShapeKind) {
  return kind === 'box' ? 'Box'
    : kind === 'cylinder' ? 'Cylinder'
    : kind === 'cone' ? 'Cone'
    : kind === 'torus' ? 'Ring'
    : 'Sphere';
}
const SHAPE_KINDS: ShapeKind[] = ['box', 'cylinder', 'sphere', 'cone', 'torus'];

function boolIcon(op: BoolOp) {
  if (op === 'union') return <Combine size={14} />;
  if (op === 'subtract') return <Scissors size={14} />;
  return <SquareDashedBottom size={14} />;
}
function boolLabel(op: BoolOp) {
  return op === 'union' ? 'Join' : op === 'subtract' ? 'Cut' : 'Overlap';
}
const BOOL_OPS: BoolOp[] = ['union', 'subtract', 'intersect'];

// "Chamfer" is the one CAD word left in the bar. The button keeps saying it
// in plain English -- the real term shows up in the tooltip instead, same as
// every other real-API-as-the-why relationship in shCAD.
function roundLabel(style: RoundStyle) {
  return style === 'fillet' ? 'Round' : 'Angled Corner';
}
function roundIcon(style: RoundStyle) {
  return style === 'fillet' ? <SquareRoundCorner size={14} /> : <Octagon size={14} />;
}
function roundDescription(style: RoundStyle) {
  return style === 'fillet' ? 'Round the edges' : 'Slice the edges off at an angle';
}
const ROUND_STYLES: RoundStyle[] = ['fillet', 'chamfer'];

function patternIcon(mode: PatternMode) {
  return mode === 'linear' ? <MoveHorizontal size={14} /> : <RefreshCw size={14} />;
}
function patternLabel(mode: PatternMode) {
  return mode === 'linear' ? 'Repeat' : 'Repeat Around';
}
const PATTERN_MODES: PatternMode[] = ['linear', 'circular'];

function moveIcon(copy: boolean) {
  return copy ? <CopyIcon size={14} /> : <MoveIcon size={14} />;
}
function moveLabel(copy: boolean) {
  return copy ? 'Copy' : 'Move';
}

// The plane is named by which way it flips, not by its axis letters -- "yz"
// means nothing to a student, but "left to right" is the picture in their
// head. The real CAD name still reaches them, in the tooltip, same deal as
// "Angled Corner" carrying "chamfer" below.
const MIRROR_PLANES: SketchPlane[] = ['yz', 'xz', 'xy'];
function mirrorPlaneLabel(plane: SketchPlane) {
  return plane === 'yz' ? 'Left-Right' : plane === 'xz' ? 'Front-Back' : 'Top-Bottom';
}
function mirrorPlaneIcon(plane: SketchPlane) {
  return plane === 'yz' ? <FlipHorizontal2 size={14} />
    : plane === 'xz' ? <FlipHorizontal size={14} />
    : <FlipVertical2 size={14} />;
}
function mirrorPlaneTitle(plane: SketchPlane) {
  return plane === 'yz' ? 'Mirror left to right (the real name: the yz plane)'
    : plane === 'xz' ? 'Mirror front to back (the real name: the xz plane)'
    : 'Mirror top to bottom (the real name: the xy plane)';
}

/** A sketch can be pulled or spun, never both — either would produce a
 *  second solid from the same outline. Tells the caller which already claimed it. */
function sketchClaimedBy(doc: ModelDoc, id: string): 'extrude' | 'revolve' | null {
  for (const f of doc.features) {
    if ((f.kind === 'extrude' || f.kind === 'revolve') && f.target === id) return f.kind;
  }
  return null;
}

function whyCannotSolidOp(chosen: Feature[], verb: string): string | null {
  if (chosen.length !== 1) return `Pick one shape to ${verb}.`;
  if (chosen[0].kind === 'sketch') {
    return `${verb[0].toUpperCase()}${verb.slice(1)} works on a solid, not a flat sketch — pull or spin it into one first.`;
  }
  return null;
}

interface FlyoutVariant {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

/** One family of tools (five primitives, three booleans, ...) collapsed into a
 *  single button whose face is the last variant used, plus a caret that opens
 *  the rest. Matches the Onshape flyout pattern this toolbar is modeled on. */
function FlyoutButton({
  label, icon, onMain, disabled, title, open, onToggleOpen, variants, matches, searchActive,
}: {
  label: string;
  icon: ReactNode;
  onMain: () => void;
  disabled: boolean;
  title: string;
  open: boolean;
  onToggleOpen: () => void;
  variants: FlyoutVariant[];
  /** Checked against a variant's label AND its id, so a variant can still be
   *  found by its real-world/CAD name even when its visible label is the
   *  plain-English rename (e.g. searching "chamfer" finds "Angled Corner"). */
  matches: (text: string) => boolean;
  /** Whether the search box currently has text in it. */
  searchActive: boolean;
}) {
  const shown = variants.filter((v) => matches(v.label) || matches(v.id));
  const faceMatches = matches(label);
  if (!faceMatches && shown.length === 0) return null;
  // A match hiding inside a closed flyout is invisible to the student who
  // typed for it -- if the face itself doesn't match but a variant does,
  // pop the flyout open so the match is on screen, not just in the data.
  const revealed = open || (searchActive && !faceMatches && shown.length > 0);
  return (
    <span className="model-flyout">
      <button onClick={onMain} disabled={disabled} title={title}>
        {icon} {label}
      </button>
      <button
        className="model-flyout-caret"
        onClick={onToggleOpen}
        disabled={disabled}
        aria-label={`More ${label.toLowerCase()} tools`}
        title={`More ${label.toLowerCase()} tools`}
      >
        <ChevronDown size={11} />
      </button>
      {revealed && shown.length > 0 && (
        <div className="model-flyout-menu">
          {shown.map((v) => (
            <button key={v.id} onClick={v.onClick} disabled={v.disabled} title={v.title}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

export default function ModelEditor({
  doc, onChange, selected, onSelect, onUndo, onRedo, canUndo, canRedo,
}: Props) {
  const [note, setNote] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<MenuId>(null);
  const [lastShape, setLastShape] = useState<ShapeKind>('box');
  const [lastBoolOp, setLastBoolOp] = useState<BoolOp>('union');
  const [lastRound, setLastRound] = useState<RoundStyle>('fillet');
  const [lastPattern, setLastPattern] = useState<PatternMode>('linear');
  const [lastMoveCopy, setLastMoveCopy] = useState(false);
  // null until the student has picked a plane once -- see mirror() below.
  // There is no safe default here the way 'fillet' or 'linear' are for the
  // other flyouts: the wrong plane produces a solid that LOOKS fine and is
  // wrong, so the first click has to ask rather than guess.
  const [lastMirrorPlane, setLastMirrorPlane] = useState<SketchPlane | null>(null);
  const setSelected = onSelect;

  const toolsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Alt+C (Onshape's own shortcut) focuses Search tools; Escape closes
  // whichever flyout is open, wherever focus happens to be.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape') {
        setMenu(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A flyout menu closes on any click outside the toolbar, same as a native
  // dropdown -- otherwise it just sits open over the canvas.
  useEffect(() => {
    if (!menu) return;
    function onDocClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setMenu(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menu]);

  const chosen = doc.features.filter((f) => selected.includes(f.id));
  const names = nameMap(doc);
  const shownIds = new Set(topLevel(doc).map((f) => f.id));

  function matches(text: string): boolean {
    const q = search.trim().toLowerCase();
    return !q || text.toLowerCase().includes(q);
  }
  const searchActive = search.trim() !== '';
  function toggleMenu(id: MenuId) {
    setMenu((m) => (m === id ? null : id));
  }

  function say(msg: string | null) {
    setNote(msg);
  }

  function addShape(kind: ShapeKind) {
    const f = newShape(doc, kind);
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    setLastShape(kind);
    setMenu(null);
    say(null);
  }

  function combine(op: BoolOp) {
    if (chosen.length < 2) {
      say('Pick two shapes first — click one, then hold Shift (or Ctrl, or Cmd) and click another.');
      return;
    }
    // Selection order, not list order: subtract(a, b) is not subtract(b, a),
    // and the first one clicked is the body being cut.
    const targets = selected.filter((id) => doc.features.some((f) => f.id === id));
    const f: Feature = { id: nextId(doc, 'op'), kind: 'combine', op, targets };
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    setLastBoolOp(op);
    setMenu(null);
    say(null);
  }

  function round(style: RoundStyle) {
    if (chosen.length !== 1) {
      say('Pick one shape to round.');
      return;
    }
    const f = chosen[0];
    const why = whyCannotRound(f);
    if (why) {
      say(why);
      return;
    }
    if (!isRoundable(f)) return;
    const size = Math.min(maxRound(f), 4);
    onChange({
      ...doc,
      features: doc.features.map((x) =>
        x.id === f.id ? { ...x, round: size, roundStyle: style } : x
      ),
    });
    setLastRound(style);
    setMenu(null);
    say(null);
  }

  // Rotation is opt-in per shape, the same way rounding is: three angle rows
  // and three ring handles on every shape from the start would be clutter for
  // the many models that never turn anything.
  function turn() {
    if (chosen.length !== 1) {
      say('Pick one shape to turn.');
      return;
    }
    const f = chosen[0];
    if (!canRotate(f)) {
      say('A sphere looks the same whichever way you turn it.');
      return;
    }
    onChange({
      ...doc,
      features: doc.features.map((x) =>
        x.id === f.id && canRotate(x)
          ? { ...x, rotate: x.rotate ?? [0, 0, 0] }
          : x
      ),
    });
    say(null);
  }

  function startSketch() {
    const f = newSketch(doc);
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    say('Drag the blue corners to shape it, then press Pull or Spin to make it solid.');
  }

  function startCircleSketch() {
    const f = newCircleSketch(doc);
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    say('Drag either handle to resize it, then press Pull or Spin to make it solid.');
  }

  function pull() {
    const f = chosen[0];
    if (chosen.length !== 1 || !f || f.kind !== 'sketch') {
      say('Pick a sketch to pull into a solid.');
      return;
    }
    const claim = sketchClaimedBy(doc, f.id);
    if (claim) {
      say(claim === 'extrude'
        ? 'That sketch has already been pulled. Change its height instead.'
        : 'That sketch has already been spun into a solid. Pull needs a fresh sketch.');
      return;
    }
    const e = newExtrude(doc, f.id);
    onChange({ ...doc, features: [...doc.features, e] });
    setSelected([e.id]);
    say(null);
  }

  function spin() {
    const f = chosen[0];
    if (chosen.length !== 1 || !f || f.kind !== 'sketch') {
      say('Pick a sketch to spin into a solid.');
      return;
    }
    const claim = sketchClaimedBy(doc, f.id);
    if (claim) {
      say(claim === 'revolve'
        ? 'That sketch has already been spun. Change its angle instead.'
        : 'That sketch has already been pulled into a solid. Spin needs a fresh sketch.');
      return;
    }
    const r = newRevolve(doc, f.id);
    onChange({ ...doc, features: [...doc.features, r] });
    setSelected([r.id]);
    say(null);
  }

  function corner() {
    const f = chosen[0];
    if (chosen.length !== 1 || !f || f.kind !== 'sketch') {
      say('Pick a sketch to add a corner to.');
      return;
    }
    // A circle sketch has no corners -- its two points are diameter ends,
    // not a polyline, and splicing a third point in degrades that reading
    // silently (Finding 3, sketch gauntlet round 2): circleOf() would then
    // read points[0]/points[1] as the diameter, which the splice just moved.
    if (f.shape === 'circle') {
      say('A circle has no corners to add. Start a Sketch instead if you want straight edges to work with.');
      return;
    }
    // Always inserts after corner 0 -- there is no way yet to click a
    // specific edge to split, so this is deliberately a fixed choice rather
    // than the `x === f ? 0 : 0` dead ternary that used to sit here (always
    // 0 either way, which read as if it meant something). A specific corner
    // is chosen in the Rules panel, not here.
    onChange({
      ...doc,
      features: doc.features.map((x) => (x.id === f.id ? addCorner(f, 0) : x)),
    });
    say(null);
  }

  function roundSketchCorner(f: Extract<Feature, { kind: 'sketch' }>, corner: number, radius: number) {
    const why = whyCannotRoundCorner(f.points, corner);
    if (why) { say(why); return; }
    // A pin on the corner being rounded away has no surviving point to hold
    // -- filletCorner() drops it rather than silently reassigning it to a
    // trim point the student never chose (Finding 2, sketch gauntlet round
    // 2). Read that BEFORE the call so the message matches what actually
    // happened, not a guess.
    const hadPin = (f.constraints ?? []).some((c) => c.kind === 'lock' && c.corner === corner);
    const next = filletCorner(f, corner, radius);
    onChange({
      ...doc,
      features: doc.features.map((x) => (x.id === f.id ? next : x)),
    });
    say(hadPin ? 'That corner was pinned -- the pin came off when you rounded it away.' : null);
  }

  function mirror(plane: SketchPlane) {
    const why = whyCannotSolidOp(chosen, 'mirror');
    if (why) { say(why); return; }
    const f = newMirror(doc, chosen[0].id, plane);
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    setLastMirrorPlane(plane);
    setMenu(null);
    say(null);
  }

  function repeat(mode: PatternMode) {
    const why = whyCannotSolidOp(chosen, 'repeat');
    if (why) { say(why); return; }
    const f = newPattern(doc, chosen[0].id, mode);
    // A circular pattern of a shape sitting on the axis stacks every copy on
    // the original -- six rows in the list, one shape on screen.
    if (f.mode === 'circular') {
      const nowhere = whyCannotOrbit(chosen[0], f.axis ?? 'z');
      if (nowhere) { say(nowhere); return; }
    }
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    setLastPattern(mode);
    setMenu(null);
    say(null);
  }

  function drillHole() {
    const why = whyCannotSolidOp(chosen, 'drill');
    if (why) { say(why); return; }
    const f = newHole(doc, chosen[0].id);
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    setMenu(null);
    say(null);
  }

  // One feature row, four bores, guaranteed symmetric: the two spacings show
  // up in the Dimensions panel as "corner spacing across/up" for a student to
  // set exactly, instead of dragging four separate holes into approximately
  // the right corners.
  function drillHoleCorners() {
    const why = whyCannotSolidOp(chosen, 'drill');
    if (why) { say(why); return; }
    const f = newHoleCorners(doc, chosen[0].id);
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    setMenu(null);
    say(null);
  }

  function hollow() {
    const why = whyCannotSolidOp(chosen, 'hollow out');
    if (why) { say(why); return; }
    const f = newShell(doc, chosen[0].id);
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    say(null);
  }

  function moveTool(copy: boolean) {
    const why = whyCannotSolidOp(chosen, 'move');
    if (why) { say(why); return; }
    const f = newMove(doc, chosen[0].id, copy);
    onChange({ ...doc, features: [...doc.features, f] });
    setSelected([f.id]);
    setLastMoveCopy(copy);
    setMenu(null);
    say(null);
  }

  function remove() {
    if (!chosen.length) return;
    const gone = new Set(selected);
    const features = doc.features
      .filter((f) => !gone.has(f.id))
      // A combine that lost an input is not a combine any more.
      .filter((f) => f.kind !== 'combine' || f.targets.every((t) => !gone.has(t)));
    onChange({ ...doc, features });
    setSelected([]);
    say(null);
  }

  function move(id: string, by: -1 | 1) {
    const i = doc.features.findIndex((f) => f.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= doc.features.length) return;
    const features = [...doc.features];
    [features[i], features[j]] = [features[j], features[i]];
    // A feature cannot be built before what it is made of. dependsOn() covers
    // every kind that names a target -- combine, hole, extrude, revolve,
    // mirror, pattern, shell, move -- not just combine, so dragging a Hole
    // above the box it drills is caught the same as dragging a Cut above
    // its inputs.
    const seen = new Set<string>();
    for (const f of features) {
      const missing = dependsOn(f).filter((t) => !seen.has(t));
      if (missing.length) {
        const what = missing.map((t) => names[t] ?? t).join(', ');
        say(`That would put ${names[f.id]} before ${what}, which it is built from.`);
        return;
      }
      seen.add(f.id);
    }
    onChange({ ...doc, features });
    say(null);
  }

  function pick(id: string, additive: boolean) {
    setSelected(
      additive
        ? selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
        : [id]
    );
    say(null);
  }

  // Only records the rules. Solving happens where the doc is adopted, which is
  // the one place guaranteed to hold the current points -- solving here would
  // use whatever this render was given, and lose any edit still in flight.
  function setConstraints(f: Extract<Feature, { kind: 'sketch' }>, next: Constraint[]) {
    onChange({
      ...doc,
      features: doc.features.map((x) => (x.id === f.id ? { ...x, constraints: next } : x)),
    });
  }

  const activeSketch =
    chosen.length === 1 && chosen[0].kind === 'sketch' ? chosen[0] : null;

  const canCombine = chosen.length >= 2;
  // Same unconditional-reason rule as whyCannotSolidOp: a gated button never
  // goes silent, even at the most common early state (nothing picked yet).
  const roundBlockedBy = chosen.length !== 1 ? 'Pick one shape to round.' : whyCannotRound(chosen[0]);
  const canRound = roundBlockedBy === null;
  const turnBlockedBy =
    chosen.length !== 1
      ? 'Pick one shape to turn.'
      : chosen[0].kind === 'sphere'
        ? 'A sphere looks the same whichever way you turn it.'
        : null;
  const solidOpBlockedBy = whyCannotSolidOp(chosen, 'use');
  const canSolidOp = solidOpBlockedBy === null;

  // Group visibility for the search filter: a group's divider and wrapper
  // only render when at least one of its tools' names still matches.
  const sketchVisible = ['Sketch', 'Corner', 'Circle'].some(matches);
  const createVisible = [...SHAPE_KINDS.map(shapeLabel), 'Pull', 'Spin'].some(matches);
  const modifyVisible = ['Round', 'Fillet', 'Chamfer', 'Turn', 'Hole', 'Four Corners', 'Hollow'].some(matches);
  // Split so a divider can mark the selection-rule boundary Onshape draws
  // too: Repeat/Mirror/Move work on ONE shape, Join/Cut/Overlap need TWO+.
  const patternSelectVisible = [
    'Repeat', 'Repeat Around', 'Mirror', 'Left-Right', 'Front-Back', 'Top-Bottom', 'Move', 'Copy',
  ].some(matches);
  const patternBoolVisible = ['Join', 'Cut', 'Overlap'].some(matches);
  const patternVisible = patternSelectVisible || patternBoolVisible;

  return (
    <div className="model-editor">
      <div className="model-tools" ref={toolsRef}>
        {sketchVisible && (
          <>
            <div className="model-tool-group">
              {matches('Sketch') && (
                <button onClick={startSketch} title="Draw a flat outline to pull or spin into a solid">
                  <PenLine size={14} /> Sketch
                </button>
              )}
              {matches('Circle') && (
                <button onClick={startCircleSketch} title="Draw a circle to pull or spin into a solid">
                  <Circle size={14} /> Circle
                </button>
              )}
              {matches('Corner') && (
                <button
                  onClick={corner}
                  disabled={
                    chosen.length !== 1 || chosen[0]?.kind !== 'sketch' ||
                    (chosen[0].kind === 'sketch' && chosen[0].shape === 'circle')
                  }
                  title="Add a corner to the selected sketch"
                >
                  <Plus size={14} /> Corner
                </button>
              )}
            </div>
            <div className="model-tool-divider" />
          </>
        )}

        {createVisible && (
          <>
            <div className="model-tool-group">
              <FlyoutButton
                label={shapeLabel(lastShape)}
                icon={shapeIcon(lastShape)}
                onMain={() => addShape(lastShape)}
                disabled={false}
                title={`Add a ${shapeLabel(lastShape).toLowerCase()}`}
                open={menu === 'shape'}
                onToggleOpen={() => toggleMenu('shape')}
                matches={matches}
                searchActive={searchActive}
                variants={SHAPE_KINDS.map((k) => ({
                  id: k,
                  label: shapeLabel(k),
                  icon: shapeIcon(k),
                  onClick: () => addShape(k),
                }))}
              />
              {matches('Pull') && (
                <button
                  onClick={pull}
                  disabled={chosen.length !== 1 || chosen[0]?.kind !== 'sketch'}
                  title="Pull the selected sketch straight up into a solid"
                >
                  <MoveUp size={14} /> Pull
                </button>
              )}
              {matches('Spin') && (
                <button
                  onClick={spin}
                  disabled={chosen.length !== 1 || chosen[0]?.kind !== 'sketch'}
                  title="Spin the selected sketch around to make a solid"
                >
                  <Disc3 size={14} /> Spin
                </button>
              )}
            </div>
            <div className="model-tool-divider" />
          </>
        )}

        {modifyVisible && (
          <>
            <div className="model-tool-group">
              <FlyoutButton
                label={roundLabel(lastRound)}
                icon={roundIcon(lastRound)}
                onMain={() => round(lastRound)}
                disabled={!canRound}
                title={roundBlockedBy ?? roundDescription(lastRound)}
                open={menu === 'round'}
                onToggleOpen={() => toggleMenu('round')}
                matches={matches}
                searchActive={searchActive}
                variants={ROUND_STYLES.map((s) => ({
                  id: s,
                  label: roundLabel(s),
                  icon: roundIcon(s),
                  onClick: () => round(s),
                  title: s === 'fillet' ? 'Round the edges off (fillet)' : 'Slice the edges off at an angle (chamfer)',
                }))}
              />
              {matches('Turn') && (
                <button
                  onClick={turn}
                  disabled={chosen.length !== 1 || !canRotate(chosen[0])}
                  title={turnBlockedBy ?? 'Turn this shape'}
                >
                  <RotateCw size={14} /> Turn
                </button>
              )}
              <FlyoutButton
                label="Hole"
                icon={<CircleDot size={14} />}
                onMain={drillHole}
                disabled={!canSolidOp}
                title={solidOpBlockedBy ?? 'Drill a round hole through the selected solid'}
                open={menu === 'hole'}
                onToggleOpen={() => toggleMenu('hole')}
                matches={matches}
                searchActive={searchActive}
                variants={[
                  {
                    id: 'four-corners', label: 'Four Corners', icon: <Grid2x2 size={14} />,
                    onClick: drillHoleCorners,
                    title: 'Drill four holes at once, evenly spaced from the middle — a bolt pattern with matching offsets on every side',
                  },
                ]}
              />
              {matches('Hollow') && (
                <button
                  onClick={hollow}
                  disabled={!canSolidOp}
                  title={solidOpBlockedBy ?? 'Hollow the selected solid out, leaving a wall'}
                >
                  <PackageOpen size={14} /> Hollow
                </button>
              )}
            </div>
            <div className="model-tool-divider" />
          </>
        )}

        {patternVisible && (
          <>
            {patternSelectVisible && (
              <div className="model-tool-group">
                <FlyoutButton
                  label={patternLabel(lastPattern)}
                  icon={patternIcon(lastPattern)}
                  onMain={() => repeat(lastPattern)}
                  disabled={!canSolidOp}
                  title={solidOpBlockedBy ?? 'Make copies of the selected solid'}
                  open={menu === 'pattern'}
                  onToggleOpen={() => toggleMenu('pattern')}
                  matches={matches}
                  searchActive={searchActive}
                  variants={PATTERN_MODES.map((m) => ({
                    id: m,
                    label: patternLabel(m),
                    icon: patternIcon(m),
                    onClick: () => repeat(m),
                    title: m === 'linear' ? 'Copies in a straight row' : 'Copies around a circle',
                  }))}
                />
                <FlyoutButton
                  label="Mirror"
                  icon={lastMirrorPlane ? mirrorPlaneIcon(lastMirrorPlane) : <FlipHorizontal2 size={14} />}
                  // No remembered plane yet -- the main click opens the picker
                  // instead of guessing, the same way the caret would. Once a
                  // student has chosen once, repeating THEIR choice on click is
                  // a shortcut, not a silent default.
                  onMain={() => (lastMirrorPlane ? mirror(lastMirrorPlane) : toggleMenu('mirror'))}
                  disabled={!canSolidOp}
                  title={
                    solidOpBlockedBy
                      ?? (lastMirrorPlane
                        ? mirrorPlaneTitle(lastMirrorPlane)
                        : 'Pick which way to flip the copy')
                  }
                  open={menu === 'mirror'}
                  onToggleOpen={() => toggleMenu('mirror')}
                  matches={matches}
                  searchActive={searchActive}
                  variants={MIRROR_PLANES.map((pl) => ({
                    id: pl,
                    label: mirrorPlaneLabel(pl),
                    icon: mirrorPlaneIcon(pl),
                    onClick: () => mirror(pl),
                    title: mirrorPlaneTitle(pl),
                  }))}
                />
                <FlyoutButton
                  label={moveLabel(lastMoveCopy)}
                  icon={moveIcon(lastMoveCopy)}
                  onMain={() => moveTool(lastMoveCopy)}
                  disabled={!canSolidOp}
                  title={solidOpBlockedBy ?? (lastMoveCopy ? 'Add a copy, shifted over' : 'Shift the selected solid')}
                  open={menu === 'move'}
                  onToggleOpen={() => toggleMenu('move')}
                  matches={matches}
                  searchActive={searchActive}
                  variants={[
                    { id: 'move', label: 'Move', icon: <MoveIcon size={14} />, onClick: () => moveTool(false), title: 'Shift the selected solid' },
                    { id: 'copy', label: 'Copy', icon: <CopyIcon size={14} />, onClick: () => moveTool(true), title: 'Add a copy, shifted over' },
                  ]}
                />
              </div>
            )}
            {/* The selection rule changes here: everything to the left needs
                exactly one shape, everything to the right needs two or more.
                That's the boundary a beginner hits first ("why is Join
                greyed out, I picked a shape") -- give it a visible edge. */}
            {patternSelectVisible && patternBoolVisible && <div className="model-tool-divider" />}
            {patternBoolVisible && (
              <div className="model-tool-group">
                <FlyoutButton
                  label={boolLabel(lastBoolOp)}
                  icon={boolIcon(lastBoolOp)}
                  onMain={() => combine(lastBoolOp)}
                  disabled={!canCombine}
                  title={canCombine ? boolLabel(lastBoolOp) : 'Pick two shapes first — click one, then hold Shift (or Ctrl, or Cmd) and click another.'}
                  open={menu === 'bool'}
                  onToggleOpen={() => toggleMenu('bool')}
                  matches={matches}
                  searchActive={searchActive}
                  variants={BOOL_OPS.map((op) => ({
                    id: op,
                    label: boolLabel(op),
                    icon: boolIcon(op),
                    onClick: () => combine(op),
                    title:
                      op === 'union' ? 'Join the selected shapes into one'
                      : op === 'subtract' ? 'Cut the later shapes out of the first'
                      : 'Keep only where they overlap',
                  }))}
                />
              </div>
            )}
          </>
        )}

        <div className="model-tool-group model-tool-end">
          <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
            <Undo2 size={14} />
          </button>
          <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            <Redo2 size={14} />
          </button>
          <button onClick={remove} disabled={!chosen.length} title="Delete the selected" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>

        <div className="model-tool-search">
          <Search size={13} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools..."
            aria-label="Search tools"
          />
          <kbd>Alt+C</kbd>
        </div>
      </div>

      {note && <p className="model-note">{note}</p>}

      <ol className="model-list">
        {doc.features.length === 0 && (
          <li className="model-empty">
            Nothing here yet. Add a box, then a cylinder, select both and press{' '}
            <strong>Cut</strong> to drill a hole through it.
          </li>
        )}
        {doc.features.map((f, i) => {
          const on = selected.includes(f.id);
          return (
            <li
              key={f.id}
              className={
                'model-row' + (on ? ' is-on' : '') + (shownIds.has(f.id) ? '' : ' is-consumed')
              }
              onClick={(e) => pick(f.id, e.ctrlKey || e.metaKey || e.shiftKey)}
            >
              <span className="model-step">{i + 1}</span>
              <span className="model-name">
                {names[f.id]}
                {f.kind === 'sketch' && (
                  <em className="model-detail">
                    {' '}{f.points.length} corners, {f.plane}
                    {f.constraints?.length ? `, ${f.constraints.length} rules` : ''}
                  </em>
                )}
                {f.kind === 'extrude' && (
                  <em className="model-detail"> {names[f.target] ?? f.target}</em>
                )}
                {f.kind === 'revolve' && (
                  <em className="model-detail"> {names[f.target] ?? f.target}, {f.angle}°</em>
                )}
                {f.kind === 'mirror' && (
                  <em className="model-detail">
                    {' '}{names[f.target] ?? f.target}, {mirrorPlaneLabel(f.plane)}
                  </em>
                )}
                {f.kind === 'pattern' && (
                  <em className="model-detail">
                    {' '}{names[f.target] ?? f.target} × {f.count}
                    {f.mode === 'circular' ? ' around' : ''}
                  </em>
                )}
                {f.kind === 'hole' && (
                  <em className="model-detail">
                    {' '}⌀{f.diameter}{f.corners ? ' × 4 corners' : ''} in {names[f.target] ?? f.target}
                  </em>
                )}
                {f.kind === 'shell' && (
                  <em className="model-detail"> {names[f.target] ?? f.target}, wall {f.thickness}</em>
                )}
                {f.kind === 'move' && (
                  <em className="model-detail">
                    {' '}{names[f.target] ?? f.target}{f.copy ? ' (copy)' : ''}
                  </em>
                )}
                {f.kind === 'combine' && (
                  <em className="model-detail">
                    {' '}
                    {f.targets.map((t) => names[t] ?? t).join(f.op === 'subtract' ? ' − ' : f.op === 'union' ? ' + ' : ' ∩ ')}
                  </em>
                )}
                {canRotate(f) && f.rotate && f.rotate.some((v) => v !== 0) ? (
                  <em className="model-detail"> turned</em>
                ) : null}
                {'round' in f && f.round ? (
                  <em className="model-detail"> {f.roundStyle === 'chamfer' ? 'chamfered' : 'filleted'}</em>
                ) : null}
              </span>
              <span className="model-move">
                <button
                  onClick={(e) => { e.stopPropagation(); move(f.id, -1); }}
                  disabled={i === 0}
                  aria-label={`Move ${names[f.id]} earlier`}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); move(f.id, 1); }}
                  disabled={i === doc.features.length - 1}
                  aria-label={`Move ${names[f.id]} later`}
                >
                  <ChevronDown size={12} />
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      {activeSketch && activeSketch.shape !== 'circle' && (
        <SketchConstraints
          points={activeSketch.points}
          bulges={activeSketch.bulges}
          constraints={activeSketch.constraints ?? []}
          onChange={(next) => setConstraints(activeSketch, next)}
          onRound={(corner, radius) => roundSketchCorner(activeSketch, corner, radius)}
        />
      )}

      <style>{`
        .model-editor { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }
        .model-tools {
          display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px;
          border-bottom: 1px solid var(--border); flex-shrink: 0; position: relative;
        }
        .model-tool-group { display: inline-flex; gap: 4px; align-items: center; }
        .model-tool-divider { align-self: stretch; width: 1px; background: #44475a; margin: 2px 0; }
        .model-tool-end { margin-left: auto; }
        .model-tools button {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; font-size: 12px;
          background: transparent; color: var(--text);
          border: 1px solid #44475a; border-radius: 4px; cursor: pointer;
        }
        .model-tools button:hover:not(:disabled) { background: #44475a; }
        .model-tools button:disabled { opacity: 0.4; cursor: not-allowed; }
        .model-flyout { position: relative; display: inline-flex; }
        .model-flyout > button:first-child { border-radius: 4px 0 0 4px; border-right: none; }
        .model-flyout-caret {
          border-radius: 0 4px 4px 0 !important; padding: 5px 4px !important;
        }
        .model-flyout-menu {
          position: absolute; top: calc(100% + 4px); left: 0; z-index: 20;
          display: flex; flex-direction: column; gap: 2px;
          background: #282a36; border: 1px solid #44475a; border-radius: 4px;
          padding: 4px; min-width: 150px; box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        }
        .model-flyout-menu button {
          justify-content: flex-start; border: none; width: 100%;
        }
        .model-tool-search {
          display: inline-flex; align-items: center; gap: 6px;
          margin-left: 6px; padding: 4px 8px; font-size: 12px;
          background: #1e1f29; border: 1px solid #44475a; border-radius: 4px;
          color: #6272a4;
        }
        .model-tool-search input {
          background: transparent; border: none; outline: none;
          color: var(--text); font-size: 12px; width: 108px;
        }
        .model-tool-search input::placeholder { color: #6272a4; }
        .model-tool-search kbd {
          font-size: 10px; color: #6272a4; border: 1px solid #44475a;
          border-radius: 3px; padding: 1px 4px; font-family: inherit;
        }
        .model-note {
          margin: 0; padding: 7px 10px; font-size: 12px; line-height: 1.45;
          color: #ffb86c; background-color: #3a2f22;
          border-left: 2px solid #ffb86c; flex-shrink: 0;
        }
        .model-list { margin: 0; padding: 6px; list-style: none; overflow-y: auto; flex: 1 1 auto; }
        .model-empty { padding: 14px 10px; color: #6272a4; font-size: 12px; line-height: 1.6; }
        .model-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 8px; border-radius: 4px; cursor: pointer;
          font-size: 12px; color: var(--text);
        }
        .model-row:hover { background: #343746; }
        .model-row.is-on { background: #44475a; }
        /* Consumed by a later step, so it is no longer its own shape. */
        .model-row.is-consumed .model-name { color: #6272a4; }
        .model-step {
          flex: 0 0 18px; text-align: right; color: #6272a4;
          font-variant-numeric: tabular-nums; font-size: 11px;
        }
        .model-name { flex: 1 1 auto; min-width: 0; }
        .model-detail { color: #6272a4; font-style: normal; }
        .model-move { display: inline-flex; gap: 2px; }
        .model-move button {
          padding: 2px; line-height: 0; background: transparent;
          border: 0; color: #6272a4; cursor: pointer; border-radius: 3px;
        }
        .model-move button:hover:not(:disabled) { color: var(--text); background: #6272a4; }
        .model-move button:disabled { opacity: 0.25; cursor: default; }
      `}</style>
    </div>
  );
}
