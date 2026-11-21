// Physics benchmark for spaSHial: node bench.mjs [--only rapier|cannon|jolt] [--json]
//
// CPU-bound, so it is meaningful on any machine (unlike GPU work, which needs a
// real device). Each engine runs in its own child process so wasm heaps and JIT
// state never leak between them. Same seeded scene for every engine.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { ADAPTERS, DT } from './adapters.mjs';

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

// ---- seeded RNG so every engine gets the identical scene --------------------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { mean, p50: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1] };
};

function timeSteps(w, n) {
  const ms = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    w.step();
    ms[i] = performance.now() - t;
  }
  return ms;
}

// ---- scenarios --------------------------------------------------------------
async function pyramid(adapter, sleep) {
  const w = await adapter.create({ sleep });
  w.staticBox(0, -0.5, 0, 40, 0.5, 40);
  const N = 14; // 105 boxes
  const boxes = [];
  for (let layer = 0; layer < N; layer++) {
    const n = N - layer;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 1.02;
      const y = 0.5 + layer * 1.0;
      boxes.push({ h: w.box(x, y, 0, 0.5, 0.5, 0.5), start: [x, y, 0] });
    }
  }
  const ms = timeSteps(w, 600);
  let moved = 0;
  for (const b of boxes) {
    const p = w.pos(b.h);
    if (Math.hypot(p[0] - b.start[0], p[1] - b.start[1], p[2] - b.start[2]) > 0.3) moved++;
  }
  const top = w.pos(boxes[boxes.length - 1].h);
  w.dispose();
  return { bodies: boxes.length, step: stats(ms), movedOver30cm: moved, topBoxDrop: +(boxes[boxes.length - 1].start[1] - top[1]).toFixed(3) };
}

async function rain(adapter, { sleep, events, rays, layers = 12, steps = 900 }) {
  const w = await adapter.create({ sleep });
  let contacts = 0;
  if (events) w.onContact(() => { contacts++; });
  // a bin: floor and four walls
  w.staticBox(0, -0.5, 0, 14, 0.5, 14);
  w.staticBox(12.5, 4, 0, 0.5, 4.5, 13);
  w.staticBox(-12.5, 4, 0, 0.5, 4.5, 13);
  w.staticBox(0, 4, 12.5, 13, 4.5, 0.5);
  w.staticBox(0, 4, -12.5, 13, 4.5, 0.5);
  const rand = rng(1234);
  const hs = [];
  for (let layer = 0; layer < layers; layer++) {
    for (let ix = 0; ix < 10; ix++) {
      for (let iz = 0; iz < 10; iz++) {
        const x = (ix - 4.5) * 1.15 + (rand() - 0.5) * 0.3;
        const z = (iz - 4.5) * 1.15 + (rand() - 0.5) * 0.3;
        const y = 2 + layer * 1.3 + rand() * 0.2;
        hs.push(rand() < 0.5 ? w.sphere(x, y, z, 0.4) : w.box(x, y, z, 0.4, 0.4, 0.4));
      }
    }
  }
  const ms = timeSteps(w, steps);
  const out = {
    bodies: hs.length,
    step: stats(ms),
    settledMean: +stats(ms.slice(-Math.floor(steps / 3))).mean.toFixed(3), // last third: the settled pile
  };
  let escaped = 0;
  const ys = [];
  for (const h of hs) {
    const p = w.pos(h);
    if (Math.abs(p[0]) > 13 || Math.abs(p[2]) > 13 || p[1] < -2) escaped++;
    ys.push(p[1]);
  }
  ys.sort((a, b) => a - b);
  out.escaped = escaped;
  out.pileP95Y = +ys[Math.floor(ys.length * 0.95)].toFixed(2); // robust: one body on a wall top does not count
  if (events) out.contactEvents = contacts;
  if (rays) {
    const r = rng(99);
    const t = performance.now();
    let hits = 0;
    for (let i = 0; i < 20000; i++) if (w.rayDown((r() - 0.5) * 20, (r() - 0.5) * 20) !== null) hits++;
    const total = performance.now() - t;
    out.rays = { count: 20000, ms: +total.toFixed(1), usEach: +((total / 20000) * 1000).toFixed(2), hits };
  }
  w.dispose();
  return out;
}

// ---- child: run one engine, print JSON --------------------------------------
async function runOne(name) {
  const adapter = ADAPTERS.find((a) => a.name.startsWith(name));
  const t0 = performance.now();
  const probe = await adapter.create({ sleep: false }); // measures load + init
  const initMs = performance.now() - t0;
  probe.dispose();
  const res = { engine: adapter.name, initMs: +initMs.toFixed(0) };
  res.pyramid = await pyramid(adapter, false);
  res.rainAwake = await rain(adapter, { sleep: false, events: false, rays: true });
  res.rainSleep = await rain(adapter, { sleep: true, events: false, rays: false });
  res.rainEvents = await rain(adapter, { sleep: false, events: true, rays: false });
  // How many awake bodies fit in a frame? 300 steps each, from a small game to the stress case.
  res.scaling = {};
  for (const layers of [2, 4, 6, 9]) {
    const r = await rain(adapter, { sleep: false, events: false, rays: false, layers, steps: 300 });
    res.scaling[r.bodies] = +r.step.mean.toFixed(2);
  }
  res.scaling[res.rainAwake.bodies] = +res.rainAwake.step.mean.toFixed(2);
  res.rssMB = Math.round(process.memoryUsage().rss / 1048576);
  console.log('@@RESULT@@' + JSON.stringify(res));
}

// ---- parent: spawn each, then print tables -----------------------------------
function fmt(s) { return `${s.mean.toFixed(2)} / ${s.p95.toFixed(2)} / ${s.max.toFixed(1)}`; }

async function main() {
  if (args.includes('--child')) return runOne(args[args.indexOf('--child') + 1]);
  const names = ADAPTERS.map((a) => a.name.split(' ')[0]).filter((n) => !only || n.startsWith(only));
  const results = [];
  for (const n of names) {
    process.stderr.write(`running ${n} ...\n`);
    const r = spawnSync(process.execPath, [new URL(import.meta.url).pathname, '--child', n], { encoding: 'utf8', maxBuffer: 1 << 26 });
    const line = (r.stdout || '').split('\n').find((l) => l.startsWith('@@RESULT@@'));
    if (!line) { console.error(`${n} FAILED\n${r.stderr || r.stdout}`); continue; }
    results.push(JSON.parse(line.slice(10)));
  }
  const machine = { cpu: os.cpus()[0]?.model, threads: os.cpus().length, node: process.version, platform: `${os.platform()} ${os.release()}` };
  fs.writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify({ date: new Date().toISOString().slice(0, 10), machine, results }, null, 2));
  if (args.includes('--json')) return console.log(JSON.stringify(results, null, 2));
  console.log(`\nMachine: ${machine.cpu} (${machine.threads} threads), node ${machine.node}`);
  const budget = (DT * 1000).toFixed(1);
  console.log(`\nStep cost in ms: mean / p95 / max. Frame budget at 60 fps is ${budget} ms for EVERYTHING (physics + render + game code).\n`);
  const row = (label, f) => console.log(label.padEnd(34) + results.map((r) => String(f(r)).padEnd(26)).join(''));
  row('', (r) => r.engine);
  row('load + init (ms)', (r) => r.initMs);
  row('peak RSS (MB)', (r) => r.rssMB);
  row(`pyramid ${results[0]?.pyramid.bodies} boxes, awake`, (r) => fmt(r.pyramid.step));
  row('  boxes moved > 30 cm (0 = stood)', (r) => r.pyramid.movedOver30cm);
  row('  top box dropped (m)', (r) => r.pyramid.topBoxDrop);
  row(`rain ${results[0]?.rainAwake.bodies} bodies, awake`, (r) => fmt(r.rainAwake.step));
  row('  settled pile, mean of last 5 s', (r) => r.rainAwake.settledMean);
  row('  escaped the bin (0 = good)', (r) => r.rainAwake.escaped);
  row('  pile height, 95th percentile (m)', (r) => r.rainAwake.pileP95Y);
  row('rain, sleeping enabled', (r) => fmt(r.rainSleep.step));
  row('  settled pile, mean of last 5 s', (r) => r.rainSleep.settledMean);
  row('rain + contact events', (r) => fmt(r.rainEvents.step));
  row('  contact-begin events seen', (r) => r.rainEvents.contactEvents);
  row('20,000 raycasts (total ms)', (r) => r.rainAwake.rays.ms);
  row('  per ray (us)', (r) => r.rainAwake.rays.usEach);
  console.log('\nMean step (ms) by number of awake bodies:');
  for (const n of Object.keys(results[0]?.scaling ?? {})) row(`  ${n} bodies`, (r) => r.scaling[n]);
}

main().catch((e) => { console.error(e); process.exit(1); });
