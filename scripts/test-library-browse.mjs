// Search semantics and bounded rendering for the Library's shared list controls.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const dir = resolve('.tmp/library-browse');
mkdirSync(dir, { recursive: true });
const compiled = ts.transpileModule(readFileSync('components/LibraryItems.tsx', 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
writeFileSync(`${dir}/LibraryItems.mjs`, compiled);
const { default: LibraryItems, searchLibraryItems } = await import(pathToFileURL(`${dir}/LibraryItems.mjs`));
const items = [
  { name: 'Space Race', owner: 'Alex' },
  { name: 'Space Quest', owner: 'Sam' },
  { name: 'Garden', owner: 'Alex' },
];
const text = (item) => `${item.name} ${item.owner}`;
assert.deepEqual(searchLibraryItems(items, '  SPACE   alex ', text), [items[0]]);
assert.deepEqual(searchLibraryItems(items, 'alex space', text), [items[0]]);
assert.deepEqual(searchLibraryItems(items, '  ', text), items);
assert.deepEqual(searchLibraryItems(items, 'unknown', text), []);
assert.deepEqual(searchLibraryItems([], 'space', text), []);
assert.equal(items.length, 3);
const render = (rows) => renderToStaticMarkup(h(LibraryItems, {
  items: rows, text: (n) => String(n), children: (n) => h('article', { key: n }, `Item ${n}`),
}));
const many = render(Array.from({ length: 60 }, (_, i) => i));
assert.equal((many.match(/<article>/g) ?? []).length, 24);
assert.match(many, /Show more \(36 remaining\)/);
assert.match(many, /24 of 60/);
assert.doesNotMatch(many, /Item 24</);
assert.doesNotMatch(render([1, 2]), /Show more/);
assert.equal(render([]), '');
console.log('PASS Library search, keyword matching, empty collections, counts, and bounded rendering');
