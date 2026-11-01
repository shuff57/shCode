# getItem fix: module 6.5 no longer says getItem returns a string (2026-11-01)

## What moSHion actually does

`public/moshion/moshion.js` 3160-3174: `storeItem(name, val)` stores `JSON.stringify(val)`; `getItem(name)`
returns `null` for a missing key, otherwise `JSON.parse(raw)`, falling back to the raw text if it does not parse.
Measured on `scripts/moshion-harness.mjs` (real moshion.js):

| stored with storeItem | getItem gives back |
|---|---|
| `5` | `5` (number; `+ 1` is `6`) |
| `'5'` | `'5'` (text; `+ 1` is `'51'`) |
| `true` | `true` |
| `[1, 2]` / `{s: 3}` | an array / an object |
| `JSON.stringify({s: 3})` | the text `'{"s":3}'` (so the unit's stringify/parse pattern still works) |
| never saved | `null` |

Also measured: `JSON.parse(null)` is `null` (no throw); `JSON.parse` of an object throws.

## Lessons touched (folder id, displayed number)

- `6-5-5-reading-getitem` (6.5.5): "What you get back" now says the value comes back as the type you saved, or
  `null`; contrasts with 3.8.15's localStorage. Glossary row and lesson.json description corrected.
- `6-5-6-reading-getitem-string` (6.5.6): rewritten. Title is now "6.5.6 Reading: What getItem Gives Back" (folder
  id unchanged). The live block saves the number `5` and the text `'5'`; it prints `6`, `51`, `6` (verified on the
  harness, 60 frames, no throw), and the prose says so. Teaches: number stays number; text stays text (quoted
  value, a `prompt` answer, 3.1.9); text-vs-text comparison (`'9' > '100'`); `|| 0` for the first run; and
  `Number(getItem(k)) || 0` as the safety net the worked examples use. The false `"250" > 100 → false` example is
  gone. Description rewritten.
- `6-5-7-example-load-highscore` (6.5.7): takeaway "Always coerce: getItem returns a string" is now "Number() is
  the safety net" with the real reason. Code unchanged.
- `6-5-9-reading-json-stringify` (6.5.9): "storeItem only accepts strings ... an object doesn't" and "the golden
  rule: storeItem wants a string" were false. Now: storeItem would take an object, but this unit packs with
  `JSON.stringify` so you can see what is saved and so the code works where only text is stored (3.8.15).
- `6-5-10-reading-json-parse` (6.5.10): "`JSON.parse(null)` throws" was false; now says it returns `null` and the
  next field read crashes. Added "pack and unpack in pairs" (JSON.parse on an unpacked object throws).
- `6-5-11-reading-store-structured` (6.5.11): the "why Number() after parse" question and paragraph now say it is a
  safety net (missing field gives NaN, text field becomes a number), not a requirement.
- `6-5-12-example-save-player-state` (6.5.12): takeaway "storeItem wants a string" replaced.
- `6-5-13-example-restore-player-state` (6.5.13): "parse null and you crash" made precise; coerce-after-parse
  takeaway called a safety net.
- `curriculum/modules/6.5_game-saves.md`: unit goal and post-requisite line restated.

## Checked, not changed

- `6-5-4` (6.5.4): its `Number(...) || 0` sentence is true.
- `6-5-25-a16-1-save-system` (6.5.26) and `6-5-26-challenges` (6.5.27): no string claim. Their regexes require
  `JSON.stringify`/`JSON.parse` (no `Number`/`parseInt` requirement anywhere in 6.5); 6.5.9 now says this unit packs
  with JSON.stringify, so the requirement is taught before it is asked. The 6.5.27 reference already said
  "storeItem already serialises for you". The NaN-timestamp hint is true.
- `6-5-20a`, `6-5-16`, `6-5-17`, `6-5-18`, `6-5-20`, `6-5-21`, `6-5-23`, `6-5-24`: every load parses text the
  lesson stringified, so "storage returned a string" there is true.
- 6.6, 6.9, 6.10, 7.1: no getItem-string claim (6.10 cites 3.1.9 for `prompt`; 7.1.1's reference reads the number
  back with no coercion, which is correct). 3.8 is about the browser's localStorage and is correct as written.
- No quiz anywhere asks about moSHion's getItem type, so no quiz key changed.

## Outside lessons/ (reported, not edited)

- `lib/js-docs.ts` ~851 ("Saving by key"): right after "Everything comes back as a string" it says moSHion's
  storeItem/getItem are "the same idea with friendlier names ... the shape of the code is identical". A reader
  will take the string rule with it. `lib/moshion-docs.ts` (Persistence) is already correct.
- moSHion itself needs no change; its behaviour is the friendlier one. Edges, not taught anywhere: with real
  localStorage, `storeItem(k, undefined)` reads back as the string `'undefined'` (harness), while the sandbox
  bridge path stores `undefined` and reads back `null`, so the two paths disagree; `NaN`/`Infinity` come back
  `null` (JSON). A `storeItem` that refused `undefined`, or removed the key, would make the paths agree.

## Verification

Generators: generate-module-docs, -lessons-manifest, -ai-graders, -quiz-keys, -solutions, -lesson-starters (all
exit 0). Checks: check-lesson-numbers, -groups, -prompt-pointers, check-lesson-citations (2 pre-existing
warnings, 1.4.9 and 6.4.4), check-hints, check-live-blocks (491 blocks, all match), check-starters,
check-solution-leak, test-quiz, test-grader-tolerance, audit-grader-tolerance --gate, `tsc --noEmit`: all pass.
