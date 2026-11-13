// Guard: every PERSONAL browser key goes through lib/owned-storage.ts.
//
// Each account's work lives in this browser under `w1:<owner>:...` (design
// .ui-hill-climb/ux1/option2-design.md, stage 1). One raw `localStorage.setItem`
// of a draft anywhere else would put that work back into a key every account on
// the computer reads -- the shared-computer bug this whole layer exists to end.
//
// So this test reads every .ts/.tsx under lib/, components/ and app/ and fails on:
//  1. a raw localStorage / sessionStorage access outside lib/owned-storage.ts whose
//     key is not on the NON-PERSONAL allowlist below (UI state, settings, a tab's
//     own device id: never a student's work);
//  2. raw Storage handed around as a value (`= window.localStorage`, `return
//     window.sessionStorage`) outside the files listed in VALUE_ALLOWED;
//  2b. storage reached any other way: `window['localStorage']`, `const { localStorage } =
//     window`, `Storage.prototype`, or the bare string 'localStorage' / 'sessionStorage'
//     handed to anything (Reflect.get, getOwnPropertyDescriptor, ...);
//  3. an old unprefixed personal key name (`shCode:progress`, `moshion.store.v1`,
//     ...) written as a string anywhere but the adapter and its legacy reader.
//
// Adding a key: if it holds anything a student made or chose, use ownedLocal
// (or ownedSession). Only a key that is the same for everyone who uses the
// computer, or is about the screen and not the work, goes on the allowlist.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-owned-storage-keys.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { LEGACY_EXACT, LEGACY_PREFIXES } from '../lib/owned-storage.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Files whose `localStorage` text is code the STUDENT writes or reads about (docs,
// sandboxed runner sources, graders): it runs in a sandboxed frame or Worker with its
// own stand-in storage, or it is only text. Never the app's storage.
const NOT_APP_STORAGE = new Set([
  'lib/js-docs.ts',
  'lib/moshion-docs.ts',
  'lib/plan-check.ts',
  'lib/js-runner-source.ts',
  'lib/test-harness-source.ts',
  'lib/doc-inline-code.ts',
  'lib/editor-completions.ts',
  'lib/types.ts',
]);

// file -> key expressions (the first argument as written) that are NOT personal.
const NON_PERSONAL = {
  'lib/due-dates-edit.ts': ['ACTIVE_CLASS_KEY'], // a teacher's picked class: screen state
  'lib/stale-build-guard.ts': ['RELOAD_FLAG_KEY'], // reload-once flag for a stale bundle
  'lib/prefs.ts': ['PREFS_KEY', 'OLD_THEME_KEY', "'${PREFS_KEY}'", "'${OLD_THEME_KEY}'"], // Appearance, cleared at sign-out
  'lib/games-client.ts': ['SANDBOX_MODE_KEY'], // which sandbox tab opens
  'lib/sandbox-projects.ts': ['SANDBOX_MODE_KEY'], // same: the type opened last
  'components/LabTaskCard.tsx': ['OPEN_KEY'], // Your task panel open or closed
  'lib/sandbox-modes.ts': ['${JSON.stringify(SANDBOX_MODE_KEY)}'], // same, from the inline boot script
  'lib/written-grader-store.ts': ['GRADER_PREF_KEY'], // a grader choice (one target today)
  'lib/moshion-online.ts': ['DEVICE_KEY'], // a random id per TAB for a game seat (sessionStorage)
  'components/AnnouncementBanner.tsx': ['DISMISSED_KEY'], // class announcements dismissed
  'components/LabPlanChart.tsx': ['KEY + lessonId'], // chart open or folded
  'components/ClassLibraryPanel.tsx': ['STORE_KEY'], // remembered Library tab
  'components/ModuleLessonsList.tsx': ['foldKey'], // done lessons folded
  'components/TabbedRightDrawer.tsx': ['activeStorage', 'widthStorage', 'dockClosedStorage'], // drawer tab and width, lab side panel closed
  'components/DocsDrawer.tsx': ['setStorage'], // docs set picked
  'components/SandboxWorkspace.tsx': ['MODE_KEY', 'BUILD_KEY'], // sandbox tab, Build/Code side
  'components/WrittenGrader.tsx': ["'shcode:writtenTextSize'"], // text size
  'app/teacher/page.tsx': ["'shcode:lastClass'"], // last class opened
};

// Storage passed around as a value, on purpose, for keys that are not personal.
const VALUE_ALLOWED = {
  'components/WhatsNewModal.tsx': "What's new seen-state, already one key per account (lib/whats-new-state.ts)",
  'lib/share-choice.ts': 'the remembered default sharing choice',
  'components/OwnerNotices.tsx': 'the once-per-tab reload guard of lib/owner-guard.ts (shcode.ownerReload)',
};

const failures = [];
const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, ent.name);
    if (ent.isDirectory()) { if (ent.name !== 'node_modules') walk(rel); continue; }
    if (/\.(ts|tsx)$/.test(ent.name) && !/\.generated\.ts$/.test(ent.name)) files.push(rel);
  }
}
for (const d of ['lib', 'components', 'app']) walk(d);

// Parsed with the TypeScript compiler, so comments, JSX text and regexes never
// confuse it.
function isStorageName(n) {
  return ts.isIdentifier(n) && (n.text === 'localStorage' || n.text === 'sessionStorage');
}
/** `localStorage`, `window.localStorage`, `globalThis.sessionStorage`, ... */
function storageRef(n) {
  if (isStorageName(n)) return n.text;
  if (ts.isPropertyAccessExpression(n) && (n.name.text === 'localStorage' || n.name.text === 'sessionStorage')) return n.name.text;
  return null;
}

const legacyNames = [...LEGACY_EXACT, ...LEGACY_PREFIXES];
const STORAGE_NAMES = new Set(['localStorage', 'sessionStorage']);
let accesses = 0;

/** Problems in one file's source. Pure, so the self-test below can feed it fixtures. */
function scan(rel, text) {
  const failures = [];
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const line = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const allow = NON_PERSONAL[rel] ?? [];
  const visit = (node) => {
    // 3. old personal key names in any string (only the adapter may name them)
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
      || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))) {
      for (const name of legacyNames) {
        if (node.text.startsWith(name) || node.text.includes(`'${name}`) || node.text.includes(`"${name}`)) {
          failures.push(`${rel}:${line(node)} names the old shared key "${name}": personal keys go through lib/owned-storage.ts`);
        }
      }
    }
    // A key written inside script text (an inline boot script) must be allowlisted too.
    if (ts.isTemplateExpression(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const body = node.getText(sf);
      const inner = /\b(localStorage|sessionStorage)\.(getItem|removeItem)\(([^)]*)\)|\b(localStorage|sessionStorage)\.setItem\(([^,]*),/g;
      let m;
      while ((m = inner.exec(body))) {
        accesses++;
        const which = m[1] ?? m[4];
        const arg = (m[3] ?? m[5]).trim();
        if (!allow.includes(arg)) failures.push(`${rel}:${line(node)} script text calls ${which}(${arg}) -- not on the non-personal allowlist`);
      }
    }
    // 2b. Other ways to reach storage.
    if (ts.isElementAccessExpression(node) && node.argumentExpression
      && ts.isStringLiteralLike(node.argumentExpression) && STORAGE_NAMES.has(node.argumentExpression.text)) {
      failures.push(`${rel}:${line(node)} ${node.getText(sf)}: storage reached by a computed name outside lib/owned-storage.ts`);
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && STORAGE_NAMES.has(node.text)
      && !(ts.isElementAccessExpression(node.parent))) {
      failures.push(`${rel}:${line(node)} the string '${node.text}' outside lib/owned-storage.ts (storage reached indirectly)`);
    }
    if (ts.isBindingElement(node)) {
      const prop = node.propertyName && ts.isIdentifier(node.propertyName) ? node.propertyName.text : null;
      const name = ts.isIdentifier(node.name) ? node.name.text : null;
      if (STORAGE_NAMES.has(prop ?? '') || (!prop && STORAGE_NAMES.has(name ?? ''))) {
        failures.push(`${rel}:${line(node)} storage destructured (${node.getText(sf)}) outside lib/owned-storage.ts`);
      }
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Storage'
      && node.name.text === 'prototype') {
      failures.push(`${rel}:${line(node)} Storage.prototype used outside lib/owned-storage.ts`);
    }
    const ref = storageRef(node);
    // A binding name is handled above; its identifier is not a use of storage.
    if (ref && ts.isBindingElement(node.parent)) { ts.forEachChild(node, visit); return; }
    if (ref) {
      // Skip the inner `localStorage` identifier of `window.localStorage` (the outer node handles it).
      if (isStorageName(node) && ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) return;
      const p = node.parent;
      if (ts.isPropertyAccessExpression(p) && p.expression === node && ts.isCallExpression(p.parent) && p.parent.expression === p) {
        const method = p.name.text;
        accesses++;
        const arg = p.parent.arguments[0] ? p.parent.arguments[0].getText(sf) : '';
        if (method === 'clear' || method === 'key') {
          failures.push(`${rel}:${line(node)} ${ref}.${method}() outside lib/owned-storage.ts`);
        } else if (['getItem', 'setItem', 'removeItem'].includes(method)) {
          if (!allow.includes(arg)) failures.push(`${rel}:${line(node)} ${ref}.${method}(${arg}) -- not on the non-personal allowlist; use ownedLocal from lib/owned-storage.ts`);
        } else {
          failures.push(`${rel}:${line(node)} ${ref}.${method}(...) outside lib/owned-storage.ts`);
        }
      } else if (ts.isTypeOfExpression(p)) {
        /* typeof localStorage: harmless */
      } else if (ts.isElementAccessExpression(p) && p.expression === node) {
        failures.push(`${rel}:${line(node)} ${ref}[...] outside lib/owned-storage.ts`);
      } else if (ts.isPropertyAccessExpression(p) && p.expression === node) {
        failures.push(`${rel}:${line(node)} ${ref}.${p.name.text} outside lib/owned-storage.ts`);
      } else if (!(rel in VALUE_ALLOWED)) {
        failures.push(`${rel}:${line(node)} raw ${ref} used as a value; personal keys go through lib/owned-storage.ts`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return failures;
}

for (const rel of files) {
  if (rel === 'lib/owned-storage.ts' || NOT_APP_STORAGE.has(rel)) continue;
  failures.push(...scan(rel, fs.readFileSync(path.join(root, rel), 'utf8')));
}

// The checker itself must catch what it guards, or a broken parser passes everything.
const self = [];
if (accesses < 15) self.push(`only ${accesses} raw storage calls found: the scan is broken`);
const fixtures = [
  // [file, source, should fail]
  ['components/X.tsx', "export const A = () => <p>Don't</p>; localStorage.setItem('quiz:' + id, v);", true],
  ['components/X.tsx', "const v = window.localStorage.getItem(DRAFT_KEY);", true],
  ['components/X.tsx', "const s = window.sessionStorage; s.setItem('a', 'b');", true],
  ['components/X.tsx', "Object.keys(localStorage).forEach(f);", true],
  ['components/X.tsx', "const k = 'shCode:progress';", true],
  ['components/X.tsx', "// localStorage.setItem('shCode:progress', x)\nownedLocal.setItem('quiz:' + id, v);", false],
  ['components/LabPlanChart.tsx', "localStorage.setItem(KEY + lessonId, '1');", false],
  ['components/Other.tsx', "localStorage.setItem(KEY + lessonId, '1');", true],
  ['lib/x.ts', "const boot = `try{localStorage.setItem('shCode:quiz:a',1)}catch(_){}`;", true],
  ['lib/x.ts', "if (typeof localStorage !== 'undefined') ok();", false],
  ['components/X.tsx', "window['localStorage'].setItem('quiz:' + id, v);", true],
  ['components/X.tsx', 'globalThis["sessionStorage"].getItem(k);', true],
  ['components/X.tsx', "const { localStorage } = window; localStorage.setItem('a', b);", true],
  ['components/X.tsx', "const { localStorage: ls } = window; ls.setItem('a', b);", true],
  ['components/X.tsx', "const { sessionStorage: s } = globalThis;", true],
  ['components/X.tsx', "Storage.prototype.setItem.call(store, 'quiz:a', v);", true],
  ['components/X.tsx', "const s = Reflect.get(window, 'localStorage'); s.setItem(k, v);", true],
  ['components/X.tsx', "const d = Object.getOwnPropertyDescriptor(window, 'sessionStorage');", true],
  ['components/X.tsx', "const { other } = window; other.setItem('a', b);", false],
];
const before = accesses;
for (const [rel, src, bad] of fixtures) {
  const got = scan(rel, src).length > 0;
  if (got !== bad) self.push(`self-test: ${rel} \`${src.slice(0, 60)}\` should ${bad ? 'fail' : 'pass'}`);
}
accesses = before;

const all = [...self, ...failures];
if (all.length) {
  for (const f of all) console.error('FAIL ' + f);
  console.error(`\n${all.length} personal-key problem(s).`);
  process.exit(1);
}
console.log(`owned-storage key audit: ${files.length} files, ${accesses} raw storage calls, all on the non-personal allowlist`);
