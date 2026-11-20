# CAD speed plan (2026-11-17)

Made from three independent council seats (Codex GPT-6.2 Sol, Gemini 3.8 Flash, Claude Sonnet 5.5), each answering the same brief
(`/tmp/cad-drive/council-brief.md`). The open questions they raised were then measured. The rule above all: never trade away a guard,
a refusal or a time budget for speed.

## Where the time goes (measured)

| Case | Now | What it is |
|---|---|---|
| A heavy part (4 holes, 2 rounds, union, hollow), first Run | 10.4–16.2 s | 12 budget probes. Each one replays the WHOLE list from empty in a new worker, so the cost grows with the square of the length. The probes are 10.3 s of 14.6 s of engine time. Also 3 page runs that lost their head start after a guard tried a variant (3.9 s). |
| Heavy part + one chamfer | 3.1 s | 1.46 s probe (a 12-command replay) and about 0.08 s for the chamfer itself |
| Same code again, host page only | 0.19–0.36 s | 0.17 s of it is a repaint pause on every step |
| Same code again, in the studio | 2.1 s | about 1 s studio overhead: the code is evaluated 3 times, and faces and edges are read twice |
| Opening the page | 5.9 s on localhost | 101 MB engine **re-downloaded on every visit** (credentialless iframe, no HTTP cache) |

## The plan

### Phase 1: studio and host trims (shCode only, no owner decision, about half a day)
1. Evaluate the code once in the studio, not twice. The variable probe's own run already reports a real error first, so the separate error run can go. The host still runs it once more.
2. `rememberBaseline` fills the shared face/edge cache, and reads in parallel. Skip all post-Run reading when the revision is unchanged and nothing was built.
3. Coalesce progress repaints. Paint only after about 80 ms or before a real engine run; the wording is unchanged.
- Expect the unchanged studio Run to fall from 2.1 s to about 0.6–0.9 s, and every Run to lose about 0.5–1 s.
- Verify with the speed bench (phase 0) and the two browser checks.

### Phase 2: the incremental budget probe (the big one, about 2 days)
- **The change.** The probe worker stays alive and keeps its engine session. A list that extends what it holds runs only its tail. A timeout or trap still kills and replaces the worker, so the freeze protection stays as it is.
- **Budget accounting.** The worker reports **cumulative** time: the time recorded for the prefix when it ran, plus the tail. Every budget figure (the per-step 45 s, the document budget, `lastRunS`) is therefore what it is today, and no refusal moves. Reporting only the tail would change which steps are refused; that is the owner's call, and not proposed.
- **Where.** The time-budget kernel wrapper (`reshape-cad/packages/solidcraft-host/kernel/src/lib.rs`, ours, not upstream), plus probe-client, probe-worker and probe-kernel. Then rebuild the 74 MB kernel, alone under the rig lock.
- **Expected gain.** The heavy first Run goes from 10–16 s to about 5–7 s, and heavy + 1 step from 3.1 s to about 1.7 s.
- **Verify.**
  - Shadow every incremental probe with a from-empty probe, comparing volume and cumulative time.
  - Run live-budget and hollow-budget; the refusals must not move.
  - Run a sweep sample.

### Phase 3: keep the head start after a guard's variant (spike first)
- **The spike.** Does SolidCraft's `edit.checkpoint` / `edit.restore_checkpoint` restore without rebuilding? A 30-minute timing answers it.
- **If it does.** reply-memory keeps a short stack of checkpoints instead of one "page" record. Every continued run is shadow-compared against a run from empty, with the rounds' run-to-run noise allowed.
- **Expected gain.** 2–4 s on the heavy first Run, and editing step 5 of 12 no longer replays from empty.

### Phase 4: page load (needs decisions)
- **The engine re-download on every visit.** The studio's iframe is credentialless so that SolidCraft's storage stays isolated, and that also gives it an empty HTTP cache each time. Options, each an owner decision:
  - (a) Serve the host page cross-origin isolated (COOP/COEP) instead of credentialless, and keep storage isolation another way.
  - (b) The parent page fetches and caches the wasm and hands it to the frame. SolidCraft's own loader must be untouched, so this needs a service worker or a supported hook.
  - (c) Accept it for now.
- **Delivery.**
  - Brotli-compressed wasm: 101 MB becomes about 25–30 MB.
  - `immutable` caching for the hashed files.
- **Waterfall** (measured 2026-11-18, not worth doing: see below).
  - Mount the frame while the availability check runs.
  - Replace the 200/500 ms polling with a ready message.
  - Compile the probe kernel in idle time after SolidCraft is ready; this helps the first budgeted Run only.

### Later, or not at all
- **The whole guarded build in a worker.** The page only replays the accepted list and checks it, which takes the main thread out of slow pockets (92 s recorded). It needs topology parity between the two engines, a fresh sweep, and owner decisions on what is trusted for the verdict and on a new sentence. It also makes speculative builds possible.
- **Speculative builds while typing.** Only after a worker build exists; today they would freeze typing. Live error checking (JS only) is possible now, but it is not a speedup.
- **v0.41.0 / solidcore.** All three seats agree: a timing spike at most, no switch for speed. The pin is the owner's.
- **Rejected:** skipping probes for "safe" steps such as primitives in hole documents (one seat proposed it, two opposed), raising budgets, and judging probes by their tail only.

## Done (2026-11-17): phases 0–3

`python3 scripts/bench-cad-speed.py <label>`, median of 2 passes, headless Chromium on this machine. Every step of every Run still goes through the guarded translator.

| Scenario | Before | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|
| open → first part shown | 6.27 s | 6.42 s | 6.07 s | 6.36 s |
| starter: same code again | 1.81 s | 1.05 s | 0.93 s | 0.97 s |
| starter: + one new part | 2.08 s | 1.64 s | 1.59 s | 1.70 s |
| heavy: first Run | 14.51 s | 14.49 s | 8.85 s | **8.07 s** |
| heavy: same code again | 2.08 s | 1.16 s | 1.19 s | 1.19 s |
| heavy: + one chamfer | 3.44 s | 3.17 s | 2.05 s | **1.84 s** |

**Phase 1 (studio and host trims).**
- The studio:
  - evaluates once;
  - shares one face/edge read, keyed by revision and read in parallel;
  - shows the host's own progress line.
- Host repaints are combined, at most every 80 ms, but always before a real engine run.
- `embed=code` skips the two SolidCraft inspections that only the hidden panel needs: before a Run (whether to ask) and after it (the restore button).

**Phase 2 (incremental budget probe, `probeinc=on`).**
- The time-budget kernel has sessions kept in slots: `run_from` and `drop_slot`.
  - They sit behind the cargo feature `session` and are built to `kernel/dist-session/`.
  - The default build and `dist/` are unchanged (sha256 9dc93a11…).
- The probe worker is kept between probes and continues from its longest held prefix.
  - A timeout, a trap or 2 minutes idle ends it.
- Checked in two ways:
  - 25 real probe lists from 6 scripts, replayed in Node: 25 replies identical to a run from empty. Engine time spent fell from 8.7 s to 2.6 s.
  - In the page, with every budget capped at 0.4 s: the slow holes are refused with the existing sentence, and the longest page stall is 183 ms.
- **Decided (owner, 2026-11-17):** keep the stricter accounting; see "Owner decisions".

**Phase 3 (checkpoint marks in the page).**
- The spike: SolidCraft's `edit.restore_checkpoint` takes 13 ms, against 902 ms to rebuild 11 commands, and gives the same bodies, faces and timeline.
- reply-memory now checkpoints what SolidCraft holds before it adds to it.
- A guard's variant, and the list after it, go back to the longest held prefix instead of an empty design.
- Marks are dropped whenever SolidCraft's document changed between Runs, so a mark never undoes a student's own edit.

**Equivalence.** Ten scripts were built with every switch on (one page, in sequence) and with the host's defaults (from empty each time). All ten are identical in every step's status and refusal sentence, and in every body's volume, faces and box. They include family C, a round too big, an edge changed by a pocket, counterbores, patterns and a mirror.

**Budget accounting (owner decision: (a), 2026-11-17).** The kept worker reports the time of the whole list: what the held prefix took to build, plus the new commands. Building step by step takes 1.1–2.1× the time of one run of the same list from empty (measured on 18 lists; it is the engine evaluating the model at each step, not the copies or the measure).
- So with `probeinc=on`, every budget (the per-step 45 s + 1.5 × last run, and the document budget) is judged on a figure about 1.5× larger than before.
- A step that takes 30–45 s from empty would now be refused. It is never built wrong; it is refused, with the existing sentence.
- Alternatives:
  - (a) keep it, stricter;
  - (b) judge only the new commands' time (looser than before, and it is what the page itself now spends with `inc=on`);
  - (c) `probeinc` off: the old probe, slower.

**Production.** Phases 1 and 3, `keep` and `inc` need no new files. The session kernel is not in `functions/_shared/solidcraft-runtime.ts`'s R2 asset list. Without it the host falls back to the old probe, so phase 2 reaches production only when its wasm is uploaded to R2 and listed there (a deploy step, not done).

## Owner decisions (2026-11-17)

- **Budget accounting: (a), keep it stricter.** With `probeinc=on` each budget is judged on the time of the whole list as
  it was built, about 1.5× the from-empty figure. A step that is slow enough is refused with the existing sentence, never
  built wrong.
- **Page load: compress, then cache.** First serve the wasm compressed (a deploy step, not done). Then the parent page
  caches the bytes and hands them to the isolated frame, which is not built yet.
- **Speed switches stay in shCode's copy of the host page** (`keep`, `embed`, `probeinc`, the marks, the session kernel);
  they are not brought into reshape-cad's own host for now.

## Phase 4 findings: page load

- **The cause.** Measured: the studio's iframe is credentialless, so it gets a fresh HTTP cache. A second visit downloaded the 101 MB SolidCraft wasm again in full (`transferSize` 101 MB).
  - Why it is credentialless (vendor README, curriculum 9.1): SolidCraft's own recovery files (OPFS and localStorage) must not persist in the app's storage or leak between lessons and students on a shared computer. The temporary partition gives that.
  - The empty HTTP cache is the cost of that choice.
- **Bytes per visit.**
  - The 101 MB engine; gzip -6 makes it 32 MB.
  - Plus the 74 MB probe kernel at the first budgeted Run; gzip -6 makes it 17 MB.
  - Brotli would be smaller still.
  - The Pages Function serves both with no `Content-Encoding`, and `Cache-Control: max-age=3600, must-revalidate`. The cache header is moot inside a credentialless frame.
- **Options.**
  1. **Compression, no decision needed (only a deploy).** Store brotli copies in R2 and serve them with `Content-Encoding: br`. That is about 4× fewer bytes on every visit, and no isolation changes.
     - Check first whether Cloudflare already compresses the response: `curl -sI -H 'Accept-Encoding: br' <site>/solidcraft-preview/kernel/solidcraft_referee_bg.wasm`.
  2. **The parent hands the bytes over (owner decision).** The parent page has a normal HTTP cache. It fetches the hashed wasm once (cached across visits) and gives the bytes or a compiled module to the frame.
     - SolidCraft's own loader fetches its wasm by URL, so this needs a wrapper that serves that URL from the handed-over bytes. A `fetch` override in a page that frames SolidCraft would do it, with upstream's files untouched; it is an integration choice, not a patch.
     - It removes the 101 MB from every visit after the first, and keeps the storage isolation.
  3. **No credentialless, cleaned storage instead (owner decision).** A plain same-origin frame caches normally. The host page then wipes SolidCraft's recovery storage before loading it and after each use.
     - The isolation becomes "cleaned" instead of "never written": the files exist until the next load.
     - Upstream's storage keys would also share the app's origin.
  4. **Keep one frame mounted across the app.** Fewer mounts, but it does not help a fresh page load.
- **Recommendation.** Do 1 now (a deploy), then 2. Do not do 3.

## Done (2026-11-18): the engine kept by the studio page (option 2)

- **What.**
  - The studio page keeps the pinned engine (101 MB) and kernel (74 MB) in its own Cache Storage, in
    `lib/solidcraft-runtime-cache.ts`.
  - The credentialless host frame asks for the bytes with `?cache=parent`, in `vendor/solidcraft-preview/src/runtime-cache.js`.
  - A file is handed over only if its size and sha256 match `SOLIDCRAFT_ASSETS`. A damaged copy is downloaded again, and
    a download that does not match is refused and not kept.
- **How SolidCraft gets it, its files unchanged.** Our host page loads SolidCraft's `index.html` through `srcdoc`, adding:
  - a `<base>` tag;
  - a `fetch` shim that answers its engine URL from the bytes;
  - without its preload hint for the engine, which would download it again;
  - without its service worker, which precached the engine, another 101 MB per visit, into storage the frame throws away.

  The kernel is compiled from the bytes in `pane.js`. With no cache, or on any failure, the frame loads
  `./solidcraft/index.html` as before.
- **Measured, two visits in one browser** (`/tmp/cad-drive/cache-e2e.py`):

  | Visit | Downloads |
  |---|---|
  | Before | The engine 3 times, by the page, its preload and its service worker; and the kernel |
  | First visit with the cache | The engine once and the kernel once, both by the studio page |
  | Second visit | Neither; only the dev-only session kernel, which is not pinned |

  The part and the probes are the same on both visits.
- **A fix found on the way: SolidCraft's frame loading again.** The crash guard reloads it after the engine stops.
  - The studio kept the old API and hung on the next Run.
  - It now takes the new API once SolidCraft answers, forgets what it built, and builds the code again.
  - Checked with the real engine stop, `fc combined seed 215`: pk6 and pk8 are refused as recorded, SolidCraft comes back
    from the cache, and a Run builds (`/tmp/cad-drive/crash-e2e.py`).
- **Still to do (a deploy).** Store brotli copies in R2. That makes the first visit's download smaller; this change makes
  every later one zero.

## Measured (2026-11-18): the waterfall, after the cache — not worth doing

`/tmp/cad-drive/waterfall.py`: when each stage of opening `/sandbox/cad/` starts and ends, on localhost, a second visit
(the engine from the studio page's cache).

| s | Stage |
|---|---|
| 0.08 | the page's HTML is in |
| 0.50 | the availability check starts (the page's own scripts before it) |
| 0.55 | it ends; the frame is mounted, host.html and SolidCraft's index.html are loaded |
| 1.10 | SolidCraft's API is up (the engine compiled from the cached bytes) |
| 1.17 | the host page is ready |
| 2.98 | the first part is shown (the first Run) |

- **Mounting the frame during the availability check** would win its 50 ms.
- **A ready message instead of the 200 ms polling** would win about 100 ms on average.
- **Compiling the probe kernel ahead:** the first budgeted probe (a hollow) takes 0.31 s in all, compile included, so
  at most about 0.2 s, paid for by every page with no budgeted step (74 MB compiled for nothing).
- **So:** together well under half a second of about 3 s. Not done. The time left is the first Run itself (phase 1's
  figures).

**Fixed on the way: "only the changed steps rebuilt" on the first Run.** The ending was chosen on the reply memory's
hits, and those also count a list asked twice in one Run, so the first Run after opening the page said it. The memory now
notes which Run stored each reply (`src/reply-memory.mjs` `gen`, `earlier`), the pane reports `fromEarlierRuns`, and the
ending is shown only for an earlier Run's work. Checked (`/tmp/cad-drive/probe-load.py`): the first Run says
"Built 2 steps in 1.5 s.", an unchanged Run "…, nothing new to build", a changed wall "…, only the changed steps rebuilt".
The words are unchanged.

## Phase 0, before anything: a speed bench in the repo
`/tmp/cad-drive/profile.py` and `settle.py`, cleaned up into `scripts/`. It measures page load, the first Run, an unchanged Run, and a Run after a small change, for the starter and the heavy script. Every phase reports before and after numbers from it.
