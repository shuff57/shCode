#!/usr/bin/env python3
"""scripts/make-format-variants.py -- regenerate with: python3 scripts/make-format-variants.py
For every AI Check lab, make style variants of the reference solution (no braces on single-statement bodies,
no semicolons, single quotes, braces on their own line, tab indentation) and write them as a harness fixture,
all cards labelled met. A variant is kept only if it parses AND is the same program as the reference
(scripts/same-program.mjs compares their syntax trees), so a rewrite that changed the meaning (a removed `;`
joining two lines, a tab inside a template literal) is dropped rather than labelled met.
Works from the checkout it lives in (a worktree reads its own lessons)."""
import json, glob, os, re, subprocess, tempfile
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = f'{root}/scripts/ci-heldout/variants'  # generated, gitignored
os.makedirs(out, exist_ok=True)
SAME = f'{root}/scripts/same-program.mjs'

BODY = re.compile(r'(\)|\belse|\bdo)\s*\{([^{}]*)\}')

def unwrap(src):
    changed = 0
    def rep(m):
        nonlocal changed
        body = m.group(2).strip()
        lines = [l for l in body.split('\n') if l.strip() and not l.strip().startswith('//')]
        if len(lines) != 1 or '//' in body or body.count(';') > 1:
            return m.group(0)
        stmt = lines[0].strip()
        if re.match(r'(if|for|while|do|switch|try|function|const|let|var|return\b.*\n)', stmt) and not stmt.startswith('return'):
            return m.group(0)
        # a body that contains a nested construct or a trailing else-chain keeps its braces
        if re.search(r'\b(if|else|for|while|switch|try)\b', stmt):
            return m.group(0)
        changed += 1
        return f'{m.group(1)} {stmt}'
    # repeat so an unwrapped inner body does not block an outer one
    prev = None
    while prev != src:
        prev = src
        src = BODY.sub(rep, src)
    return src, changed

def same_program(ref, code):
    """True when `code` parses and means what `ref` means (scripts/same-program.mjs)."""
    paths = []
    try:
        for text in (ref, code):
            with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
                f.write(text); paths.append(f.name)
        if subprocess.run(['node', '--check', paths[1]], capture_output=True).returncode != 0:
            return False
        return subprocess.run(['node', SAME, *paths], capture_output=True).returncode == 0
    finally:
        for p in paths: os.unlink(p)

dropped = 0
def keep(ref, code):
    global dropped
    ok = same_program(ref, code)
    if not ok: dropped += 1
    return ok

n = 0; labs = []
for f in sorted(glob.glob(f'{root}/lessons/*/lesson.json')):
    lab = f.split('/')[-2]
    try: j = json.load(open(f))
    except Exception: continue
    ac = j.get('aiCheck') or {}
    if not ac.get('clef'): continue
    file = ac.get('file', 'script.js')
    if not file.endswith('.js'): continue
    ref = None; others = {}
    for cand in (f'{root}/lessons/{lab}/solution.js', f'{root}/lessons/{lab}/solution/{file}'):
        if os.path.exists(cand): ref = open(cand).read(); break
    sd = f'{root}/lessons/{lab}/solution'
    if os.path.isdir(sd):
        for dp, dn, fn in os.walk(sd):
            if '/variants' in dp: continue
            for x in fn:
                rel = os.path.relpath(os.path.join(dp, x), sd)
                if rel != file:
                    try: others[rel] = open(os.path.join(dp, x)).read()
                    except Exception: pass
    if ref is None: continue
    variants = []
    var, changed = unwrap(ref)
    if changed and keep(ref, var): variants.append(('no braces on single-statement bodies', var))
    nosemi = re.sub(r';[ \t]*$', '', ref, flags=re.M)
    if nosemi != ref and keep(ref, nosemi): variants.append(('no semicolons at line ends', nosemi))
    sq = re.sub(r'"([^"\\\n\'`$]*)"', lambda m: "'" + m.group(1) + "'", ref)
    if "'" not in ref and sq != ref and keep(ref, sq): variants.append(('single quotes', sq))
    allman = re.sub(r'\)[ \t]*\{[ \t]*$', ')\n{', ref, flags=re.M)
    if allman != ref and keep(ref, allman): variants.append(('braces on their own line', allman))
    tabs = re.sub(r'^( {2,4})+', lambda m: '\t' * (len(m.group(0)) // (2 if len(m.group(1)) == 2 else 4)), ref, flags=re.M)
    if tabs != ref and keep(ref, tabs): variants.append(('tab indentation', tabs))
    if not variants: continue
    json.dump([{'name': 'B ' + nm, 'files': {**others, file: v}, 'labels': [1] * len(j['requirements'])} for nm, v in variants],
              open(f'{out}/{lab}.json', 'w'), indent=1)
    n += 1; labs.append(lab)
open(f'{out}/labs.txt', 'w').write('\n'.join(labs) + '\n')
print(n, 'labs with style variants;', dropped, 'variants dropped (did not parse, or changed what the program does)')
