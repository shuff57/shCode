#!/usr/bin/env python
"""Prove the sandbox gate bites.

A green gate means nothing until you have watched it go red for the right
reason. This breaks one behaviour at a time, runs the gate, and asserts the
specific check that guards that behaviour is the one that fails.

The shPlay gate once reported 59/59 PASS when it should have said 79 -- a stray
backtick broke the checks file and a try/catch swallowed the load error. This
script exists so that cannot happen quietly here.

    python scripts/sandbox-mutations.py

Every mutation is reverted, including on Ctrl-C.
"""

import io
import re
import subprocess
import sys

GATE = [sys.executable, "scripts/sandbox-checks.py"]

# (name, file, find, replace, checks that MUST go red)
MUTATIONS = [
    (
        "reload the frame instead of messaging it",
        "components/SandboxWorkspace.tsx",
        "    frameRef.current?.contentWindow?.postMessage(\n"
        "      { source: 'jscad-set-params', params: next },\n"
        "      '*'\n"
        "    );",
        "    setRunKey((k) => k + 1);",
        {"NO_RELOAD_ON_DIMENSION_CHANGE", "NO_FRAME_NAVIGATION"},
    ),
    (
        "ignore inbound parameter messages",
        "public/jscad/runner.html",
        "\t\tif (!d || d.source !== 'jscad-set-params' || !d.params) return;",
        "\t\tif (true) return;",
        {"MODEL_REDRAWN", "REBUILD_TIME_REPORTED", "SLIDER_DRAG_REBUILDS"},
    ),
    (
        "clamp mid-keystroke instead of on blur",
        "components/JscadParamsPanel.tsx",
        "                  setDraft((p) => ({ ...p, [d.name]: t }));",
        "                  setDraft((p) => ({ ...p, [d.name]: String(settle(Number(t) || 0, d)) }));",
        {"NO_CLAMP_WHILE_TYPING"},
    ),
    (
        "push half-typed input straight into the model",
        "components/JscadParamsPanel.tsx",
        "                  if (t.trim() !== '' && Number.isFinite(v)) push(d.name, v);",
        "                  push(d.name, Number.isFinite(v) ? v : 0);",
        {"EMPTY_FIELD_KEEPS_MODEL"},
    ),
    (
        "drop the arrow-key nudge",
        "components/JscadParamsPanel.tsx",
        "                  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;",
        "                  if (true) return;",
        {"ARROW_UP_NUDGES_BY_STEP", "ARROW_DOWN_NUDGES"},
    ),
    (
        "stop settling to step / int on blur",
        "components/JscadParamsPanel.tsx",
        "  const step = typeof d.step === 'number' && d.step > 0 ? d.step : isInt(d) ? 1 : 0;",
        "  const step = 0;",
        {"FRACTION_SETTLES_TO_STEP"},
    ),
    (
        "discard an edit made before the first render",
        "public/jscad/runner.html",
        "		if (rebuildPending) { rebuildPending = false; rebuild({}); }",
        "		if (rebuildPending) { rebuildPending = false; }",
        {"EARLY_EDIT_REACHED_THE_MODEL"},
    ),
    (
        "let a thrown rebuild pass unlabelled",
        "public/jscad/runner.html",
        "			window.parent.postMessage({ source: 'jscad-rebuilt', ms: 0, failed: true }, '*');",
        "			void 0;",
        {"THROWN_REBUILD_IS_LABELLED"},
    ),
    (
        "treat an emptied model as a no-op",
        "public/jscad/runner.html",
        "\t\tif (!geometry || isEmptyGeometry(geometry)) {",
        "\t\tif (!geometry) {",
        {"EMPTY_RESULT_IS_FLAGGED"},
    ),
]


def read(p):
    return io.open(p, encoding="utf8", newline="").read()


def write(p, s):
    io.open(p, "w", encoding="utf8", newline="").write(s)


def failed_checks(output):
    return set(re.findall(r"\[FAIL\] (\w+)", output))


def main():
    ok = True
    for name, path, find, repl, expect in MUTATIONS:
        original = read(path)
        if find not in original:
            print(f"  [SKIP] {name}\n         anchor no longer present in {path}")
            ok = False
            continue
        try:
            write(path, original.replace(find, repl, 1))
            out = subprocess.run(GATE, capture_output=True, text=True).stdout
            red = failed_checks(out)
        finally:
            write(path, original)

        missed = expect - red
        if missed:
            print(f"  [BLIND] {name}")
            print(f"          expected red: {sorted(expect)}")
            print(f"          actually red: {sorted(red) or 'nothing'}")
            print(f"          NOT CAUGHT:   {sorted(missed)}")
            ok = False
        else:
            extra = red - expect
            tail = f"  (also: {sorted(extra)})" if extra else ""
            print(f"  [BITES] {name} -> {sorted(expect)}{tail}")

    print()
    if ok:
        print("  every mutation was caught by the check that guards it")
    else:
        print("  a check did not bite -- it is decoration, not a gate")
    return 0 if ok else 1


if __name__ == "__main__":
    print("\nmutation run -- breaking one behaviour at a time\n")
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\ninterrupted; files were restored")
        sys.exit(130)
