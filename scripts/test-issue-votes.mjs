// Tests for the issue-report anonymiser and ranker.
//
// This is where the privacy guarantee actually lives: publicReport() is what
// keeps a student from ever seeing who filed a report, who triaged it, or
// the raw context_json (which carries a snapshot of the REPORTER's own
// code). The interesting cases are what it must NOT include, not what it
// includes — the surest way to check that is Object.keys(...), not asserting
// individual values are undefined, because a {...row} spread would also
// leave those undefined while still holding the KEY.
//
// Run: node scripts/test-issue-votes.mjs   (also part of `npm test`)

import { publicReport, rankReports, visibleToStudent, tallyVotes } from '../functions/_shared/issue-reports.ts';

let pass = 0;
const fails = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fails.push(name + (detail ? ' — ' + detail : '')); console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

function baseRow(overrides = {}) {
  return {
    id: 1,
    reporter_email: 'student@example.com',
    kind: 'bug',
    title: 'Run button does nothing',
    message: 'I clicked run and nothing happened.',
    status: 'open',
    triaged_by: 'teacher@example.com',
    triaged_at: 1700000000000,
    context_json: JSON.stringify({
      path: '/lesson/2-4-8',
      lessonId: '2-4-8',
      userAgent: 'Mozilla/5.0',
      code: 'let x = 1;',
      email: 'student@example.com',
    }),
    screenshot_id: null,
    screenshot_shared: 0,
    withdrawn_at: null,
    created_at: 1700000000000,
    ...overrides,
  };
}

const zeroTally = { up: 0, down: 0, myVote: 0 };
const OTHER_VIEWER = 'someone-else@example.com';

console.log('\n=== publicReport() drops everything that identifies anyone ===');
{
  const pub = publicReport(baseRow(), zeroTally, OTHER_VIEWER);
  const keys = Object.keys(pub);
  ok('no reporter_email key at all', !keys.includes('reporter_email'), keys.join(','));
  ok('no triaged_by key at all', !keys.includes('triaged_by'));
  ok('no triaged_at key at all', !keys.includes('triaged_at'));
  ok('no raw context_json key at all', !keys.includes('context_json'));
}

console.log('\n=== a {...row} spread would have leaked this — this case catches it ===');
{
  // A naive `{...row, up, down, score, myVote}` implementation keeps every
  // original column, reporter_email included, as an enumerable key even
  // though nobody deletes its value. Object.keys is what catches that; a
  // `.reporter_email === undefined` assertion would NOT, since the value
  // really is the reporter's real email here, not undefined.
  const pub = publicReport(baseRow({ reporter_email: 'nottelling@example.com' }), zeroTally, OTHER_VIEWER);
  ok(
    'reporter_email is absent, not just falsy',
    !('reporter_email' in pub),
    JSON.stringify(pub),
  );
}

console.log('\n=== context is narrowed to path + lessonId only ===');
{
  const pub = publicReport(baseRow(), zeroTally, OTHER_VIEWER);
  ok('context keeps path', pub.context?.path === '/lesson/2-4-8');
  ok('context keeps lessonId', pub.context?.lessonId === '2-4-8');
  ok('context has exactly path + lessonId', Object.keys(pub.context ?? {}).sort().join(',') === 'lessonId,path');
  ok('userAgent is gone', !('userAgent' in (pub.context ?? {})));
  ok('code snapshot is gone', !('code' in (pub.context ?? {})));
  ok('an email hidden inside context is gone too', !('email' in (pub.context ?? {})));
}

console.log('\n=== context_json edge cases never throw ===');
{
  let threw = false;
  let pub;
  try {
    pub = publicReport(baseRow({ context_json: null }), zeroTally, OTHER_VIEWER);
  } catch {
    threw = true;
  }
  ok('null context_json does not throw', !threw);
  ok('null context_json yields null context', pub?.context === null);
}
{
  let threw = false;
  let pub;
  try {
    pub = publicReport(baseRow({ context_json: '{not valid json' }), zeroTally, OTHER_VIEWER);
  } catch {
    threw = true;
  }
  ok('malformed context_json does not throw', !threw);
  ok('malformed context_json yields null context', pub?.context === null);
}
{
  let threw = false;
  let pub;
  try {
    pub = publicReport(baseRow({ context_json: '"just a string"' }), zeroTally, OTHER_VIEWER);
  } catch {
    threw = true;
  }
  ok('a non-object context_json (e.g. a JSON string) does not throw', !threw);
  ok('a non-object context_json yields null context', pub?.context === null);
}

console.log('\n=== title: null survives ===');
{
  const pub = publicReport(baseRow({ title: null }), zeroTally, OTHER_VIEWER);
  ok('title null passes through as null, not dropped or stringified', pub.title === null);
}

console.log('\n=== score is up - down ===');
{
  ok('5 up, 2 down -> score 3', publicReport(baseRow(), { up: 5, down: 2, myVote: 0 }, OTHER_VIEWER).score === 3);
  ok('0 up, 0 down -> score 0', publicReport(baseRow(), { up: 0, down: 0, myVote: 0 }, OTHER_VIEWER).score === 0);
  ok('0 up, 4 down -> score -4 (negative)', publicReport(baseRow(), { up: 0, down: 4, myVote: -1 }, OTHER_VIEWER).score === -4);
  ok('up/down pass through unchanged', (() => {
    const p = publicReport(baseRow(), { up: 5, down: 2, myVote: 1 }, OTHER_VIEWER);
    return p.up === 5 && p.down === 2 && p.myVote === 1;
  })());
}

console.log('\n=== screenshot_id is staff opt-in (the anonymiser\'s one hole) ===');
{
  const withShot = baseRow({ screenshot_id: '8afe441b7e1894ce412bf2b1ce7948ca' });
  const notShared = publicReport(withShot, zeroTally, OTHER_VIEWER);
  ok('screenshot_id is null when screenshot_shared is 0', notShared.screenshot_id === null, JSON.stringify(notShared));

  const shared = publicReport({ ...withShot, screenshot_shared: 1 }, zeroTally, OTHER_VIEWER);
  ok('screenshot_id is present when screenshot_shared is 1', shared.screenshot_id === '8afe441b7e1894ce412bf2b1ce7948ca');

  const noShotButShared = publicReport(baseRow({ screenshot_shared: 1 }), zeroTally, OTHER_VIEWER);
  ok('no screenshot to begin with stays null even if shared is 1', noShotButShared.screenshot_id === null);
}

console.log('\n=== mine is the viewer comparing themselves, never reporter_email ===');
{
  const row = baseRow({ reporter_email: 'reporter@example.com' });
  const own = publicReport(row, zeroTally, 'reporter@example.com');
  const other = publicReport(row, zeroTally, 'somebody-else@example.com');
  ok('mine is true for the reporter\'s own viewerEmail', own.mine === true);
  ok('mine is false for a different viewerEmail', other.mine === false);
  ok('reporter_email is still absent from the "mine" object', !('reporter_email' in own), JSON.stringify(own));
  ok('reporter_email is still absent from the "not mine" object', !('reporter_email' in other), JSON.stringify(other));
}

console.log('\n=== visibleToStudent: a withdrawn row hides from a peer, stays for its author ===');
{
  const row = baseRow({ reporter_email: 'reporter@example.com', withdrawn_at: 1700000001000 });
  ok('hidden from a peer', visibleToStudent(row, 'somebody-else@example.com') === false);
  ok('still visible to its own author', visibleToStudent(row, 'reporter@example.com') === true);
  const notWithdrawn = baseRow({ reporter_email: 'reporter@example.com', withdrawn_at: null });
  ok('a non-withdrawn row is visible to anyone', visibleToStudent(notWithdrawn, 'somebody-else@example.com') === true);
}

console.log('\n=== tallyVotes attributes myVote to the viewer, not another voter ===');
{
  // Written so that swapping `v.voter_email === viewerEmail` for something
  // that ignores identity (e.g. always true, or matching the wrong side)
  // fails this: two different voters on the same report must produce two
  // different myVote values depending on who's asking.
  const votes = [
    { report_id: 1, voter_email: 'me@example.com', vote: 1 },
    { report_id: 1, voter_email: 'them@example.com', vote: -1 },
  ];
  const asMe = tallyVotes(votes, 'me@example.com').get(1);
  const asThem = tallyVotes(votes, 'them@example.com').get(1);
  const asStranger = tallyVotes(votes, 'stranger@example.com').get(1);
  ok('viewer "me" sees their own upvote as myVote', asMe.myVote === 1, JSON.stringify(asMe));
  ok('viewer "them" sees their own downvote as myVote, not "me"\'s', asThem.myVote === -1, JSON.stringify(asThem));
  ok('a third party who never voted sees myVote 0', asStranger.myVote === 0, JSON.stringify(asStranger));
  ok('up/down counts are the same regardless of who is asking', asMe.up === 1 && asMe.down === 1 && asThem.up === 1 && asThem.down === 1);
  ok('a report with no votes at all has no entry', tallyVotes(votes, 'me@example.com').get(999) === undefined);
}

console.log('\n=== rankReports: worst first, ties broken by newest ===');
{
  const rows = [
    { id: 1, score: 1, created_at: 100 },
    { id: 2, score: 5, created_at: 50 },
    { id: 3, score: 1, created_at: 200 },
  ];
  const ranked = rankReports(rows);
  ok('score 5 sorts above score 1', ranked[0].id === 2, ranked.map((r) => r.id).join(','));
  ok('a tie (both score 1) breaks toward the newer created_at', ranked[1].id === 3 && ranked[2].id === 1,
    ranked.map((r) => r.id).join(','));
}
{
  const rows = [
    { id: 1, score: 0, created_at: 100 },
    { id: 2, score: -3, created_at: 200 },
    { id: 3, score: 2, created_at: 50 },
  ];
  const ranked = rankReports(rows);
  ok('negative scores sort last', ranked.map((r) => r.id).join(',') === '3,1,2', ranked.map((r) => r.id).join(','));
}
{
  // Three elements, already out of order: a broken in-place `rows.sort()`
  // would still pass a one-element array (nothing to reorder), which is what
  // was here before. This one actually needs the "return a new array" part
  // of the contract, not just the ordering.
  const rows = [
    { id: 1, score: 1, created_at: 100 },
    { id: 2, score: 5, created_at: 50 },
    { id: 3, score: -2, created_at: 200 },
  ];
  const original = rows.map((r) => r.id);
  rankReports(rows);
  ok(
    'rankReports does not mutate its input',
    rows.map((r) => r.id).join(',') === original.join(','),
    rows.map((r) => r.id).join(','),
  );
}

console.log('\n=== publicContext: path must be same-site ===');
{
  // The three backslash forms are the ones that broke the first attempt at
  // this filter. It tested the string -- `startsWith('/') && !startsWith('//')`
  // -- and a browser normalises a backslash to a forward slash while resolving,
  // so `/\evil.example` passed the test and loaded https://evil.example. Built
  // with fromCharCode so no editor, shell or heredoc between here and the file
  // can quietly eat the backslash and turn these into same-site paths that
  // pass for the wrong reason.
  const B = String.fromCharCode(92);
  const off = [
    'https://evil.example/x',
    '//evil.example/x',
    'javascript:alert(1)',
    'data:text/html,x',
    `/${B}evil.example`,
    `/${B}/evil.example`,
    `/${B}${B}evil.example`,
  ];
  for (const bad of off) {
    const pub = publicReport(
      baseRow({ context_json: JSON.stringify({ path: bad, lessonId: '2-4-8' }) }),
      zeroTally,
      OTHER_VIEWER,
    );
    ok(`path is dropped for ${bad}`, !pub.context || !('path' in pub.context), JSON.stringify(pub.context));
    ok(`lessonId survives even when path is dropped (${bad})`, pub.context?.lessonId === '2-4-8');
  }

  const good = publicReport(
    baseRow({ context_json: JSON.stringify({ path: '/lesson/1-3-2-reading-camelcase/' }) }),
    zeroTally,
    OTHER_VIEWER,
  );
  ok('a real same-site path is kept', good.context?.path === '/lesson/1-3-2-reading-camelcase/');

  const goodWithQueryAndHash = publicReport(
    baseRow({ context_json: JSON.stringify({ path: '/legit?q=1#f' }) }),
    zeroTally,
    OTHER_VIEWER,
  );
  ok(
    'query string and hash survive on a same-site path',
    goodWithQueryAndHash.context?.path === '/legit?q=1#f',
    JSON.stringify(goodWithQueryAndHash.context),
  );
}

console.log('');
if (fails.length) {
  console.log(`FAIL — ${fails.length} of ${pass + fails.length} checks failed`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log(`ALL PASS — ${pass} checks`);
