#!/usr/bin/env node
// Every tool on BOTH of Onshape's toolbars -- the Part Studio feature bar and
// the Sketch bar that appears while a sketch is open -- is accounted for
// exactly once: shipped, queued to build, or refused with a written reason. This is
// the measurable half of the toolbar gauntlet, and it is deliberately NOT
// editable to make a red check go green: the fix for "unaccounted" is to place
// the tool in .gauntlet/parity.json, never to delete it from onshape-tools.txt.
//
// The list in onshape-tools.txt was scraped from the live Onshape help TOC
// (PartStudio/feature_tools.htm) on 2026-08-24. Re-scrape it, do not hand-edit.
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const BARS = [
  { name: 'feature', tools: '.gauntlet/onshape-tools.txt', map: '.gauntlet/parity.json' },
  { name: 'sketch',  tools: '.gauntlet/onshape-sketch-tools.txt', map: '.gauntlet/parity-sketch.json' },
];

let problems = 0;

for (const barDef of BARS) {
const bar = read(barDef.tools).split('\n').map((s) => s.trim()).filter(Boolean);
const map = JSON.parse(read(barDef.map));

// Where each tool is claimed. A tool named in two places is as bad as one named
// in none -- it means two pieces of work think they own it.
const claims = new Map();
const claim = (tool, where) => {
  const t = tool.trim();
  if (!t) return;
  claims.set(t, [...(claims.get(t) ?? []), where]);
};

for (const s of map.ships) claim(s.onshape, `ships:${s.shcad}`);
for (const b of map.build) for (const t of b.covers) claim(t, `build:${b.id}`);
for (const g of map.outOfScope) for (const t of g.tools) claim(t, `scope:${g.group}`);

const unaccounted = bar.filter((t) => !claims.has(t));
const doubled = [...claims].filter(([, w]) => w.length > 1);
const phantom = [...claims.keys()].filter((t) => !bar.includes(t) );

let bad = 0;
const fail = (label, list, hint) => {
  if (!list.length) return;
  bad += list.length;
  console.error(`\nFAIL [${barDef.name}] ${label} (${list.length}) -- ${hint}`);
  for (const x of list) console.error('  ' + (Array.isArray(x) ? `${x[0]} <- ${x[1].join(', ')}` : x));
};

fail('unaccounted', unaccounted, 'place it in ships, build, or outOfScope with a reason');
fail('claimed twice', doubled, 'two entries own the same tool');
fail('not on the bar', phantom, 'named in the map but absent from the scraped list -- stale name?');

const counts = {
  bar: bar.length,
  ships: map.ships.length,
  build: map.build.length,
  outOfScope: map.outOfScope.reduce((n, g) => n + g.tools.length, 0),
};
console.log(`${barDef.name.padEnd(7)} toolbar: ${String(counts.bar).padStart(2)} tools -- ` +
  `${counts.ships} shipped, ${counts.build} pieces queued, ${counts.outOfScope} refused with a reason` +
  (bad ? '   <-- PROBLEMS' : ''));

problems += bad;
}

if (problems) { console.error(`\n${problems} problem(s) across both bars. No silent omissions.`); process.exit(1); }
console.log('both toolbars: every tool accounted for exactly once');
