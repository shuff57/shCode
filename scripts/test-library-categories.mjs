// Private category persistence, assignment, normalization and account isolation on real SQLite.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { categoryName, categoryKey, itemCategory, categoryShelves, categoryOptions, orderedItems, movedBefore, movedTo } from '../lib/library-categories.ts';

const route = compileHandler('api/library/categories.ts', join(root, '.tmp/category-test'));
const db = makeD1();
const A = 'a@school.test';
const B = 'b@school.test';
async function call(email, body, scope = 'mine', role = 'student') {
  const request = new Request(`https://school.test/api/library/categories?scope=${scope}`, {
    method: body === undefined ? 'GET' : 'PUT', ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const response = await route[body === undefined ? 'onRequestGet' : 'onRequestPut']({ request, env: { DB: db }, data: { email, role }, params: {} });
  return { status: response.status, body: await response.json() };
}
assert.deepEqual((await call(A)).body, { categories: [], assignments: [], layout: [], canManage: true });
assert.equal(categoryName('  Space   Project '), 'Space Project');
assert.equal(categoryName('  '), null);
assert.equal(categoryName('x'.repeat(41)), null);
assert.equal(categoryName('bad\nname'), null);
assert.equal(categoryKey('Puzzle'), 'puzzle');
assert.equal((await call(A, { kind: 'texture', name: ' Space   Project ' })).status, 200);
let result = await call(A, { kind: 'texture', item: 'hero', name: 'space project' });
assert.equal(result.status, 200);
assert.deepEqual(result.body.categories, [{ kind: 'texture', name: 'Space Project', key: 'space project', position: 0, hidden: 0, icon: 'folder', color: 'purple' }]);
assert.equal(itemCategory(result.body, 'texture', 'hero'), 'space project');
assert.equal(itemCategory(result.body, 'sound', 'hero'), null);
assert.deepEqual((await call(B)).body, { categories: [], assignments: [], layout: [], canManage: true });
await call(B, { kind: 'texture', item: 'hero', name: 'My private category' });
assert.equal(itemCategory((await call(A)).body, 'texture', 'hero'), 'space project');
for (const kind of ['sound', 'font']) {
  result = await call(A, { kind, item: 'hero', name: 'Favorites' });
  assert.equal(result.status, 200);
  assert.equal(itemCategory(result.body, kind, 'hero'), 'favorites');
}
await call(A, { kind: 'texture', item: 'hero', name: 'Characters' });
assert.equal(itemCategory((await call(A)).body, 'texture', 'hero'), 'characters');
result = await call(A, { kind: 'texture', item: 'hero', name: null });
assert.equal(itemCategory(result.body, 'texture', 'hero'), null);
assert.equal(result.body.categories.filter((c) => c.kind === 'texture').length, 2); // Empty categories are reusable.
assert.equal(itemCategory((await call(B)).body, 'texture', 'hero'), 'my private category');
for (const body of [null, [], { kind: 'other', name: 'Bad' }, { kind: 'font', name: '' }, { kind: 'font', name: 'x'.repeat(41) }, { kind: 'sound', item: '', name: 'Bad' }, { kind: 'sound', name: 'bad\nname' }]) {
  assert.equal((await call(A, body)).status, 400);
}
assert.equal((await call(A, { kind: 'font', name: 'x'.repeat(70000) })).status, 413);
// Only owners can categorize a server game or upload, including shared IDs.
db.sqlite.prepare(`INSERT INTO library_games (id, owner_email, title, code, created_at, updated_at) VALUES ('game-a', ?, 'A game', '', 0, 0)`).run(A);
assert.equal((await call(B, { kind: 'game', item: 'game-a', name: 'Puzzle' })).status, 404);
assert.equal((await call(A, { kind: 'game', item: 'game-a', name: 'Puzzle' })).status, 200);
db.sqlite.prepare(`UPDATE library_games SET title = 'New title', code = 'new code' WHERE id = 'game-a'`).run();
assert.equal(itemCategory((await call(A)).body, 'game', 'game-a'), 'puzzle');
db.sqlite.prepare(`UPDATE library_games SET deleted_at = 1 WHERE id = 'game-a'`).run();
assert.equal((await call(A, { kind: 'game', item: 'game-a', name: 'Puzzle' })).status, 404);
db.sqlite.prepare(`INSERT INTO uploads (id, owner_email, filename, content_type, bytes, created_at) VALUES ('upload-a', ?, 'a.png', 'image/png', 100, 0)`).run(A);
assert.equal((await call(B, { kind: 'upload', item: 'upload-a', name: 'Characters' })).status, 404);
assert.equal((await call(A, { kind: 'upload', item: 'upload-a', name: 'Characters' })).status, 200);
// Bound the category catalog, with duplicates still accepted when full.
for (let i = 0; i < 100; i++) db.sqlite.prepare('INSERT INTO library_categories (owner_email, kind, category_key, name) VALUES (?, ?, ?, ?)').run('full@test', 'font', `c${i}`, `C${i}`);
assert.equal((await call('full@test', { kind: 'font', name: 'Extra' })).status, 409);
assert.equal((await call('full@test', { kind: 'font', item: 'font1', name: 'c0' })).status, 200);
console.log('PASS Library categories: persistence, private ownership, per-kind assignments, reassignment, clearing, validation and limits');

const shelves = categoryShelves({
  categories: [{ kind: 'texture', name: 'Space project', key: 'space project' }, { kind: 'sound', name: 'Music', key: 'music' }],
  assignments: [
    { kind: 'texture', item: 'hero', category: 'space project' },
    { kind: 'sound', item: 'hero', category: 'music' },
    { kind: 'texture', item: 'deleted', category: 'space project' },
  ],
}, 'texture', [{ name: 'hero' }, { name: 'background' }], (item) => item.name);
assert.deepEqual(shelves.shelves.find((s) => s.key === 'space project').items, [{ name: 'hero' }]);
assert.deepEqual(shelves.uncategorized, [{ name: 'background' }]);
assert.equal(shelves.shelves.some((s) => s.key === 'music'), false);
assert.equal(shelves.shelves.find((s) => s.key === 'characters').items.length, 0);
assert.equal(new Set(shelves.shelves.map((s) => s.key)).size, shelves.shelves.length);
console.log('PASS Category shelves: live preview membership, uncategorized items, defaults and type isolation');

// Folder keys stay stable across rename, including an unsaved suggested folder.
await call(A, { kind: 'sound', item: 'beat', name: 'Music' });
await call(A, { op: 'rename-folder', kind: 'sound', key: 'music', name: 'My tracks' });
let saved = (await call(A)).body;
assert.equal(itemCategory(saved, 'sound', 'beat'), 'music');
assert.equal(categoryOptions(saved, 'sound').find((c) => c.key === 'music').name, 'My tracks');
await call(A, { kind: 'sound', item: 'other-beat', name: 'My tracks', category: 'music' });
assert.equal(itemCategory((await call(A)).body, 'sound', 'other-beat'), 'music');
assert.equal((await call(B)).body.categories.some((c) => c.name === 'My tracks'), false);
await call(A, { op: 'delete-folder', kind: 'sound', key: 'music', name: 'My tracks' });
saved = (await call(A)).body;
assert.equal(itemCategory(saved, 'sound', 'beat'), null);
assert.equal(categoryOptions(saved, 'sound').some((c) => c.key === 'music'), false);
assert.deepEqual(categoryShelves(saved, 'sound', ['beat'], (x) => x).uncategorized, ['beat']);
// Rename an unmaterialized default, then create the same display name: no duplicate folder.
await call(A, { op: 'rename-folder', kind: 'texture', key: 'animations', name: 'Motion' });
await call(A, { kind: 'texture', name: 'Motion' });
assert.equal((await call(A)).body.categories.filter((c) => c.kind === 'texture' && c.name === 'Motion').length, 1);
await call(A, { op: 'order-folders', kind: 'font', entries: [{ key: 'display', name: 'Display' }, { key: 'pixel', name: 'Pixel' }, { key: 'handwritten', name: 'Handwritten' }, { key: 'favorites', name: 'Favorites' }] });
assert.deepEqual(categoryOptions((await call(A)).body, 'font').map((c) => c.key), ['display', 'pixel', 'handwritten', 'favorites']);
assert.equal((await call(A, { op: 'order-folders', kind: 'font', entries: [{ key: 'pixel', name: 'Pixel' }, { key: 'pixel', name: 'Pixel' }] })).status, 400);
assert.equal((await call(A, { op: 'nonsense', kind: 'font' })).status, 400);
await call(A, { op: 'order-items', kind: 'texture', entries: [{ key: 'second' }, { key: 'hero' }, { key: 'first' }] });
assert.deepEqual(orderedItems((await call(A)).body, 'texture', ['first', 'second', 'hero'], (x) => x), ['second', 'hero', 'first']);
assert.deepEqual(orderedItems((await call(B)).body, 'texture', ['first', 'second', 'hero'], (x) => x), ['first', 'second', 'hero']);
await call(A, { op: 'label-item', kind: 'texture', item: 'hero', label: 'Captain Star' });
assert.equal((await call(A)).body.layout.find((x) => x.kind === 'texture' && x.item === 'hero').label, 'Captain Star');
assert.equal((await call(B)).body.layout.some((x) => x.label === 'Captain Star'), false);
assert.equal((await call(A, { op: 'hide-item', kind: 'texture', item: 'hero', hidden: true })).status, 400);
// Shared catalog writes are admin-only for every operation; reads are the same for all accounts.
const shared = (body, role = 'admin') => call('owner@test', body, 'builtin', role);
for (const op of ['create', 'assign', 'rename-folder', 'delete-folder', 'order-folders', 'order-items', 'label-item', 'hide-item']) {
  for (const role of ['student', 'teacher']) assert.equal((await shared({ op, kind: 'texture', name: 'Shared', item: 'player' }, role)).status, 403);
}
await shared({ kind: 'texture', name: 'Space pack' });
await shared({ kind: 'texture', name: 'Space pack', item: 'player' });
await shared({ op: 'rename-folder', kind: 'texture', key: 'space pack', name: 'Starter characters' });
await shared({ op: 'order-items', kind: 'texture', entries: [{ key: 'player' }, { key: 'sword' }] });
await shared({ op: 'label-item', kind: 'texture', item: 'player', label: 'Starter hero' });
let studentCatalog = (await call(B, undefined, 'builtin')).body;
assert.equal(studentCatalog.canManage, false);
assert.equal(itemCategory(studentCatalog, 'texture', 'player'), 'space pack');
assert.equal(studentCatalog.categories.find((c) => c.key === 'space pack').name, 'Starter characters');
assert.equal(studentCatalog.layout.find((x) => x.item === 'player').label, 'Starter hero');
assert.equal((await shared(undefined)).body.canManage, true);
assert.equal((await call(B)).body.categories.some((c) => c.key === 'space pack'), false);
await shared({ op: 'hide-item', kind: 'texture', item: 'player', hidden: true });
studentCatalog = (await call(B, undefined, 'builtin')).body;
assert.deepEqual(orderedItems(studentCatalog, 'texture', ['player', 'sword'], (x) => x), ['sword']);
assert.deepEqual(orderedItems(studentCatalog, 'texture', ['player', 'sword'], (x) => x, true), ['player']);
await shared({ op: 'hide-item', kind: 'texture', item: 'player', hidden: false });
assert.deepEqual(orderedItems((await shared(undefined)).body, 'texture', ['sword', 'player'], (x) => x), ['player', 'sword']);
await shared({ kind: 'texture', item: 'player', name: null });
studentCatalog = (await call(B, undefined, 'builtin')).body;
assert.ok(itemCategory(studentCatalog, 'texture', 'player')); // An explicit override wins over built-in defaults.
assert.equal(categoryOptions(studentCatalog, 'texture').some((c) => c.key === itemCategory(studentCatalog, 'texture', 'player')), false);
assert.deepEqual(movedBefore(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
assert.deepEqual(movedBefore(['a', 'b', 'c'], 'a', 'c'), ['b', 'a', 'c']);
assert.deepEqual(movedBefore(['a', 'b'], 'missing', 'a'), ['a', 'b']);
console.log('PASS Library management: rename/delete folders, stable keys, drag ordering, labels, shared admin permissions, removal and restoration');
assert.equal((await call(B, { op: 'order-items', kind: 'upload', entries: [{ key: 'upload-a' }] })).status, 404);
assert.equal((await call(A, { op: 'order-items', kind: 'upload', entries: [{ key: 'upload-a' }] })).status, 200);
assert.equal((await shared({ kind: 'texture', name: '@library:uncategorized' })).status, 400);
console.log('PASS Reordering ownership and reserved metadata protection');

// Dragging forward onto the next card must change its position, unlike insert-before.
assert.deepEqual(movedTo(['a', 'b', 'c'], 'a', 'b'), ['b', 'a', 'c']);
assert.deepEqual(movedTo(['a', 'b', 'c'], 'a', 'c'), ['b', 'c', 'a']);
assert.deepEqual(movedTo(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
assert.deepEqual(movedTo(['a', 'b', 'c'], 'b', 'b'), ['a', 'b', 'c']);
assert.deepEqual(movedTo(['a', 'b'], 'missing', 'a'), ['a', 'b']);
assert.deepEqual(movedTo(['a', 'b'], 'a', 'missing'), ['a', 'b']);
console.log('PASS Drag reorder: adjacent forward, forward to end, backward, same slot, and invalid targets');

// Folder appearance survives every metadata operation and is scoped like names.
result = await call(A, { kind: 'sound', name: 'Space sounds', icon: 'rocket', color: 'cyan' });
assert.equal(result.status, 200);
const appearance = (data, key) => {
  const c = data.categories.find((c) => c.kind === 'sound' && c.key === key);
  return { icon: c.icon, color: c.color };
};
assert.deepEqual(appearance(result.body, 'space sounds'), { icon: 'rocket', color: 'cyan' });
await call(A, { kind: 'sound', item: 'launch', name: 'Space sounds' });
await call(A, { op: 'rename-folder', kind: 'sound', key: 'space sounds', name: 'Launch pad' });
await call(A, { op: 'order-folders', kind: 'sound', entries: [{ key: 'space sounds', name: 'Launch pad' }] });
saved = (await call(A)).body;
assert.deepEqual(appearance(saved, 'space sounds'), { icon: 'rocket', color: 'cyan' });
assert.equal(itemCategory(saved, 'sound', 'launch'), 'space sounds');
await call(A, { op: 'rename-folder', kind: 'sound', key: 'space sounds', name: 'Launch pad', icon: 'star', color: 'pink' });
saved = (await call(A)).body;
assert.deepEqual(appearance(saved, 'space sounds'), { icon: 'star', color: 'pink' });
assert.equal(categoryShelves(saved, 'sound', ['launch'], (x) => x).shelves.find((c) => c.key === 'space sounds').icon, 'star');
await call(B, { kind: 'sound', name: 'Space sounds', icon: 'music', color: 'green' });
assert.deepEqual(appearance((await call(A)).body, 'space sounds'), { icon: 'star', color: 'pink' });
assert.deepEqual(appearance((await call(B)).body, 'space sounds'), { icon: 'music', color: 'green' });
// A suggested folder gets appearance persisted on its first edit, too.
await call(A, { op: 'rename-folder', kind: 'sound', key: 'voices', name: 'Voices', icon: 'heart', color: 'red' });
assert.deepEqual(appearance((await call(A)).body, 'voices'), { icon: 'heart', color: 'red' });
for (const op of ['create', 'rename-folder']) {
  for (const style of [{ icon: 'unknown' }, { color: 'url(evil)' }, { icon: null }, { color: 9 }]) {
    assert.equal((await call(A, { op, kind: 'sound', key: 'space sounds', name: 'Bad appearance', ...style })).status, 400);
  }
}
await shared({ kind: 'sound', name: 'Starter sounds', icon: 'gamepad', color: 'orange' });
assert.deepEqual(appearance((await call(B, undefined, 'builtin')).body, 'starter sounds'), { icon: 'gamepad', color: 'orange' });
assert.equal((await shared({ op: 'rename-folder', kind: 'sound', key: 'starter sounds', name: 'Starter sounds', icon: 'code', color: 'yellow' }, 'student')).status, 403);
assert.deepEqual(categoryOptions({ categories: [], assignments: [] }, 'sound')[0].icon, 'folder');
console.log('PASS Folder appearance: create/edit, persistence through assignment/rename/reorder, defaults, validation, personal isolation and shared admin styling');
