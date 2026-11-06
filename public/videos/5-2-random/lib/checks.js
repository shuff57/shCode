// checks.js: the sorter and grid check types for the lesson engine (IM1-2.2 LIB).
// Ported from _workspace/papermorph-trials/stats-1.1-questions/site/lib/qkit.js (sorterQ, classifyQ) onto this engine, which has the
// theme-toggle playhead fix. Differences from the stats trial:
//   * built for quiz() in a beat, not for a JSON spec page: sortCards(spec) / classifyRows(spec) return (body, api) => ctl;
//   * save()/load(): a theme toggle (setTheme -> seek) rebuilds the beat, and the placements / picks come back (engine P.save, P.resume);
//   * the spec is validated when the check is built, so a typo throws a sentence that names the item instead of drawing nothing.
// Both are keyboard reachable, give per-item / per-row hints for each wrong choice, and score the first try (right/total).
// The engine's older number-set sorter() and toggle grid() are untouched (and unrelated).
'use strict';

/* ---------- small helpers (prefixed ck so they cannot clash with lesson.js) ---------- */
const ckW = (str, size, weight = 500) => { ctx2d.font = `${weight} ${size}px ${UI}`; return ctx2d.measureText(str).width; };
const CK_HUES = ['whole', 'nat', 'irr', 'rat', 'int', 'real'];     // bin colours, in order
function ckChip(parent, str, { x = 0, y = 0, size = 26, color = COL.chalk } = {}) {
  const g = G(parent, { x, y });
  const w = ckW(str, size) + 40, hh = Math.round(size * 1.6);
  const rect = mk('rect', { x: -w / 2, y: -hh / 2, width: w, height: hh, rx: hh / 2, fill: COL.board, stroke: color, 'stroke-width': 2.5 }, g);
  T(g, str, { y: size * .34, size, anchor: 'middle' });
  Object.assign(g, { _rect: rect, _w: w, _h: hh });
  return g;
}
function ckBox(p, x, y, w, hh, color, { fill = 'none', r = 14, width = 2.6 } = {}) {
  const g = inkG(p);
  mk('rect', { x, y, width: w, height: hh, rx: r, fill, stroke: color, 'stroke-width': width }, g);
  return g;
}
const ckNote = () => h('p', 'qk-note');
const ckCap = s => typeof s === 'string' && s ? s[0].toUpperCase() + s.slice(1) : s;   // hints are authored to follow 'item: ', so they may start lower case
const ckSay = (n, str) => { n.textContent = str; n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; };

/* ---------- validation ---------- */
function ckProblems(kind, q) {
  const P = [], need = (c, m) => { if (!c) P.push(m); return c; };
  if (!need(q && typeof q === 'object', `${kind}: needs a spec object`)) return P;
  if (kind === 'sorter') {
    const keys = (q.bins || []).map(b => b.key);
    need(keys.length >= 2 && keys.length <= 6, 'sortCards: needs 2 to 6 "bins" ({ key, label })');
    need(new Set(keys).size === keys.length, 'sortCards: bin keys must be unique');
    need((q.items || []).length >= 2, 'sortCards: needs at least 2 "items"');
    (q.items || []).forEach((it, i) => need(keys.includes(it.answer), `sortCards: item ${i + 1} "${it.text}" has answer "${it.answer}", which is not a bin key (${keys.join(', ')})`));
  } else if (kind === 'classify') {
    const keys = (q.columns || []).map(c => c.key);
    need(keys.length >= 2 && keys.length <= 9, 'classifyRows: needs 2 to 9 "columns" ({ key, label })');
    need((q.rows || []).length >= 1, 'classifyRows: needs "rows"');
    (q.rows || []).forEach((r, i) => need(keys.includes(r.answer), `classifyRows: row ${i + 1} "${r.text}" has answer "${r.answer}", which is not a column key (${keys.join(', ')})`));
  }
  return P;
}
// Wrong answers that have no authored hint (they fall back to a generic line). Returns strings; e2e prints them as a to-do list.
function ckGaps(kind, q) {
  const out = [];
  if (kind === 'sorter') { const keys = q.bins.map(b => b.key); q.items.forEach(it => keys.filter(k => k !== it.answer && !(it.hints || {})[k] && !it.hint).forEach(k => out.push(`${it.text} -> ${k}`))); }
  if (kind === 'classify') { const keys = q.columns.map(c => c.key); q.rows.forEach(r => keys.filter(k => k !== r.answer && !(r.hints || {})[k] && !r.hint).forEach(k => out.push(`${r.text} -> ${k}`))); }
  return out;
}

/* sortCards(spec) -> builder. Drag (or press 1..n) every card into a bin, then Check.
   spec: { bins: [{ key, label, note?, hotkey? }], items: [{ text, answer: binKey, hints?: { binKey: text }, hint?: text }], why?: text }
   Use with the full stage: the beat's run() starts with panel(-1) (previous picture already gone), the ask uses SORT_SCREEN. */
const sortCards = q => {
  const probs = ckProblems('sorter', q);
  if (probs.length) throw new Error(probs.join('; '));
  return (body, api) => {
    const L = qlayer(), X0 = 60, X1 = 1210, TRAY_Y = 136;
    const bins = q.bins.map((b, j) => ({ ...b, hot: b.hotkey || String(j + 1), color: COL[CK_HUES[j % CK_HUES.length]] }));
    const n = bins.length, GAP = 30, BX0 = 150, binW = (X1 - BX0 - GAP * (n - 1)) / n;
    let size = 26;
    while (size > 18 && Math.max(...q.items.map(it => ckW(it.text, size) + 40)) > binW - 28) size--;
    const chipH = Math.round(size * 1.6), STEP = chipH + 16;
    // tray: centred rows of cards across the top
    const ws = q.items.map(it => ckW(it.text, size) + 40), rowsOf = [[]];
    let x = X0;
    ws.forEach((w, i) => { if (x + w > X1 && x > X0) { rowsOf.push([]); x = X0; } rowsOf[rowsOf.length - 1].push(i); x += w + 18; });
    const home = [];
    rowsOf.forEach((r, ri) => {
      const tot = r.reduce((a, i) => a + ws[i], 0) + 18 * (r.length - 1);
      let xx = (X0 + X1) / 2 - tot / 2;
      r.forEach(i => { home[i] = [xx + ws[i] / 2, TRAY_Y + ri * STEP]; xx += ws[i] + 18; });
    });
    const Y0 = TRAY_Y + (rowsOf.length - 1) * STEP + chipH / 2 + 30, Y1 = 872;
    const slotStep = Math.min(chipH + 10, (Y1 - 24 - (Y0 + 100)) / Math.max(1, q.items.length - 1));
    const svg = $('stage');
    const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    bins.forEach((b, j) => {
      b.x = BX0 + j * (binW + GAP); b.y = Y0; b.w = binW; b.h = Y1 - Y0;
      ckBox(L, b.x, b.y, b.w, b.h, b.color, { fill: 'transparent' });
      const hit = mk('rect', { x: b.x, y: b.y, width: b.w, height: b.h, fill: 'transparent', class: 'qk-bin' }, L);
      hit.addEventListener('click', () => { if (sel && !locked) place(sel, j); });
      const badge = G(L, { x: b.x + 34, y: b.y + 40 });
      mk('circle', { r: 17, fill: COL.board, stroke: b.color, 'stroke-width': 2 }, badge);
      T(badge, b.hot, { y: 7.5, size: 21, fill: b.color, anchor: 'middle', weight: 700 });
      T(L, b.label, { x: b.x + 64, y: b.y + 50, size: 32, fill: b.color, weight: 600 });
      if (b.note) T(L, b.note, { x: b.x + 64, y: b.y + 82, size: 21, fill: COL.dim });
    });
    const binAt = (px, py) => bins.findIndex(b => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h);
    let sel = null, drag = null, locked = false, order = 0;
    const note = ckNote();
    body.append(note);
    const outline = (c, colr, w = 2.5) => { c._rect.setAttribute('stroke', colr); c._rect.setAttribute('stroke-width', w); };
    const label = c => c.setAttribute('aria-label', `${c.it.text}, ${c.bin == null ? 'not placed' : 'in ' + bins[c.bin].label}. Press ${bins.map(b => b.hot).join(' or ')} to place.`);
    // Selecting only re-outlines. It must not re-parent the card: moving a focused node blurs it, which breaks Tab.
    // Only a drag raises a card to the top.
    const choose = c => { if (sel) outline(sel, sel._state || COL.chalk, sel._state ? 4 : 2.5); sel = c; if (sel) outline(sel, COL.task, 4.5); };
    const move = (c, x2, y2, delay = 0, now = false) => { if (STILL || now) put(c, { x: x2, y: y2 }); else fx(c, { x: x2, y: y2 }, delay, .35, out); };
    const relayout = (now = false) => {
      bins.forEach((b, j) => chips.filter(c => c.bin === j).sort((a, c) => a.order - c.order)
        .forEach((c, k) => move(c, b.x + b.w / 2, b.y + 100 + k * slotStep + chipH / 2, 0, now)));
    };
    const clearMarks = c => { c.querySelector('.mark')?.remove(); c._state = null; outline(c, c === sel ? COL.task : COL.chalk, c === sel ? 4.5 : 2.5); };
    const place = (c, j) => {
      c.bin = j; c.order = order++;
      if (j == null || j < 0) { c.bin = null; move(c, ...c.home); }
      clearMarks(c); label(c); relayout(); ckSay(note, '');
    };
    const nextOpen = c => {
      const i = chips.indexOf(c);
      for (let k = 1; k <= chips.length; k++) { const d = chips[(i + k) % chips.length]; if (d.bin == null) return d; }
      return null;
    };
    const focusCheck = () => body.closest('.card')?.querySelector('.acts .btn:not([hidden])')?.focus({ preventScroll: true });
    const chips = q.items.map((it, i) => {
      const c = ckChip(L, it.text, { x: home[i][0], y: home[i][1], size });
      Object.assign(c, { it, home: home[i], bin: null, order: 0 });
      c.classList.add('tok', 'qk-chip');
      c.setAttribute('tabindex', 0);
      c.setAttribute('role', 'button');
      label(c);
      c.addEventListener('focus', () => { if (!locked && sel !== c) choose(c); });
      c.addEventListener('keydown', e => {
        if (e.key === ' ') { e.preventDefault(); if (!locked) choose(c); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!locked) ctl.check(); }
      });
      c.addEventListener('pointerdown', e => {
        if (locked) return;
        e.preventDefault();
        const p = pt(e);
        drag = { dx: p.x - st(c).x, dy: p.y - st(c).y, sx: p.x, sy: p.y, moved: false };
        L.append(c);   // re-parent before capturing: moving a node drops its capture
        c.setPointerCapture(e.pointerId);
      });
      c.addEventListener('pointermove', e => {
        if (!drag) return;
        const p = pt(e);
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
        if (drag.moved) put(c, { x: p.x - drag.dx, y: p.y - drag.dy });
      });
      c.addEventListener('pointerup', e => {
        if (!drag) return;
        const moved = drag.moved;
        drag = null;
        const nxt = chips[chips.indexOf(c) + 1];
        if (nxt && nxt.parentNode === L) L.insertBefore(c, nxt);   // back to its place in the Tab order (the drag raised it)
        if (moved) { const p = pt(e); place(c, binAt(p.x, p.y)); if (sel === c) choose(null); }
        else choose(c);   // a click always picks (no toggle-off)
      });
      return c;
    });
    const ctl = {
      check() {
        const open = chips.filter(c => c.bin == null);
        if (open.length) { ckSay(note, `Place every card first (${open.length} left).`); return; }
        ckSay(note, '');
        finishFx();   // land any card still sliding to its slot, or the shake below starts from a mid-slide x and leaves it there
        let right = 0;
        const notes = h('ul');
        chips.forEach(c => {
          c.querySelector('.mark')?.remove();
          const key = bins[c.bin].key, ok = key === c.it.answer;
          right += ok;
          c._state = ok ? COL.good : COL.bad;
          outline(c, c._state, 4);
          if (ok) pulseFx(c, 1.08); else shakeFx(c);
          T(c, ok ? '✓' : '✗', { x: c._w / 2 + 8, y: 9, size: 28, fill: ok ? COL.good : COL.bad, weight: 700 }).classList.add('mark');
          if (!ok) notes.append(h('li', '', [h('b', '', c.it.text + ': '), (c.it.hints || {})[key] || c.it.hint || `not ${bins[c.bin].label}.`]));
        });
        const all = right === chips.length;
        api.grade(all, all ? [q.why || ''] : [`${right} of ${chips.length} in the right bin.`, notes], { right, total: chips.length });
        if (!all) {
          const firstBad = chips.find(c => bins[c.bin].key !== c.it.answer);
          if (firstBad) { choose(firstBad); firstBad.focus({ preventScroll: true }); }
        }
      },
      reveal() {
        chips.forEach(c => { c.bin = bins.findIndex(b => b.key === c.it.answer); c.order = order++; c.querySelector('.mark')?.remove(); c._state = COL.good; outline(c, COL.good, 4); label(c); });
        choose(null); relayout();
        return ['every card is now in its bin. ', q.why || ''];
      },
      lock() { locked = true; choose(null); chips.forEach(c => c.setAttribute('tabindex', -1)); },
      // Theme toggle: the scene is rebuilt, so remember which bin each card is in (and the order within a bin).
      save: () => chips.map(c => [c.bin, c.order]),
      load(v) {
        v.forEach(([bin, ord], i) => { chips[i].bin = bin; chips[i].order = ord; order = Math.max(order, ord + 1); label(chips[i]); });
        relayout(true);
        choose(chips.find(c => c.bin == null) || null);
      },
      key(e) {
        if (locked) return false;
        const j = bins.findIndex(b => b.hot.toLowerCase() === e.key.toLowerCase());
        if (j >= 0) {
          if (!sel) { ckSay(note, 'Pick a card first (Tab to it, or click it).'); return true; }
          const c = sel;
          place(c, j);
          const nx = nextOpen(c);
          if (nx) { choose(nx); nx.focus({ preventScroll: true }); } else { choose(null); focusCheck(); }
          return true;
        }
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (d) { const i = sel ? chips.indexOf(sel) : d > 0 ? -1 : 0; const c = chips[(i + d + chips.length) % chips.length]; choose(c); c.focus({ preventScroll: true }); return true; }
        return false;
      },
    };
    // Pre-select the first card. Focus only once the part has started: a focused card would swallow the Space that starts it from the cover.
    requestAnimationFrame(() => { choose(chips.find(c => c.bin == null) || null); if (P.started && sel) sel.focus({ preventScroll: true }); });
    return ctl;
  };
};

/* classifyRows(spec) -> builder. One row of options per statement; pick one column in every row, then Check.
   spec: { columns: [{ key, label, hotkey? }], rows: [{ text, answer: columnKey, hints?: { columnKey: text }, hint?, why? }], why?: text }
   Use in a card (SCREEN, RIGHT, or the side card): quiz(SCREEN, [{ id, prompt, build: classifyRows(spec) }], done). */
const classifyRows = q => {
  const probs = ckProblems('classify', q);
  if (probs.length) throw new Error(probs.join('; '));
  return (body, api) => {
    const cols = q.columns.map((c, j) => ({ ...c, hot: c.hotkey || String(j + 1) }));
    const wrap = h('div', 'grid text qk-classify');
    const note = ckNote();
    let cur = 0, locked = false;
    const rows = q.rows.map((it, ri) => {
      const opts = h('div', 'opts'), mark = h('div', 'mark'), why = h('div', 'why');
      const r = { it, pick: null, mark, why, wasWrong: false };
      r.set = j => {
        r.pick = j;
        r.bs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === j)));
        mark.textContent = ''; mark.className = 'mark'; why.replaceChildren(); ckSay(note, '');
      };
      r.bs = cols.map((c, j) => {
        const b = h('button', 'opt', [kbd(c.hot), c.label]);
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => { if (locked) return; r.set(j); cur = ri; showCur(); };
        opts.append(b);
        return b;
      });
      r.el = h('div', 'row', [h('div', 'num', [rich(it.text, 26)]), opts, mark, why]);
      r.el.setAttribute('role', 'group');
      r.el.setAttribute('aria-label', `Row ${ri + 1}: ${[].concat(it.text).join('')}`);
      r.el.addEventListener('click', () => { if (!locked) { cur = ri; showCur(); } });
      wrap.append(r.el);
      return r;
    });
    const showCur = () => rows.forEach((r, i) => r.el.classList.toggle('cur', !locked && rows.length > 1 && i === cur));
    showCur();
    body.append(wrap, note);
    const hintFor = (it, key) => ckCap((it.hints || {})[key] || it.hint || `It is not ${cols.find(c => c.key === key).label.toLowerCase()}.`);
    const judge = r => {
      const key = cols[r.pick].key, ok = key === r.it.answer;
      r.mark.className = 'mark ' + (ok ? 'good' : 'bad');
      r.mark.textContent = ok ? '✓' : '✗';
      r.why.replaceChildren(ok ? '' : rich(hintFor(r.it, key), 21));
      if (!ok) r.wasWrong = true;
      return ok;
    };
    return {
      check() {
        const open = rows.filter(r => r.pick == null).length;
        if (open) { ckSay(note, `Choose an answer in every row first (${open} left).`); return; }
        const right = rows.filter(judge).length, all = right === rows.length;
        api.grade(all, all ? [q.why || ''] : [`${right} of ${rows.length} right. Each row marked ✗ has a hint.`], { right, total: rows.length });
        if (!all) { cur = rows.findIndex(r => cols[r.pick].key !== r.it.answer); showCur(); }
      },
      reveal() {
        rows.forEach(r => { r.set(cols.findIndex(c => c.key === r.it.answer)); judge(r); if (r.wasWrong && r.it.why) r.why.replaceChildren(rich(r.it.why, 21)); });
        return ['the correct column is now chosen in every row. ', q.why || ''];
      },
      lock() { locked = true; showCur(); rows.forEach(r => r.bs.forEach(b => { b.disabled = true; })); },
      save: () => ({ cur, picks: rows.map(r => r.pick) }),
      load(v) { cur = v.cur; v.picks.forEach((j, i) => { if (j != null) rows[i].set(j); }); showCur(); },
      hint: [...(rows.length > 1 ? [kbd('↑'), kbd('↓'), ' row, '] : []), ...(/\d/.test(cols[0].hot) ? [kbd(cols[0].hot), '–', kbd(cols[cols.length - 1].hot)] : cols.map(c => kbd(c.hot))), ' choose'],
      key(e) {
        if (locked) return false;
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length > 1) {
          cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length; showCur(); return true;
        }
        const j = cols.findIndex(c => c.hot.toLowerCase() === e.key.toLowerCase());
        if (j < 0) return false;
        rows[cur].set(j);
        if (cur < rows.length - 1) cur++;
        showCur();
        return true;
      },
    };
  };
};

// Position constants for the 2.2 pairing of a graph on the left and a card on the right (stage px).
const GRAPH_CARD = { x: 1030, y: 110, w: 540, cls: 'side' };   // card at the right edge; the graph's box ends near x 1000
