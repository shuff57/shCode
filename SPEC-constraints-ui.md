# SPEC — Rules-panel UI for pair constraints (equal / parallel / perpendicular)

Repo root, absolute: `C:/Users/shuff/Documents/GitHub/shCode`

**If any path in this spec does not exist, STOP and say so rather than guessing
a different one.** A wrong guess here burns the whole run.

## The one file you may edit

`C:/Users/shuff/Documents/GitHub/shCode/components/model/SketchConstraints.tsx`

**Read it in full before writing anything.** It is 335 lines and its comments
carry decisions you must not undo.

## Background

`lib/sketch-solve.ts` declares seven constraint kinds. The solver honours all
seven. The Rules panel offers controls for four:

| kind | control today |
| --- | --- |
| `horizontal` | ↔ button, per-edge table row |
| `vertical` | ↕ button, per-edge table row |
| `length` | text box, per-edge table row |
| `lock` | "Pin a corner" button row |
| `equal` | **none** |
| `parallel` | **none** |
| `perpendicular` | **none** |

`equal` has been marked shipped for some time while being unreachable — a
student could not create it, see it, or remove it. `parallel` and
`perpendicular` were added to the solver in the last pass and are in the same
state. All three are about a PAIR of edges, which is why none of them fit the
existing one-row-per-edge table.

There is a check that fails on exactly this, and it is your acceptance gate:

```
cd C:/Users/shuff/Documents/GitHub/shCode && node scripts/check-constraint-ui.mjs
```

It currently exits 1 naming `equal`, `parallel`, `perpendicular`. It must exit 0
when you are done. **Do not edit that script** — it strips comments before
looking, so naming a kind in a comment will not satisfy it, and that is
deliberate.

## What to build

A pair-rule grid: a lower-triangular matrix of buttons, one cell per unordered
pair of edges. Clicking a cell cycles that pair through the three pair rules and
back to none.

### 1. Placement

Immediately after the closing `</table>` and **before** `<div className="sk-pins">`.
Rules about edges group together; the corner operations (pin / round / chamfer)
stay below them.

### 2. Canonical pair ordering — the load-bearing detail

Always store the pair with the lower edge index in `edge` and the higher in
`other`:

```ts
const lo = Math.min(a, b);
const hi = Math.max(a, b);
```

Every read and every write goes through that normalisation. If a pair is ever
stored as `{edge: 3, other: 1}` while a lookup asks for `{edge: 1, other: 3}`,
the cell renders as empty while the constraint is live in the solver, and the
student gets a shape being pulled by a rule the panel says does not exist. The
existing `has()` helper at the top of the file only inspects `c.edge`, so it is
**not** usable for pair kinds — write a separate `pairKind(cs, lo, hi)` helper
rather than widening `has()`.

### 3. The cycle

```
none → equal → parallel → perpendicular → none
```

One click advances one step. Setting any pair rule removes whatever pair rule
that same pair already had — the three are alternatives, not a stack, exactly
like the `horizontal`/`vertical` contradiction the existing `toggle()` already
handles. Constraints on *other* pairs are untouched.

### 4. Cell contents

Reuse the symbols `describe()` in `lib/sketch-solve.ts` already uses, so the
panel and any message agree:

| state | cell shows |
| --- | --- |
| none | empty (but the button keeps its size — do not collapse the grid) |
| `equal` | `=` |
| `parallel` | `∥` |
| `perpendicular` | `⊥` |

### 5. Curved edges

An arc has no single direction, so parallel and perpendicular are meaningless
on one, and `equal` on an arc's chord would scale its radius. Disable a cell
when **either** of its two edges is curved (`Boolean(bulges?.[e])`), and give it
a `title` saying why. Follow the pattern the ↔/↕ buttons already use with
`curvedTitle`.

Note the asymmetry the existing Length box documents in its comment: it stays
live when a value is already set, because the "remove one to settle it" note
must name a control the student can still use. **Apply the same reasoning
here** — if a pair already carries a rule, its cell must stay clickable even
when an edge is curved, so the rule can be cycled off. A pair with no rule and a
curved edge is disabled.

### 6. Labelling

- A heading above the grid: `Rules between two edges:`
- Row and column headers showing edge numbers (1-based, matching the table
  above, which renders `{e + 1}`).
- Each cell needs an `aria-label` naming both edges and the current state, e.g.
  `Edges 2 and 4: parallel` / `Edges 2 and 4: no rule`. `aria-pressed` is wrong
  here — it is a three-state cycle, not a toggle — so use the label to carry
  state and do not set `aria-pressed`.

### 7. Styling

Add to the existing `<style>{`...`}</style>` block at the bottom of the file.
Match what is there: `#6272a4` for idle control text, `#44475a` borders,
`.on`-style `#bd93f9` background for a set cell, `1px solid` borders, 3px
radius, 12px font. Use a new `.sk-pairs` class prefix. A cell should be about
the size of the existing `.sk-table button` (min-width 24px).

## Out of scope — do not touch

- `components/model/ModelEditor.tsx` — already wires `constraints` and
  `onChange` generically via `setConstraints`. It needs no change. Verified.
- `lib/sketch-solve.ts` — the solver already handles all three kinds. Do not
  add, rename or re-order the `Constraint` union.
- `scripts/check-constraint-ui.mjs` — your gate. Not yours to edit.
- `.gauntlet/parity-sketch.json` — status bookkeeping is handled separately.
- The existing table, pins, rounds and chamfers sections. Leave every existing
  comment in place.

## Verification — run these and paste the ACTUAL output

```
cd C:/Users/shuff/Documents/GitHub/shCode
node scripts/check-constraint-ui.mjs      # must exit 0
npx tsc --noEmit                          # must be clean
npm test                                  # must exit 0
```

Plus a **hand-trace, written out in your reply**, for a 4-edge rectangle sketch:

1. Click the cell for edges 1 and 3 once. Which `Constraint` object is now in
   the array? Give it literally.
2. Click the same cell twice more. Give the array contents after each click.
3. Click it once more. Show that the array is back to its starting state — not
   holding a stale `equal` alongside a new `perpendicular`.
4. Now say what `pairKind()` returns if the array instead held
   `{kind: 'parallel', edge: 3, other: 1}` — the non-canonical order — and
   confirm your write path can never produce that.

## Reply with

- The verification output above, verbatim.
- The hand-trace.
- **One unpinned design decision** you had to make that this spec did not
  settle, and which way you went. If you genuinely hit none, say so.
- Anything you could NOT check, explicitly.
