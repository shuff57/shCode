// Render the actual dnd-kit integration: whole-card keyboard access, permissions,
// and React-owned cards (no competing native HTML draggable behavior).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const dir = resolve('.tmp/library-dnd');
mkdirSync(dir, { recursive: true });
const result = spawnSync(process.execPath, [
  'node_modules/typescript/bin/tsc', 'components/LibraryDragDrop.tsx', '--outDir', dir,
  '--module', 'commonjs', '--target', 'es2022', '--jsx', 'react-jsx', '--moduleResolution', 'node',
  '--esModuleInterop', '--skipLibCheck', '--strict',
], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stdout + result.stderr);
writeFileSync(`${dir}/package.json`, '{"type":"commonjs"}');
const require = createRequire(import.meta.url);
const { LibraryDragDrop, LibrarySortable, LibraryFolderDrop } = require(`${dir}/LibraryDragDrop.js`);
function render(enabled, editing = false) {
  return renderToStaticMarkup(h(LibraryDragDrop, {
    enabled, folders: ['a', 'b'], items: [], onSort: () => {}, onMove: () => {},
    children: [
      ...['a', 'b'].map((key) => h(LibrarySortable, { key, type: 'folder', itemKey: key, label: key, disabled: editing && key === 'a',
        children: h('article', { 'aria-label': `Folder ${key}` }, h('button', { type: 'button', 'data-library-drag-surface': true }, `Open ${key}`), h('button', { type: 'button' }, 'Rename')),
      })),
      h(LibraryFolderDrop, { key: 'target', folderKey: 'a', label: 'Move to A' }),
    ],
  }));
}
const editable = render(true);
assert.match(editable, /aria-label="Reorder folder a"/);
assert.match(editable, /aria-roledescription="sortable"/);
assert.match(editable, /data-library-sortable="folder"/);
assert.match(editable, /Open a/);
assert.match(editable, /data-library-drag-surface/);
assert.match(editable, /tabindex="0"/);
assert.match(editable, /Rename/);
assert.doesNotMatch(editable, /shcode-library-dragHandle/);
assert.match(editable, /Move to A/);
assert.doesNotMatch(editable, /draggable="true"/);
assert.doesNotMatch(render(false), /aria-label="Reorder folder/);
assert.doesNotMatch(render(true, true), /aria-label="Reorder folder a"/);
assert.match(render(true, true), /aria-label="Reorder folder b"/);
console.log('PASS Library dnd-kit: whole-card drag surfaces, keyboard access, read-only permissions, and no native-drag conflict');
