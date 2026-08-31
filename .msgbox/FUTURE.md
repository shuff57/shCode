# Future plans — shCode

Ideas parked for later. Not scheduled, not specced. Newest first.
Lives beside `log.jsonl` so it ships with the repo and travels between machines.

## KiCad unit (2026-08-31)

Add a course unit on **KiCad** — open-source schematic capture + PCB design.

Decided so far:
- **Shape:** a new module of lessons under `lessons/`, authored the same way as
  every other unit (readings, videos, written assignments, quiz). No new app
  code, no new lesson type, no in-browser editor — KiCad is a desktop app, so
  students do the work in KiCad and submit writeups/screenshots.
- **Depth:** full unit, through DRC and **fab-ready gerbers** — a real
  order-ready board, not just a schematic exercise.

Open questions before this can be specced:
- Where does it sit? Units run 1–13 (Ch.8–13 are JSCAD). A hardware unit is a
  new branch, and the calendar in `curriculum-plan.md` Part B is already full.
  Does it displace something, or is it a different course?
- Fab budget + turnaround. "Fab-ready" only means something if boards get
  ordered; who pays, and does the vendor's lead time fit a semester?
- Which SLO does it carry? CSCI 4's four SLOs are all software; a PCB unit
  may be enrichment rather than articulated credit.
- Submission surface: screenshots as image uploads (the `/api/uploads` path
  already exists) vs. pasted text. Nothing renders a `.kicad_sch` today.

Prior art in-repo: `curriculum/README.md` describes the module-spec →
lessons build pipeline. Start with a spec at `curriculum/modules/`, not
with lesson folders.
