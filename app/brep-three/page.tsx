'use client';

// TEMPORARY SPIKE PAGE, the three.js twin of app/brep-test/page.tsx. Same
// hardcoded ModelDoc, same buttons, same stats readout -- the only thing that
// differs between the two pages is which renderer draws the result, which is
// the whole point: it makes a side-by-side measurement possible. Not linked
// from anywhere a student reaches; delete alongside brep-test once the
// mouse-built (Build mode) UI picks a renderer for real.
//
// See components/model/BrepViewportThree.tsx for the component under test.
// app/brep-test/page.tsx is under a measurement freeze while a harness times
// it -- do not edit that file to keep this one in sync; copy forward instead.

import { useState } from 'react';
import BrepViewportThree, { type BrepViewportStats } from '../../components/model/BrepViewportThree';
import {
  EMPTY_DOC,
  newExtrude,
  newRectangleSketch,
  nextId,
  type Feature,
  type ModelDoc,
  type Vec3,
} from '../../lib/model-types';

/** A sketch, a pull, a box, and a cut -- four features so the boolean has two
 *  real solids to subtract, one of them coming straight through an extrude.
 *  Identical to app/brep-test/page.tsx's buildInitialDoc(). */
function buildInitialDoc(): ModelDoc {
  let doc: ModelDoc = { ...EMPTY_DOC, features: [] };

  const sketch = newRectangleSketch(doc, 'xy', [-20, -15], [20, 15]);
  if (!sketch) throw new Error('degenerate starter rectangle');
  doc = { ...doc, features: [...doc.features, sketch] };

  const extrude = newExtrude(doc, sketch.id);
  extrude.height = 20;
  doc = { ...doc, features: [...doc.features, extrude] };

  // Narrower than the sketch in x, and taller than it in y+z reach, so the
  // cut takes a notch out of one corner instead of slicing the extrude
  // clean in half -- an L-shaped result actually exercises the boolean
  // rather than degenerating into a plain box.
  const box: Feature = {
    id: nextId(doc, 'box'), kind: 'box', size: [20, 40, 10], center: [10, 0, 15],
  };
  doc = { ...doc, features: [...doc.features, box] };

  const cut: Feature = {
    id: nextId(doc, 'cut'), kind: 'combine', op: 'subtract', targets: [extrude.id, box.id],
  };
  doc = { ...doc, features: [...doc.features, cut] };

  return doc;
}

export default function BrepThreePage() {
  const [doc, setDoc] = useState<ModelDoc>(buildInitialDoc);
  const [stats, setStats] = useState<BrepViewportStats | null>(null);
  const [rebuilds, setRebuilds] = useState(0);

  function bumpHeight(delta: number) {
    setDoc((d) => ({
      ...d,
      features: d.features.map((f) => (
        f.kind === 'extrude' ? { ...f, height: Math.max(4, f.height + delta) } : f
      )),
    }));
    setRebuilds((n) => n + 1);
  }

  function bumpBoxWidth(delta: number) {
    setDoc((d) => ({
      ...d,
      features: d.features.map((f) => {
        if (f.kind !== 'box') return f;
        const size: Vec3 = [Math.max(10, f.size[0] + delta), f.size[1], f.size[2]];
        return { ...f, size };
      }),
    }));
    setRebuilds((n) => n + 1);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#282a36', color: '#f8f8f2', font: '13px ui-monospace, Menlo, Consolas, monospace' }}>
      <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid #44475a', padding: 16, overflow: 'auto' }}>
        <h1 style={{ fontSize: 15, margin: '0 0 4px' }}>BrepViewportThree spike</h1>
        <p style={{ color: '#6272a4', margin: '0 0 16px' }}>
          Temporary verification page. Not linked from the app. three.js renderer --
          compare against /brep-test/ (@jscad/regl-renderer) on the same document.
        </p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#8be9fd', marginBottom: 6 }}>Pull height (extrude)</div>
          <button onClick={() => bumpHeight(-5)} style={btnStyle}>-5</button>
          <button onClick={() => bumpHeight(5)} style={btnStyle}>+5</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#8be9fd', marginBottom: 6 }}>Box width (cutting tool)</div>
          <button onClick={() => bumpBoxWidth(-5)} style={btnStyle}>-5</button>
          <button onClick={() => bumpBoxWidth(5)} style={btnStyle}>+5</button>
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #44475a' }}>
          <div style={{ color: '#8be9fd', marginBottom: 6 }}>onStats (last rebuild)</div>
          {stats ? (
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              <li>build: {stats.buildMs} ms</li>
              <li>mesh: {stats.meshMs} ms</li>
              <li>draw: {stats.drawMs} ms</li>
              <li>triangles: {stats.triangles}</li>
            </ul>
          ) : (
            <div style={{ color: '#6272a4' }}>waiting for first build…</div>
          )}
          <div style={{ color: '#6272a4', marginTop: 8 }}>manual rebuilds triggered: {rebuilds}</div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <BrepViewportThree doc={doc} onStats={setStats} />
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#bd93f9', color: '#282a36', border: 0, borderRadius: 4,
  padding: '5px 12px', font: 'inherit', fontWeight: 700, cursor: 'pointer', marginRight: 8,
};
