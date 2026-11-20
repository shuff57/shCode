#!/usr/bin/env python3
"""Speed bench for the code-first CAD workspace (/sandbox/cad/), against a running dev server.

Usage:  python3 scripts/bench-cad-speed.py [label] [--url http://127.0.0.1:3002] [--repeat 2]
Needs Python Playwright (pip install playwright; playwright install chromium). Run it on an idle machine:
timings taken under load mean nothing. Writes /tmp/cad-bench-<label>.json and prints a table.

Each scenario is driven through the studio itself (the editor, the Run button), and the host page's own
logs give the engine side: real engine runs, their time, and the budget probes. The project is served
by the bench (the lesson-sync request is answered here) and every write is blocked, so nothing is saved.
"""
import json, sys, time, statistics
from playwright.sync_api import sync_playwright

args = [a for a in sys.argv[1:] if not a.startswith('--')]
LABEL = args[0] if args else 'run'
URL = sys.argv[sys.argv.index('--url') + 1] if '--url' in sys.argv else 'http://127.0.0.1:3002'
REPEAT = int(sys.argv[sys.argv.index('--repeat') + 1]) if '--repeat' in sys.argv else 2

STARTER = """const width = 60;
const depth = 40;
const height = 10;

const base = sketch('top');
base.rectangle([0, 0], [width, depth]);
const part = extrude(base, height);

fillet(part.edge('top', 'front'), 2);

const lid = sketch('top', height);
lid.circle([width / 2, depth / 2], { r: 6 });
pocket(lid, part, height, { through: true });
"""
HEAVY = """const plate = cuboid(80, 60, 8);
fillet(plate.edge('top', 'front'), 2);
fillet(plate.edge('top', 'back'), 2);
hole(plate, { across: 5, at: [-30, -20] });
hole(plate, { across: 5, at: [30, -20] });
hole(plate, { across: 5, at: [-30, 20] });
hole(plate, { across: 5, at: [30, 20] });
const boss = cylinder(20, 12, { at: [0, 0, 10] });
union(plate, boss);
const box = cuboid(40, 30, 20, { at: [100, 0, 10] });
shell(box, { wall: 2, open: 'top' });
"""
SCENARIOS = [
    ('starter: first Run', STARTER),
    ('starter: same code again', STARTER),
    ('starter: + one new part', STARTER + "const peg = cylinder(6, 10, { at: [80, 0, 5] });\n"),
    ('heavy: first Run', HEAVY),
    ('heavy: same code again', HEAVY),
    ('heavy: + one chamfer', HEAVY + "chamfer(box.edge('bottom', 'front'), 1);\n"),
]
FILES = {'script.js': STARTER, 'cad.json': json.dumps({'version': 4, 'language': 'reshape'}) + '\n'}

STATUS = "document.querySelector('[class*=panelTitle] [role=status]')?.textContent||''"
def engine_marks(pg):
    return pg.evaluate("()=>{const h=document.querySelector('iframe[title=SolidCraft]').contentWindow.__host;return [h.engineLog.length,h.probeLog.length]}")
def engine_since(pg, marks):
    return pg.evaluate("""(m)=>{const h=document.querySelector('iframe[title=SolidCraft]').contentWindow.__host;
      const e=h.engineLog.slice(m[0]),p=h.probeLog.slice(m[1]);
      return {engineRuns:e.length,engineMs:e.reduce((a,r)=>a+r.ms,0),probes:p.length,probeMs:p.reduce((a,r)=>a+r.wallMs,0)}}""", marks)
def set_code(pg, text):
    pg.locator('.cm-content').first.click(); pg.keyboard.press('Control+a'); pg.keyboard.press('Delete'); pg.keyboard.insert_text(text)
def run_once(pg):
    pg.evaluate("()=>performance.clearMeasures()")
    marks = engine_marks(pg); t = time.time()
    pg.get_by_role('button', name='Run', exact=True).click()
    pg.wait_for_function("()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Building…')", timeout=10000)
    pg.wait_for_function("()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Run'&&!b.disabled)", timeout=600000)
    wall = time.time() - t
    phases = pg.evaluate("()=>Object.fromEntries(performance.getEntriesByType('measure').filter(m=>m.name.startsWith('cad:')).map(m=>[m.name.slice(4),Math.round(m.duration)]))")
    phases.update(pg.evaluate("()=>{const w=document.querySelector('iframe[title=SolidCraft]').contentWindow;const o=Object.fromEntries(w.performance.getEntriesByType('measure').filter(m=>m.name.startsWith('host:')).map(m=>[m.name,Math.round(m.duration)]));w.performance.clearMeasures();return o}"))
    return {'wallS': round(wall, 2), 'status': pg.evaluate(f"()=>{STATUS}"), 'phasesMs': phases, **engine_since(pg, marks)}

def one_pass():
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1440, 'height': 960}); pg = ctx.new_page()
        def route(r):
            req = r.request
            if req.method != 'GET': return r.abort()
            if '/api/lesson-sync/sandbox-reshape' in req.url: return r.fulfill(status=200, content_type='application/json', body=json.dumps({'files': FILES, 'revision': 1, 'updatedAt': '2026-11-17T00:00:00Z', 'versioned': True}))
            return r.continue_()
        pg.route('**/api/**', route); pg.on('dialog', lambda d: d.accept())
        t = time.time()
        pg.goto(URL + '/sandbox/cad/', wait_until='domcontentloaded', timeout=120000)
        pg.wait_for_function(f"()=>/Built \\d+/.test({STATUS})", timeout=300000)
        out['open → first part shown'] = {'wallS': round(time.time() - t, 2), 'status': pg.evaluate(f"()=>{STATUS}")}
        pg.wait_for_timeout(1500)
        for name, code in SCENARIOS:
            if name == 'starter: first Run': continue  # the page's own first build above is the starter's first Run
            set_code(pg, code); out[name] = run_once(pg); pg.wait_for_timeout(800)
        b.close()
    return out

passes = [one_pass() for _ in range(REPEAT)]
rows = {}
for name in passes[0]:
    walls = [p[name]['wallS'] for p in passes if name in p]
    last = passes[-1][name]
    rows[name] = {'wallS': round(statistics.median(walls), 2), 'all': walls, **{k: v for k, v in last.items() if k != 'wallS'}}
json.dump({'label': LABEL, 'url': URL, 'at': time.strftime('%Y-%m-%d %H:%M:%S'), 'rows': rows}, open(f'/tmp/cad-bench-{LABEL}.json', 'w'), indent=1)
print(f"{'scenario':32} {'median s':>9} {'engine runs':>12} {'engine ms':>10} {'probes':>7} {'probe ms':>9}")
for name, r in rows.items():
    print(f"{name:32} {r['wallS']:>9} {str(r.get('engineRuns', '')):>12} {str(r.get('engineMs', '')):>10} {str(r.get('probes', '')):>7} {str(r.get('probeMs', '')):>9}")
for name, r in rows.items():
    if r.get('phasesMs'): print(f"  {name:30} phases ms: {r['phasesMs']}")
print(f'written /tmp/cad-bench-{LABEL}.json')
