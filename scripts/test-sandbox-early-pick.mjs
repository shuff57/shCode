#!/usr/bin/env node
// A sandbox mode button clicked before React has hydrated the page used to do
// nothing (the button is in the HTML, its handler is not there yet). The page
// now carries SANDBOX_EARLY_PICK_SCRIPT (lib/sandbox-modes.ts), which keeps
// such a click for SandboxWorkspace to read as it starts (takeEarlyPick).
// This runs the script itself on a small stand-in for the page.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-sandbox-early-pick.mjs

import { join } from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const M = await import(join(root, 'lib/sandbox-modes.ts'));

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${JSON.stringify(detail)}` : ''}`); }
}

/** A page with the toolbar's buttons, as far as the script can see it. */
function page({ storage = true } = {}) {
  const listeners = [];
  const attrs = {};
  const store = new Map();
  const button = (mode, disabled = false) => ({
    disabled,
    getAttribute: (n) => (n === 'data-sandbox-mode' ? mode : null),
    closest(sel) { return sel === '[data-sandbox-mode]' ? this : null; },
  });
  const label = (btn) => ({ closest: (sel) => (sel === '[data-sandbox-mode]' ? btn : null) });
  const window = {};
  const document = {
    addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] ?? null },
  };
  const localStorage = {
    setItem: (k, v) => { if (!storage) throw new Error('blocked'); store.set(k, v); },
    getItem: (k) => store.get(k) ?? null,
  };
  window.window = window;
  const ctx = vm.createContext({ window, document, localStorage });
  const run = () => vm.runInContext(M.SANDBOX_EARLY_PICK_SCRIPT, ctx);
  const click = (target) => { for (const l of listeners) if (l.type === 'click') l.fn({ target }); };
  return { window, listeners, attrs, store, run, click, button, label };
}

{
  const p = page();
  p.run();
  check('the script listens for clicks in the capture phase (before anything on the page)', p.listeners.length === 1 && p.listeners[0].type === 'click' && p.listeners[0].capture === true);
  p.run();
  check('a second copy of the script adds nothing', p.listeners.length === 1);
  p.click({ closest: () => null });
  check('a click elsewhere keeps nothing', p.store.size === 0 && !p.attrs['data-sandbox-pick']);
  p.click(p.label(p.button('js')));
  check('an early click on JavaScript is kept where the page reads its mode', p.store.get(M.SANDBOX_MODE_KEY) === 'js', [...p.store]);
  check('...and the button looks pressed at once (html data-sandbox-pick)', p.attrs['data-sandbox-pick'] === 'js');
  p.click(p.button('flow', true));
  check('a disabled button is not a pick', p.store.get(M.SANDBOX_MODE_KEY) === 'js');
  p.click(p.button('python'));
  check('only the sandbox\'s own modes', p.store.get(M.SANDBOX_MODE_KEY) === 'js');
  check('takeEarlyPick hands the page the click', M.takeEarlyPick(p.window) === 'js' && p.window.__shcodeSandboxReady === true);
  p.click(p.button('reshape'));
  check('once the page has started, the script leaves clicks to it', p.store.get(M.SANDBOX_MODE_KEY) === 'js' && p.attrs['data-sandbox-pick'] === 'js');
}
{
  const p = page({ storage: false });
  p.run();
  p.click(p.button('moshion'));
  check('storage refused (private mode): the pick is still kept for the page', M.takeEarlyPick(p.window) === 'moshion' && p.store.size === 0);
}
{
  check('no early click: takeEarlyPick says so', M.takeEarlyPick({}) === null);
  check('the script names every sandbox mode', M.SANDBOX_MODES.every((m) => M.SANDBOX_EARLY_PICK_SCRIPT.includes(`"${m.id}"`)));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
