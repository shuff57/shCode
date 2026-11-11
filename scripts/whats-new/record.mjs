#!/usr/bin/env node
// Records the short clips shown in the What's New popup (lib/whats-new.ts).
//
// Usage, from the repo root, with the LOCAL DEV SERVER running:
//   PORT=3019 DEV_REAL_DB=1 DEV_ROLE=teacher npm run dev
//   node scripts/whats-new/record.mjs <entry-id> [<entry-id> ...] [--base http://localhost:3019]
//   node scripts/whats-new/record.mjs --all
//   node scripts/whats-new/record.mjs --list
//
// For each id it plays the recipe below in headless Chromium and writes
//   public/whats-new/<id>.mp4   silent H.264 (yuv420p, +faststart), 1280x720, 5-15 s, under ~1.5 MB
//   public/whats-new/<id>.jpg   the poster (a still of the clip's end, or of the page for a poster-only entry)
//
// A recipe is played by one or more PEOPLE. Each person is a browser context
// with the dev server's cookies (`dev_student=<email>; dev_role=student|teacher`),
// so two students are two classmates in the dev class. A one-person clip is
// recorded at 1280x720. A two-person clip records each person at 800x900 and
// puts them side by side (ffmpeg hstack, 1600x900, scaled to 1280x720), each
// labelled with whose screen it is. Every recipe starts from the dev server's
// in-memory database as it finds it, so a recipe makes its own data first
// (`setup`, not recorded), then plays the part people watch (`run`). Start the
// dev server fresh before `--all`: the teacher clip lists every Code together
// session and shared game the server holds, and a second run adds more.
//
// Keep a clip to one idea, shown once, 5-15 seconds. Use demo.click() so the
// viewer can follow the pointer (recordings have no cursor of their own).
//
// Needs: playwright-core (the copy under ~/.bun/lib/node_modules/@playwright/cli,
// or PLAYWRIGHT_CORE=<path>), Chromium from ~/.cache/ms-playwright (or
// CHROMIUM=<path>), and ffmpeg with an H.264 encoder.
//
// Never touches the playwright-cli session `mom`: this launches its own browser.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'public', 'whats-new');
const CLIP_CAP = 1.5 * 1024 * 1024;
const FULL = { width: 1280, height: 720 };
const HALF = { width: 800, height: 900 };

// ---- tools ----------------------------------------------------------------

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [
    process.env.PLAYWRIGHT_CORE,
    join(homedir(), '.bun/lib/node_modules/@playwright/cli/node_modules/playwright-core'),
    'playwright-core',
  ].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch { /* next */ }
  }
  throw new Error('playwright-core not found: set PLAYWRIGHT_CORE to its folder');
}

function chromiumPath() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const dir = join(homedir(), '.cache/ms-playwright');
  const builds = existsSync(dir)
    ? readdirSync(dir).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    : [];
  for (const b of builds) {
    const p = join(dir, b, 'chrome-linux64', 'chrome');
    if (existsSync(p)) return p;
  }
  return undefined; // let Playwright find its own
}

const FFMPEG = existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg';
const FFPROBE = existsSync('/usr/bin/ffprobe') ? '/usr/bin/ffprobe' : 'ffprobe';

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || '').slice(-800)}`);
  return r.stdout;
}

/** H.264 plays everywhere. x264 takes a quality; Fedora's stock ffmpeg only has OpenH264, which takes a bitrate. */
function h264Args(kbps) {
  const encoders = run(FFMPEG, ['-hide_banner', '-encoders']);
  if (/ libx264 /.test(encoders)) return ['-c:v', 'libx264', '-preset', 'slow', '-crf', kbps <= 350 ? '33' : '30'];
  if (/ libopenh264 /.test(encoders)) return ['-c:v', 'libopenh264', '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.6)}k`];
  throw new Error('ffmpeg has no H.264 encoder (libx264 or libopenh264)');
}

function duration(file) {
  return Number(run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());
}

// ---- in-page helpers --------------------------------------------------------

// A visible pointer that follows the mouse, with a ring that pulses on a click.
// Top frame only: a sketch's iframe gets neither (two cursors, or two labels, otherwise).
const CURSOR_JS = `(() => {
  if (window.__demoCursor || window.top !== window) return;
  const make = () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;left:-40px;top:-40px;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px)';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.5 14 L10.5 20.5 L13 19.4 L10 13 L16 13 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    const r = document.createElement('div');
    r.style.cssText = 'position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border:3px solid #5baafd;border-radius:50%;z-index:2147483646;pointer-events:none;opacity:0;transform:scale(.4)';
    // The dev server's Next.js badge is not part of the site.
    const hide = document.createElement('style');
    hide.textContent = 'nextjs-portal{display:none!important}';
    document.documentElement.append(c, r, hide);
    const move = (x, y) => { c.style.left = x + 'px'; c.style.top = y + 'px'; };
    window.__demoCursor = { c, r, move };
    addEventListener('mousemove', (e) => move(e.clientX, e.clientY), true);
    addEventListener('mousedown', (e) => {
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      r.style.transition = 'none'; r.style.opacity = '1'; r.style.transform = 'scale(.4)';
      requestAnimationFrame(() => { r.style.transition = 'opacity 450ms, transform 450ms'; r.style.opacity = '0'; r.style.transform = 'scale(1.4)'; });
    }, true);
  };
  if (document.body) make(); else addEventListener('DOMContentLoaded', make);
})();`;

// "Sam's screen": which half of a two-person clip is whose.
const labelJs = (text) => `(() => {
  if (window.top !== window) return;
  const make = () => {
    if (document.getElementById('demo-label')) return;
    const l = document.createElement('div');
    l.id = 'demo-label';
    l.textContent = ${JSON.stringify(text)};
    l.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:2147483645;pointer-events:none;background:rgba(0,0,0,.72);color:#fff;font:600 15px system-ui,sans-serif;padding:5px 10px;border-radius:6px';
    document.documentElement.append(l);
  };
  if (document.body) make(); else addEventListener('DOMContentLoaded', make);
})();`;

class Demo {
  constructor(page) { this.page = page; }
  pause(ms) { return this.page.waitForTimeout(ms); }
  async cursorTo(locator, ms = 600) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const box = await locator.boundingBox();
    if (!box) throw new Error(`not on screen: ${locator}`);
    await this.moveTo(box.x + box.width / 2, box.y + box.height / 2, ms);
  }
  /** Moves the mouse and the drawn pointer together (over an iframe the page sees no mousemove). */
  async moveTo(tx, ty, ms = 600) {
    const steps = Math.max(8, Math.round(ms / 16));
    const { x: fx, y: fy } = this.at ?? { x: tx, y: ty };
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = fx + (tx - fx) * e;
      const y = fy + (ty - fy) * e;
      await this.page.mouse.move(x, y);
      await this.page.evaluate(([px, py]) => window.__demoCursor?.move(px, py), [x, y]).catch(() => {});
    }
    this.at = { x: tx, y: ty };
  }
  async click(locator, { ms = 600, after = 500 } = {}) {
    await locator.waitFor({ state: 'visible', timeout: 30000 });
    await this.cursorTo(locator, ms);
    await this.pause(150);
    await this.page.mouse.down();
    await this.page.mouse.up();
    await this.pause(after);
  }
  async type(text, delay = 55) { await this.page.keyboard.type(text, { delay }); }
  /** Replaces the whole CodeMirror document with `code` at once (no typing, no auto-close). */
  async setCode(code) {
    const editor = this.page.locator('.cm-content').first();
    await editor.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Delete');
    await this.page.keyboard.insertText(code);
  }
  async scrollTo(locator, ms = 700) {
    await locator.evaluate((el, d) => {
      const r = el.getBoundingClientRect();
      window.scrollBy({ top: r.top - 90, behavior: 'smooth' });
      return new Promise((res) => setTimeout(res, d));
    }, ms);
  }
}

// ---- recipes -------------------------------------------------------------------
// people: [{ email, role, label }]. setup(ctxs) runs first, unrecorded, in its own contexts.
// run({ demos, pages }) is what the clip shows. `path` is where each person starts.

const MOSHION_REALTIME = `let me;

function setup() {
  new Canvas(400, 300);
  multiplayer('coop', 2, { realtime: true });
  me = new Sprite(200, 150, 50, 50);
  me.color = 'gold';
  online.share(me);
}

function draw() {
  background('#1b1d2a');
  me.vel.x = 0;
  me.vel.y = 0;
  if (kb.pressing('left')) me.vel.x = -4;
  if (kb.pressing('right')) me.vel.x = 4;
  if (kb.pressing('up')) me.vel.y = -4;
  if (kb.pressing('down')) me.vel.y = 4;
  me.x = constrain(me.x, 25, 375);
  me.y = constrain(me.y, 25, 275);
  if (seat === 1) me.color = 'deepskyblue';
}
`;

const SAM = { email: 'sam@example.org', role: 'student', label: "Sam's screen" };
// #101: the textLayer() docs example, with the player moving by itself.
const MOSHION_TEXT_LAYER = `let player, tree;

function setup() {
  new Canvas(400, 300);
  player = new Sprite(30, 150, 40, 40);
  player.color = 'deepskyblue';
  player.collider = 'none';
  player.layer = 1;

  tree = new Sprite(280, 150, 70, 120);
  tree.collider = 'none';
  tree.color = 'forestgreen';
  tree.layer = 10;
}

function update() {
  player.x += 2;
  if (player.x > 420) player.x = -20;
}

function draw() {
  background('#222');
  fill('white');
  textSize(24);
  textLayer(5); // over the player (layer 1), under the tree (layer 10)
  text('Welcome to the forest', 60, 160);
  textLayer();
}
`;
// The undo-restore poster's saved version: a small moSHion sketch.
const MOSHION_SAVED_V1 = `function setup() {
  new Canvas(400, 400);
}

function draw() {
  background(40, 42, 54);
  fill(80, 250, 123);
  circle(mouseX, mouseY, 40);
}
`;
const ALEX = { email: 'alex@example.org', role: 'student', label: "Alex's screen" };
// The teacher clip's class: two more students, so Sam's and Alex's drafts stay the starter for the other clips.
const MAYA = { email: 'maya@example.org', role: 'student', label: "Maya's screen" };
const LEO = { email: 'leo@example.org', role: 'student', label: "Leo's screen" };
// No dev_student cookie: the dev server's own identity, which owns the seeded 'dev-class' (DEV_REAL_DB=1).
const TEACHER = { email: null, role: 'teacher', label: 'Teacher' };
// The change-flow clips' people: Nia makes the game, Kai remixes and proposes; Ivy and Ravi for the teacher poster.
const NIA = { email: 'nia@example.org', role: 'student', label: "Nia's screen (made the game)" };
const KAI = { email: 'kai@example.org', role: 'student', label: "Kai's screen" };
const IVY = { email: 'ivy@example.org', role: 'student', label: "Ivy's screen" };
const RAVI = { email: 'ravi@example.org', role: 'student', label: "Ravi's screen" };

async function startCodeTogether(page, demo) {
  await (demo ? demo.click(page.getByRole('button', { name: 'Code together', exact: true })) : page.getByRole('button', { name: 'Code together', exact: true }).click());
  const start = page.getByRole('dialog', { name: 'Code together' }).getByRole('button', { name: 'Start' });
  await (demo ? demo.click(start, { after: 900 }) : start.click());
  await page.locator('[data-testid=together-code][data-code]').waitFor({ timeout: 30000 });
  // The host's popup stays open with the code big to read out; back to the editor.
  const back = page.getByRole('dialog', { name: 'Coding together' }).getByRole('button', { name: 'Back to coding' });
  await (demo ? demo.click(back, { after: 1200 }) : back.click());
}
async function joinCodeTogether(page, demo) {
  await (demo ? demo.click(page.getByRole('button', { name: 'Code together', exact: true }), { after: 900 }) : page.getByRole('button', { name: 'Code together', exact: true }).click());
  const join = page.locator('[data-testid=together-sessions] button').first();
  await join.waitFor({ timeout: 30000 });
  await (demo ? demo.click(join, { after: 900 }) : join.click());
  await page.locator('[data-testid=together-code][data-code]').waitFor({ timeout: 30000 });
}

const RECIPES = {
  // Sandbox projects (migration 0049, components/SandboxProjectPicker.tsx): Sam makes a JavaScript
  // project beside the moSHion one, runs it, then switches back and finds the moSHion code untouched.
  // Start the dev server fresh: Sam's list must hold only the moSHion sandbox.
  '2026-11-sandbox-projects': {
    people: [SAM],
    path: '/sandbox/',
    async before({ pages: [p] }) {
      await p.getByTestId('sandbox-projects-button').waitFor({ timeout: 30000 });
    },
    async run({ demos: [d], pages: [p] }) {
      await d.click(p.getByTestId('sandbox-projects-button'), { after: 500 });
      await d.click(p.getByRole('button', { name: 'New project' }), { after: 300 });
      await d.click(p.getByRole('radio', { name: 'JavaScript' }), { after: 200 });
      await d.cursorTo(p.getByLabel('Name'), 400);
      await p.getByLabel('Name').click();
      await d.type('Hello names', 45);
      await d.click(p.getByRole('button', { name: 'Make project' }), { after: 900 });
      await d.click(p.getByRole('button', { name: /Run/ }).first(), { after: 1100 });
      await d.click(p.getByTestId('sandbox-projects-button'), { after: 900 });
      await d.click(p.locator('[data-testid=sandbox-projects] li button').filter({ hasText: 'moSHion sandbox' }).first(), { after: 1200 });
    },
  },

  // #101 textLayer(n): the docs example with the player sliding on its own, so the words are seen
  // painted over the player (layer 1) and under the tree (layer 10).
  '2026-11-text-layer': {
    people: [SAM],
    path: '/sandbox/',
    async before({ demos: [d], pages: [p] }) {
      await p.getByTestId('sandbox-projects-button').waitFor({ timeout: 30000 });
      await d.setCode(MOSHION_TEXT_LAYER);
      // Started before the clip: on a slow machine the first seconds after Run are an empty preview.
      await p.getByRole('button', { name: /Run/ }).first().click();
      await p.frameLocator('iframe').first().locator('canvas').first().waitFor({ timeout: 60000 });
      await p.waitForTimeout(2500);
      await d.moveTo(1180, 560, 16);
    },
    async run({ demos: [d] }) {
      // The square passes under the words, and the words under the tree.
      await d.pause(8000);
    },
  },

  // #90/#95: a lab's steps open from the yellow "Your task" tab on the left edge.
  '2026-11-your-task-tab': {
    people: [SAM],
    path: '/lesson/3-1-13-lab-syntax-naming/',
    posterOnly: true,
    async run({ demos: [d], pages: [p] }) {
      const tab = p.locator('.lab-task-tab').first();
      await tab.waitFor({ timeout: 60000 });
      if ((await tab.getAttribute('aria-expanded')) !== 'true') await d.click(tab, { after: 600 });
      await p.locator('.lab-task-card').first().waitFor({ timeout: 15000 });
      // Off the tab, so its words can be read.
      await d.moveTo(70, 640, 400);
      await d.pause(500);
    },
  },

  // A History restore keeps the code it replaces (components/HistoryPanel.tsx): Sam saves, changes the
  // code, restores the saved version, and History now lists the code from before the restore.
  '2026-11-undo-restore': {
    people: [SAM],
    path: '/sandbox/',
    posterOnly: true,
    async run({ demos: [d], pages: [p] }) {
      await p.getByTestId('sandbox-projects-button').waitFor({ timeout: 30000 });
      // The moSHion sandbox, whichever project an earlier recipe left open.
      await p.getByTestId('sandbox-projects-button').click();
      await p.locator('[data-testid=sandbox-projects] li button').filter({ hasText: 'moSHion sandbox' }).first().click();
      await p.waitForTimeout(600);
      await d.setCode(MOSHION_SAVED_V1);
      await p.getByRole('button', { name: 'Save', exact: true }).click();
      await p.getByText(/^✓ Saved/).waitFor({ timeout: 15000 });
      await d.setCode(MOSHION_SAVED_V1.replace('fill(80, 250, 123);', "fill('tomato');").replace('40);', '90);'));
      await p.getByRole('button', { name: 'History' }).click();
      await p.getByRole('button', { name: 'Restore this version' }).click();
      await p.getByRole('dialog', { name: 'Version history' }).waitFor({ state: 'detached', timeout: 15000 });
      await p.getByRole('button', { name: 'History' }).click();
      const kept = p.getByText(/^Before restoring the version from/).first();
      await kept.waitFor({ timeout: 15000 });
      await d.click(kept, { after: 500 });
    },
  },

  // Versions, proposed changes and their conversations (migration 0048, lib/game-flow-core.ts).
  '2026-11-propose-changes': {
    people: [KAI, NIA],
    path: '/library/?tab=games',
    storage: { 'shCode:sandbox-mode': 'moshion' },
    async setup({ person }) {
      // Nia publishes a game and shares it with the class.
      const n = await person(NIA, '/sandbox/', { 'shCode:sandbox-mode': 'moshion' });
      await publishGame(n.page, 'Star Dodge', MOSHION_DODGE);
    },
    async before({ demos: [k], pages: [pk, pn] }) {
      // Kai remixes it and makes the stars faster (cut from the clip).
      const row = pk.locator('div').filter({ hasText: /^Star Dodge/ }).filter({ has: pk.getByRole('button', { name: 'Remix' }) }).last();
      await row.getByRole('button', { name: 'Remix' }).click();
      await pk.waitForURL(/\/sandbox/, { timeout: 30000 });
      await pk.getByRole('button', { name: /Propose change/ }).waitFor({ timeout: 30000 });
      await k.setCode(MOSHION_DODGE.replace('s.vel.y = 3;', 's.vel.y = 6;'));
      await pk.waitForTimeout(600);
      // The panel is open with the title typed when the clip starts: the clip is sending it and accepting it.
      await pk.getByRole('button', { name: /Propose change/ }).click();
      await pk.locator('#propose-title').fill('Faster stars');
      await pn.reload({ waitUntil: 'domcontentloaded' });
      await pn.getByRole('heading', { name: /My games/ }).waitFor({ timeout: 30000 });
    },
    async run({ demos: [k, n], pages: [pk, pn] }) {
      await k.click(pk.getByRole('button', { name: 'Propose this change' }), { ms: 450, after: 300 });
      await pk.getByText(/^Sent to/).waitFor({ timeout: 30000 });
      await k.pause(600);
      await pn.reload({ waitUntil: 'domcontentloaded' });
      const link = pn.getByRole('link', { name: 'Faster stars' });
      await link.waitFor({ timeout: 30000 });
      await n.click(link, { ms: 500, after: 200 });
      const accept = pn.getByRole('button', { name: 'Accept' });
      await accept.waitFor({ timeout: 30000 });
      await n.pause(900);
      await n.click(accept, { ms: 500, after: 300 });
      await pn.getByText(/^Accepted\./).waitFor({ timeout: 30000 });
      await n.pause(1400);
    },
  },

  '2026-11-teacher-game-changes': {
    people: [TEACHER],
    path: '/teacher/?class=dev-class&tab=students',
    posterOnly: true,
    async setup({ person }) {
      // Ivy publishes and shares a game; Ravi proposes a change; they talk it over (all through the API).
      const ivy = await person(IVY, '/library/?tab=games');
      const id = await ivy.page.evaluate(async (code) => {
        const r = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Maze Run', code }) });
        const g = (await r.json()).game;
        await fetch(`/api/games/${g.id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ share: true }) });
        return g.id;
      }, MOSHION_DODGE);
      const ravi = await person(RAVI, '/library/?tab=games');
      const cid = await ravi.page.evaluate(async ([gid, code]) => {
        const r = await fetch(`/api/games/${gid}/changes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Two more walls', code, baseVersion: 1, note: 'I added two walls near the end. Is it too hard now?' }),
        });
        return (await r.json()).id;
      }, [id, MOSHION_DODGE.replace("player.color = 'gold';", "player.color = 'gold';\n  new Sprite(100, 200, 120, 12, 'static');\n  new Sprite(300, 260, 120, 12, 'static');")]);
      await ivy.page.evaluate(async (c) => {
        await fetch(`/api/game-changes/${c}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'comment', body: 'Not too hard, I like it! Could the second wall be a bit shorter?' }) });
      }, cid);
    },
    async run({ demos: [t], pages: [p] }) {
      await p.getByRole('heading', { name: 'Proposed changes to games' }).waitFor({ timeout: 30000 });
      await t.scrollTo(p.getByRole('heading', { name: 'Proposed changes to games' }), 600);
      await t.click(p.getByRole('button', { name: /Newest comments/ }), { after: 600 });
    },
  },

  // #97: one student, two computers. The left run saves plays: 1 to the account;
  // the right one, a different browser with no local copy, reads it back as 2.
  '2026-11-save-to-account': {
    people: [
      { ...SAM, label: "Sam's computer at school" },
      { ...SAM, label: "Sam's computer at home" },
    ],
    path: '/sandbox/',
    storage: { 'shCode:sandbox-mode': 'moshion' },
    async before({ demos, pages }) {
      // The account starts empty, whatever an earlier recording saved.
      await pages[0].evaluate(() => fetch('/api/sketch-saves', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'sandbox', data: {} }),
      }));
      for (const d of demos) await d.setCode(MOSHION_SAVE);
    },
    async run({ demos: [school, home], pages: [ps, ph] }) {
      await school.click(ps.getByRole('button', { name: /Run/ }).first(), { after: 3000 });
      // The save reaches the account within 2 s.
      await home.click(ph.getByRole('button', { name: /Run/ }).first(), { after: 3200 });
    },
  },

  // #96: Alex picks two suggestions on Sam's game; Sam reloads and sees them, with Alex's name.
  '2026-11-game-suggestions': {
    people: [SAM, ALEX],
    path: '/library/?tab=games',
    async setup({ person }) {
      const s = await person(SAM, '/sandbox/');
      await publishGame(s.page, 'Spike Run', MOSHION_DODGE);
    },
    async before({ pages: [ps, pa] }) {
      const id = await myGameId(ps, 'Spike Run');
      // Alex's picks from an earlier recording are taken back.
      await pa.evaluate(async (gid) => {
        const r = await fetch(`/api/games/${gid}/suggestions`).then((x) => x.json());
        for (const s of r.mine || []) {
          await fetch(`/api/games/${gid}/suggestions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggestion: s, on: false }) });
        }
      }, id);
      for (const p of [ps, pa]) {
        await p.goto(new URL(`/play/?game=${id}`, p.url()).href, { waitUntil: 'networkidle' });
        await p.locator('#game-suggestions-h').waitFor({ timeout: 30000 });
        await p.locator('#game-suggestions-h').evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 420 }));
      }
    },
    async run({ demos: [sam, alex], pages: [ps, pa] }) {
      await alex.pause(500);
      await alex.click(pa.getByRole('button', { name: /^Add more obstacles/ }), { after: 600 });
      await alex.click(pa.getByRole('button', { name: /^So fun!/ }), { after: 900 });
      await ps.reload({ waitUntil: 'networkidle' });
      await ps.locator('#game-suggestions-h').waitFor({ timeout: 30000 });
      await sam.scrollTo(ps.locator('#game-suggestions-h'), 800);
      await sam.pause(2600);
    },
  },

  // #99 and the built-in animations: an animated picture's frames, then a picture imported from the computer.
  '2026-11-pictures-that-move': {
    people: [SAM],
    path: '/library/?tab=pictures',
    async run({ demos: [d], pages: [p] }) {
      const frames = p.getByRole('button', { name: 'See the 6 frames of coinSpin' })
        .or(p.getByRole('button', { name: /^See the \d+ frames of coinSpin$/ })).first();
      await d.scrollTo(frames, 900);
      await d.pause(900);
      await d.click(frames, { after: 2200 });
      // A blown-up copy of a built-in sprite stands in for "a picture you drew".
      const file = await pixelArtFile(p, 'frog', 4, 'my-frog.png');
      await p.goto(new URL('/textures/', p.url()).href, { waitUntil: 'networkidle' });
      await d.pause(500);
      const chooser = p.waitForEvent('filechooser');
      await d.click(p.getByRole('button', { name: /Import picture/ }), { after: 100 });
      await (await chooser).setFiles(file);
      await d.pause(2600);
    },
  },

  // Sharing choices: publish a game as "keep remixes open"; the play page says so.
  '2026-11-share-your-way': {
    people: [SAM],
    path: '/sandbox/',
    storage: { 'shCode:sandbox-mode': 'moshion' },
    async before({ demos: [d] }) { await d.setCode(MOSHION_DODGE); },
    async run({ demos: [d], pages: [p] }) {
      const dialog = p.getByRole('dialog', { name: 'Publish game' });
      await d.click(p.getByRole('button', { name: 'Publish game' }), { ms: 450, after: 500 });
      await d.click(p.locator('#publish-game-title'), { ms: 400, after: 150 });
      await p.keyboard.press('Control+A');
      await d.type('Star Catcher', 45);
      const share = dialog.getByRole('checkbox');
      if ((await share.count()) && !(await share.isChecked())) await d.click(share, { after: 300 });
      await d.click(dialog.getByRole('radio', { name: /keep remixes open/ }), { ms: 500, after: 1300 });
      await d.click(dialog.getByRole('button', { name: /^Publish$/ }), { ms: 400, after: 900 });
      const id = await myGameId(p, 'Star Catcher');
      await p.goto(new URL(`/play/?game=${id}`, p.url()).href, { waitUntil: 'networkidle' });
      await d.pause(2200);
    },
  },

  // Teacher: the Shared games row counts suggestions; its menu clears them (confirm shown, then Cancel).
  '2026-11-library-cleanup': {
    people: [TEACHER],
    path: '/teacher/?class=dev-class&tab=students',
    async setup({ person }) {
      const m = await person(MAYA, '/sandbox/');
      await publishGame(m.page, 'Maze Dash', MOSHION_DODGE);
      const id = await myGameId(m.page, 'Maze Dash');
      const l = await person(LEO, '/library/');
      await l.page.evaluate(async (gid) => {
        for (const s of ['more-levels', 'harder']) {
          await fetch(`/api/games/${gid}/suggestions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggestion: s, on: true }) });
        }
      }, id);
    },
    async run({ demos: [t], pages: [p] }) {
      const heading = p.getByRole('heading', { name: 'Shared games' });
      await heading.waitFor({ timeout: 30000 });
      await t.scrollTo(heading, 1100);
      await t.pause(900);
      await t.click(p.getByRole('button', { name: 'More actions for Maze Dash' }).first(), { after: 900 });
      await t.click(p.getByRole('menuitem', { name: /Clear suggestions/ }), { after: 2600 });
      await t.click(p.getByRole('button', { name: 'Cancel' }), { after: 700 });
    },
  },

  '2026-11-class-together-panels': {
    people: [TEACHER],
    path: '/teacher/?class=dev-class&tab=students',
    async setup({ person }) {
      // Two students write a program together and leave; one publishes and shares a game.
      const s = await person(MAYA, '/sandbox/', { 'shCode:sandbox-mode': 'js' });
      const a = await person(LEO, '/sandbox/', { 'shCode:sandbox-mode': 'js' });
      await startCodeTogether(s.page);
      await joinCodeTogether(a.page);
      await s.page.locator('.cm-content').first().click();
      await s.page.keyboard.press('Control+End');
      await s.page.keyboard.type("console.log('Our first program together');\n");
      await a.page.locator('.cm-content').first().click();
      await a.page.keyboard.press('Control+Home');
      await a.page.keyboard.type('// Maya and Leo\n');
      await s.page.waitForTimeout(2500);
      await s.page.getByRole('button', { name: 'Leave' }).click();
      await s.page.waitForTimeout(1500);
      await publishGame(a.page, 'Dodge the Stars', MOSHION_DODGE);
    },
    async run({ demos: [t], pages: [p] }) {
      await p.getByRole('heading', { name: 'Code together sessions' }).waitFor({ timeout: 30000 });
      await t.pause(600);
      await t.scrollTo(p.getByRole('heading', { name: 'Shared games' }), 1200);
      await t.pause(1400);
      await t.scrollTo(p.getByRole('heading', { name: 'Code together sessions' }), 900);
      await t.click(p.getByRole('button', { name: 'View program' }).first(), { after: 2600 });
    },
  },

  '2026-11-code-together': {
    people: [SAM, ALEX],
    path: '/sandbox/',
    storage: { 'shCode:sandbox-mode': 'js' },
    async before({ pages }) {
      // Both start from the JavaScript starter, whatever an earlier recording left in the draft.
      for (const p of pages) {
        await p.getByRole('button', { name: 'Reset', exact: true }).click();
        await p.waitForTimeout(400);
      }
    },
    async run({ demos: [sam, alex], pages: [ps, pa] }) {
      await startCodeTogether(ps, sam);
      await joinCodeTogether(pa, alex);
      // Both type at once: Sam at the end, Alex at the top.
      await sam.click(ps.locator('.cm-line').last(), { after: 200 });
      await ps.keyboard.press('Control+End');
      await alex.click(pa.locator('.cm-line').first(), { after: 200 });
      await pa.keyboard.press('Control+Home');
      await Promise.all([
        sam.type("console.log('Sam was here');", 70),
        (async () => { await alex.pause(400); await alex.type('// Our program, written together\n', 70); })(),
      ]);
      await sam.pause(500);
      await sam.click(ps.getByRole('button', { name: /Run/ }).first(), { after: 1800 });
    },
  },

  '2026-11-sandbox-timers': {
    people: [SAM],
    path: '/sandbox/',
    storage: { 'shCode:sandbox-mode': 'js' },
    posterOnly: true,
    async run({ demos: [d], pages: [p] }) {
      await d.setCode(`// Count down, one second at a time.
let n = 3;
const timer = setInterval(() => {
  console.log(n + '...');
  n = n - 1;
  if (n === 0) {
    clearInterval(timer);
    setTimeout(() => console.log('Lift off!'), 1000);
  }
}, 1000);
`);
      await p.getByRole('button', { name: /Run/ }).first().click();
      await p.getByRole('log', { name: 'Program output' }).getByText('Lift off!').waitFor({ timeout: 15000 });
      await d.pause(400);
    },
  },

  '2026-11-realtime-play': {
    people: [SAM, ALEX],
    path: '/sandbox/',
    storage: { 'shCode:sandbox-mode': 'moshion' },
    async before({ demos, pages }) {
      // The sketch is in both editors before the clip starts; the clip is the play.
      for (let i = 0; i < pages.length; i++) {
        await demos[i].setCode(MOSHION_REALTIME);
        await pages[i].getByRole('button', { name: /Run/ }).first().click();
      }
      await pages[0].getByRole('button', { name: /Host a room/ }).waitFor({ timeout: 30000 });
    },
    async run({ demos: [sam, alex], pages: [ps, pa] }) {
      await sam.click(ps.getByRole('button', { name: /Host a room/ }), { after: 1200 });
      const join = pa.locator('[data-testid=lobby-rooms] button').first();
      await alex.click(join, { after: 1500 });
      // Each steers their own square; the other copy glides on the other screen.
      await focusCanvas(ps, sam);
      await focusCanvas(pa, alex);
      await Promise.all([
        hold(ps, ['ArrowRight', 'ArrowDown', 'ArrowLeft'], 700),
        (async () => { await alex.pause(300); await hold(pa, ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'], 600); })(),
      ]);
      await sam.pause(800);
    },
  },

  '2026-11-games-library': {
    people: [SAM],
    path: '/sandbox/',
    storage: { 'shCode:sandbox-mode': 'moshion' },
    async before({ demos: [d] }) { await d.setCode(MOSHION_DODGE); },
    async run({ demos: [d], pages: [p] }) {
      await d.click(p.getByRole('button', { name: 'Publish game' }), { ms: 450, after: 500 });
      await d.click(p.locator('#publish-game-title'), { ms: 400, after: 150 });
      await p.keyboard.press('Control+A');
      await d.type('Dodge the Stars', 45);
      const share = p.getByRole('dialog', { name: 'Publish game' }).getByRole('checkbox');
      if ((await share.count()) && !(await share.isChecked())) await d.click(share, { after: 300 });
      await d.click(p.getByRole('dialog', { name: 'Publish game' }).getByRole('button', { name: /^Publish$/ }), { ms: 400, after: 900 });
      // The Library opens on its Games tab from a link (2026-11-09: Games / Pictures / Sounds tabs).
      await p.goto(new URL('/library/?tab=games', p.url()).href, { waitUntil: 'networkidle' });
      await d.pause(300);
      await d.scrollTo(p.locator('a[href*="builtin=checkers"]'), 900);
      await d.pause(1100);
      await d.click(p.locator('a[href*="builtin=checkers"]'), { ms: 500, after: 200 });
      await p.waitForURL(/\/play/, { timeout: 30000 });
      await d.click(p.getByRole('button', { name: /Play/ }).first(), { ms: 500, after: 2600 });
    },
  },

  '2026-11-multiplayer': {
    people: [SAM, ALEX],
    path: '/play/?builtin=checkers',
    async before({ pages }) {
      for (const p of pages) await p.getByRole('button', { name: /Play/ }).first().click();
      for (const p of pages) await p.getByRole('button', { name: /Host a room/ }).waitFor({ timeout: 30000 });
      await pages[0].waitForTimeout(800);
    },
    async run({ demos: [sam, alex], pages: [ps, pa] }) {
      await sam.click(ps.getByRole('button', { name: /Host a room/ }), { after: 1400 });
      // Alex joins by clicking Sam's 4 pictures in order.
      const code = await ps.locator('[data-testid=lobby-code]').getAttribute('data-code');
      const { codeIcons } = await import('../../lib/room-icons.ts');
      await alex.click(pa.getByRole('button', { name: 'Pick pictures' }), { after: 500 });
      const picker = pa.getByRole('group', { name: 'Join with pictures' });
      for (const icon of codeIcons(code)) {
        await alex.click(picker.getByRole('button', { name: icon, exact: true }), { ms: 380, after: 250 });
      }
      await alex.click(pa.getByRole('region', { name: 'Online game lobby' }).getByRole('button', { name: 'Join', exact: true }), { after: 1800 });
      await sam.pause(2200);
    },
  },

  '2026-11-library': {
    people: [SAM],
    path: '/library/',
    async run({ demos: [d], pages: [p] }) {
      await d.pause(700);
      await d.scrollTo(p.locator('#builtin-h'), 1300);
      await d.pause(1300);
      await d.click(p.getByRole('button', { name: /^Remix / }).first(), { after: 3000 });
    },
  },

  '2026-11-appearance': {
    people: [SAM],
    path: '/account/',
    async run({ demos: [d], pages: [p] }) {
      await d.scrollTo(p.getByRole('heading', { name: 'Appearance' }), 900);
      for (const name of ['light', 'candy', 'retro', 'forest', 'dark']) {
        await d.click(p.locator(`label.appearance-tile:has(input[name=theme][value=${name}])`), { ms: 450, after: 1100 });
      }
    },
  },
};

const MOSHION_DODGE = `let player;
let stars;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 360, 40, 40);
  player.color = 'gold';
  stars = new Group();
}

function draw() {
  background('#1b1d2a');
  player.x = mouseX;
  if (frameCount % 30 === 0) {
    let s = new stars.Sprite(random(20, 380), -10, 16);
    s.color = 'white';
    s.vel.y = 3;
  }
}
`;

const MOSHION_SAVE = `let player;

function setup() {
  new Canvas(360, 240);
  // Kept in your account, so it follows you to any computer.
  player = saved('player', { plays: 0 }, 'remote');
  player.plays += 1;
  player.save();
}

function draw() {
  background('#1b1d2a');
  fill('gold');
  textSize(34);
  text('Plays: ' + player.plays, 70, 135);
}
`;

/** The newest of this person's own games with that title. */
async function myGameId(page, title) {
  const id = await page.evaluate(async (t) => {
    const r = await fetch('/api/games').then((x) => x.json());
    return (r.games || []).find((g) => g.title === t)?.id ?? null;
  }, title);
  if (!id) throw new Error(`no game titled ${title}`);
  return id;
}

/** Writes a built-in texture blown up `k` times (nearest neighbour) to a temp PNG, for a file chooser. */
async function pixelArtFile(page, name, k, filename) {
  const b64 = await page.evaluate(async ([n, kk]) => {
    const img = new Image();
    img.src = `/moshion/textures/${n}.png`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth * kk; c.height = img.naturalHeight * kk;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png').split(',')[1];
  }, [name, k]);
  const dir = mkdtempSync(join(tmpdir(), 'whats-new-pic-'));
  const file = join(dir, filename);
  writeFileSync(file, Buffer.from(b64, 'base64'));
  return file;
}

async function publishGame(page, title, code) {
  await page.goto(new URL('/sandbox/', page.url()).href, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'moSHion', exact: true }).first().click();
  await page.getByRole('button', { name: 'Publish game' }).waitFor({ timeout: 30000 });
  const d = new Demo(page);
  await d.setCode(code);
  await page.getByRole('button', { name: 'Publish game' }).click();
  await page.locator('#publish-game-title').fill(title);
  const share = page.getByRole('dialog', { name: 'Publish game' }).getByRole('checkbox');
  if ((await share.count()) && !(await share.isChecked())) await share.check();
  await page.getByRole('dialog', { name: 'Publish game' }).getByRole('button', { name: /^Publish$/ }).click();
  await page.waitForTimeout(1500);
}

async function focusCanvas(page, demo) {
  const canvas = page.frameLocator('iframe').first().locator('canvas').first();
  const frame = page.locator('iframe').first();
  await demo.cursorTo(frame, 400);
  await page.mouse.down();
  await page.mouse.up();
  await canvas.waitFor({ timeout: 10000 }).catch(() => {});
}

async function hold(page, keys, ms) {
  for (const k of keys) {
    await page.keyboard.down(k);
    await page.waitForTimeout(ms);
    await page.keyboard.up(k);
  }
}

// ---- recording ---------------------------------------------------------------------

async function newPerson(browser, base, person, path, storage, { record, size, tmp, label }) {
  const ctx = await browser.newContext({
    viewport: size,
    ...(record ? { recordVideo: { dir: tmp, size } } : {}),
  });
  await ctx.addCookies([
    ...(person.email ? [{ name: 'dev_student', value: person.email, url: base }] : []),
    { name: 'dev_role', value: person.role, url: base },
  ]);
  const sets = Object.entries(storage || {}).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('');
  await ctx.addInitScript(`try{${sets}}catch(e){}`);
  await ctx.addInitScript(CURSOR_JS);
  if (label) await ctx.addInitScript(labelJs(label));
  const page = await ctx.newPage();
  const born = Date.now();
  page.on('dialog', (d) => void d.accept());
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(900);
  return { ctx, page, born };
}

async function record(browser, base, id) {
  const recipe = RECIPES[id];
  const tmp = mkdtempSync(join(tmpdir(), 'whats-new-'));
  const extra = [];
  try {
    if (recipe.setup) {
      await recipe.setup({
        person: async (who, path, storage) => {
          const p = await newPerson(browser, base, who, path, storage, { record: false, size: FULL, tmp });
          extra.push(p.ctx);
          return p;
        },
      });
    }
    const two = recipe.people.length > 1;
    const size = two ? HALF : FULL;
    const people = [];
    for (const who of recipe.people) {
      people.push(await newPerson(browser, base, who, recipe.path, recipe.storage, {
        record: !recipe.posterOnly, size, tmp, label: two ? who.label : null,
      }));
    }
    const pages = people.map((p) => p.page);
    const demos = pages.map((p) => new Demo(p));
    for (const d of demos) await d.moveTo(size.width / 2, size.height / 2, 16);
    if (recipe.before) await recipe.before({ demos, pages });
    const t0 = Date.now();
    await recipe.run({ demos, pages });
    await pages[0].waitForTimeout(400);
    const t1 = Date.now();

    mkdirSync(OUT, { recursive: true });
    const mp4 = join(OUT, `${id}.mp4`);
    const jpg = join(OUT, `${id}.jpg`);
    if (recipe.posterOnly) {
      await pages[0].screenshot({ path: jpg, type: 'jpeg', quality: 82 });
      for (const p of people) await p.ctx.close();
      return { id, poster: jpg };
    }
    const videos = [];
    for (const p of people) {
      const v = p.page.video();
      await p.ctx.close();
      videos.push({ file: await v.path(), skip: (t0 - p.born) / 1000 });
    }
    const len = Math.min(15, (t1 - t0) / 1000 + 0.3);
    encode(videos, len, mp4);
    const dur = duration(mp4);
    run(FFMPEG, ['-y', '-loglevel', 'error', '-ss', Math.max(0, dur - (recipe.posterFromEnd ?? 0.6)).toFixed(2), '-i', mp4, '-frames:v', '1', '-q:v', '4', jpg]);
    return { id, clip: mp4, poster: jpg, dur };
  } finally {
    for (const c of extra) await c.close().catch(() => {});
    rmSync(tmp, { recursive: true, force: true });
  }
}

function encode(videos, len, mp4) {
  const inputs = videos.flatMap((v) => ['-ss', Math.max(0, v.skip - 0.2).toFixed(2), '-i', v.file]);
  const filter = videos.length === 1
    ? `[0:v]scale=${FULL.width}:${FULL.height}:flags=lanczos,fps=30,format=yuv420p[v]`
    : `[0:v]drawbox=x=iw-3:y=0:w=3:h=ih:color=0x6272a4:t=fill[l];[l][1:v]hstack=inputs=2:shortest=1,scale=${FULL.width}:${FULL.height}:flags=lanczos,fps=30,format=yuv420p[v]`;
  for (const kbps of [520, 380, 260]) {
    run(FFMPEG, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[v]', '-an', '-t', len.toFixed(2),
      ...h264Args(kbps), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
    if (statSync(mp4).size <= CLIP_CAP) return;
  }
  throw new Error(`${mp4} is still over ${(CLIP_CAP / 1048576).toFixed(1)} MB`);
}

async function main() {
  const args = process.argv.slice(2);
  const baseAt = args.indexOf('--base');
  const base = (baseAt >= 0 ? args[baseAt + 1] : process.env.WHATS_NEW_BASE || 'http://localhost:3019').replace(/\/$/, '');
  if (args.includes('--list')) { console.log(Object.keys(RECIPES).join('\n')); return; }
  const ids = args.includes('--all') ? Object.keys(RECIPES) : args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--base');
  if (!ids.length) { console.error('usage: node scripts/whats-new/record.mjs <entry-id>... | --all | --list [--base URL]'); process.exit(2); }
  for (const id of ids) if (!RECIPES[id]) { console.error(`no recipe for ${id} (have: ${Object.keys(RECIPES).join(', ')})`); process.exit(2); }
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  let failed = 0;
  try {
    for (const id of ids) {
      try {
        const r = await record(browser, base, id);
        const kb = (f) => `${Math.round(statSync(f).size / 1024)} KB`;
        console.log(r.clip
          ? `${id}: ${r.dur.toFixed(1)} s, clip ${kb(r.clip)}, poster ${kb(r.poster)}${r.dur < 5 || r.dur > 15.5 ? '  (outside 5-15 s)' : ''}`
          : `${id}: poster only, ${kb(r.poster)}`);
      } catch (e) {
        failed++;
        const where = (e.stack || '').split('\n').find((l) => l.includes('record.mjs:')) || '';
        console.error(`${id}: FAILED ${e.message.split('\n')[0]} ${where.trim()}`);
      }
    }
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}

await main();
