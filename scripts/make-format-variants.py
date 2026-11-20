#!/usr/bin/env python3
"""scripts/make-format-variants.py -- regenerate with: python3 scripts/make-format-variants.py
For every AI Check lab, make a brace-less variant of the reference solution (single-statement { } bodies
unwrapped) and write it as a harness fixture, all cards labelled met. Syntax-checked with node."""
import json, glob, os, re, subprocess, tempfile
root = '/home/shuff57/Documents/GitHub/shCode'
out = f'{root}/scripts/ci-heldout/variants'  # generated, gitignored
os.makedirs(out, exist_ok=True)

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

def syntax_ok(code):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f:
        f.write(code); p = f.name
    r = subprocess.run(['node', '--check', p], capture_output=True)
    os.unlink(p)
    return r.returncode == 0

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
    if changed and syntax_ok(var): variants.append(('no braces on single-statement bodies', var))
    nosemi = re.sub(r';[ \t]*$', '', ref, flags=re.M)
    if nosemi != ref and syntax_ok(nosemi): variants.append(('no semicolons at line ends', nosemi))
    sq = re.sub(r'"([^"\\\n\'`$]*)"', lambda m: "'" + m.group(1) + "'", ref)
    if "'" not in ref and sq != ref and syntax_ok(sq): variants.append(('single quotes', sq))
    allman = re.sub(r'\)[ \t]*\{[ \t]*$', ')\n{', ref, flags=re.M)
    if allman != ref and syntax_ok(allman): variants.append(('braces on their own line', allman))
    tabs = re.sub(r'^( {2,4})+', lambda m: '\t' * (len(m.group(0)) // (2 if len(m.group(1)) == 2 else 4)), ref, flags=re.M)
    if tabs != ref and syntax_ok(tabs): variants.append(('tab indentation', tabs))
    if not variants: continue
    json.dump([{'name': 'B ' + nm, 'files': {**others, file: v}, 'labels': [1] * len(j['requirements'])} for nm, v in variants],
              open(f'{out}/{lab}.json', 'w'), indent=1)
    n += 1; labs.append(lab)
open('/tmp/variant-labs.txt', 'w').write('\n'.join(labs) + '\n')
print(n, 'labs with a brace-less variant')
