// The /docs hub search (lib/docs-hub-search.ts): one query across every reference set, each
// result linking to the page that already explains it.
import assert from 'node:assert/strict';
import { searchAllDocs, docPageHref } from '../lib/docs-hub-search.ts';
import { sections as js } from '../lib/js-docs.ts';
import { sections as moshion } from '../lib/moshion-docs.ts';
import { sections as reshape } from '../lib/reshape-docs.ts';

const sets = [
  { id: 'js', label: 'JavaScript', basePath: '/docs/js', sections: js },
  { id: 'moshion', label: 'moSHion', basePath: '/docs/moshion', sections: moshion },
  { id: 'reshape', label: 'reSHape', basePath: '/docs/reshape', sections: reshape },
];

assert.equal(docPageHref('/docs/js', 'arrays', 0), '/docs/js/arrays');
assert.equal(docPageHref('/docs/js', 'arrays', 2), '/docs/js/arrays?page=3');

assert.deepEqual(searchAllDocs(sets, ''), [], 'an empty box finds nothing');
assert.deepEqual(searchAllDocs(sets, '   '), []);
assert.deepEqual(searchAllDocs(sets, 'zzqxnotaword'), [], 'a nonsense word finds nothing');

const arr = searchAllDocs(sets, 'array');
assert.ok(arr.length > 0);
assert.ok(arr.some((r) => r.setId === 'js' && r.href.startsWith('/docs/js/arrays')), 'finds the JS arrays pages');
assert.ok(arr[0].pageTitle.toLowerCase().includes('array') || !arr.some((r) => r.pageTitle.toLowerCase().includes('array')),
  'a page whose title holds the word comes first');

// Ranking: title hits, then the topic named for the word, then the rest.
const rankOf = (r) => (r.pageTitle.toLowerCase().includes('array') ? 0 : r.sectionTitle.toLowerCase().includes('array') ? 1 : 2);
for (let i = 1; i < arr.length; i++) assert.ok(rankOf(arr[i - 1]) <= rankOf(arr[i]), 'results are ranked');
assert.ok(arr.findIndex((r) => r.pageTitle === 'Making a list') < arr.findIndex((r) => rankOf(r) === 2), 'the Arrays topic beats a passing mention');

const sprite = searchAllDocs(sets, 'sprite');
assert.ok(sprite.some((r) => r.setId === 'moshion'), 'finds moSHion pages');
const sets2 = new Set(searchAllDocs(sets, 'box', 50).map((r) => r.setId));
assert.ok(sets2.has('reshape'), 'finds reSHape pages');

assert.ok(searchAllDocs(sets, 'the', 7).length <= 7, 'respects the limit');

// Every href is a real page of its set.
for (const r of searchAllDocs(sets, 'a', 200)) {
  const set = sets.find((s) => s.id === r.setId);
  const section = set.sections.find((s) => s.slug === r.sectionSlug);
  assert.ok(section, `${r.href} names a real section`);
  assert.ok(r.pageIndex >= 0 && r.pageIndex < section.pages.length, `${r.href} names a real page`);
  assert.equal(r.href, docPageHref(set.basePath, r.sectionSlug, r.pageIndex));
}
console.log('test-docs-hub-search: all checks passed');
