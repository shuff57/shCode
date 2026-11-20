#!/usr/bin/env node
// POST /api/p5play-convert through the real handler, on a real SQLite with every migration applied, and a
// stubbed OpenRouter (globalThis.fetch), so no model credits are spent. What has to hold:
//   1. no key = 503 offline, nothing counted; no session = 401; empty, too long and personal details = 400
//      before anything is sent;
//   2. the request to OpenRouter carries the model (default DeepSeek V4.1, env override), the moSHion API
//      file in the system prompt, data_collection 'deny', and NOTHING that names the student;
//   3. the answer's fenced program and NOTES bullets come back; a cut-off answer (finish_reason length) and an
//      answer with no program are errors, never a half program;
//   4. the per-person daily cap (teachers exempt) and the deploy-wide cap refuse before the model is called;
//   5. parseConvertAnswer reads the shapes a model writes.

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 500)}` : ''}`); }
}

const out = join(root, '.tmp', 'p5play-convert-test');
const route = compileHandler('api/p5play-convert.ts', out);
const core = createRequire(import.meta.url)(join(out, 'lib', 'p5play-convert-core.js'));
const apiDocs = readFileSync(join(root, 'public', 'moshion', 'docs', 'moshion.d.ts'), 'utf8');

const ASSETS = {
  async fetch(url) {
    return new URL(url).pathname === '/moshion/docs/moshion.d.ts'
      ? new Response(apiDocs, { status: 200 })
      : new Response('not found', { status: 404 });
  },
};

const P5 = `let player;
function setup() {
  createCanvas(400, 400);
  world.gravity.y = 10;
  player = new Sprite(200, 100, 30);
}
function draw() {
  background(220);
  if (kb.pressing('left')) player.vel.x = -3;
  text('score', 10, 20);
}`;
const MOSHION = `let player;
function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;
  player = new Sprite(200, 100, 30);
}
function update() {
  if (kb.pressing('left')) player.vel.x = -3;
}
function draw() {
  background(220);
}
function drawTop() {
  text('score', 10, 20); // CONVERTED: text moved to drawTop so it shows over the sprites
}`;

let sent = [];
let reply = () => ({ choices: [{ message: { content: '```js\n' + MOSHION + '\n```\nNOTES:\n- createCanvas became new Canvas.\n- The score text moved to drawTop.' }, finish_reason: 'stop' }] });
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), init, body: JSON.parse(init.body) });
  const r = reply();
  return r instanceof Response ? r : new Response(JSON.stringify(r), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const db = makeD1();
const baseEnv = { DB: db, ASSETS, OPENROUTER_API_KEY: 'sk-test-key' };
async function call(body, { email = 'ana@s.test', role = 'student', env = {} } = {}) {
  const request = new Request('https://shcode.example/api/p5play-convert', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const res = await route.onRequestPost({ request, env: { ...baseEnv, ...env }, params: {}, data: email ? { email, role } : undefined });
  return { status: res.status, body: await res.json() };
}
const count = (who, bucket) => db.sqlite.prepare('SELECT count FROM ai_help_usage WHERE student_email = ? AND unit = ?').get(who, bucket)?.count ?? 0;

// 1. refusals before anything is sent
{
  sent = [];
  const r = await call({ code: P5 }, { env: { OPENROUTER_API_KEY: '' } });
  check('no key: 503 offline', r.status === 503 && r.body.offline === true, r);
  check('no key: nothing sent, nothing counted', sent.length === 0 && count('ana@s.test', 'p5play-convert') === 0);
  const anon = await call({ code: P5 }, { email: null });
  check('no session: 401', anon.status === 401, anon);
  const empty = await call({ code: '   ' });
  check('empty paste: 400 in plain words', empty.status === 400 && /Paste/.test(empty.body.error), empty);
  const long = await call({ code: 'x'.repeat(core.MAX_CONVERT_INPUT + 1) });
  check('too long: 400', long.status === 400 && /too long/.test(long.body.error), long);
  const pii = await call({ code: P5 + '\n// email me at ana.lopez@gmail.com' });
  check('personal details: 400, says why', pii.status === 400 && /outside shCode/.test(pii.body.error), pii);
  check('refusals sent nothing to the model', sent.length === 0);
}

// 2 + 3. the request and the answer
{
  sent = [];
  const r = await call({ code: P5 });
  check('converts: 200 with the program', r.status === 200 && r.body.code.includes('new Canvas(400, 400)') && r.body.code.endsWith('\n'), r);
  check('converts: the notes come back', r.body.notes?.length === 2 && /drawTop/.test(r.body.notes[1]), r.body.notes);
  check('converts: remaining counts down', r.body.remaining === core.DEFAULT_CONVERT_DAILY_LIMIT - 1, r.body);
  const req = sent[0];
  check('goes to OpenRouter with the key', req?.url === 'https://openrouter.ai/api/v1/chat/completions' && req.init.headers.Authorization === 'Bearer sk-test-key');
  check('default model is DeepSeek V4.1', req.body.model === 'deepseek/deepseek-v4.1-flash', req.body.model);
  check('asks for providers that keep no data', req.body.provider?.data_collection === 'deny');
  check('system prompt carries the moSHion API file', req.body.messages[0].content.includes(apiDocs.slice(0, 2000)));
  check('the user message carries the paste', req.body.messages[1].content.includes(P5));
  check('nothing names the student', !init_has(req, 'ana@s.test') && !init_has(req, 'ana'), 'email or name in the request');
  check('the key never reaches the page', !JSON.stringify(r.body).includes('sk-test-key'));

  const over = await call({ code: P5 }, { env: { P5PLAY_CONVERT_MODEL: 'deepseek/deepseek-v4-pro' } });
  check('P5PLAY_CONVERT_MODEL overrides the model', sent.at(-1).body.model === 'deepseek/deepseek-v4-pro' && over.body.model === 'deepseek/deepseek-v4-pro');

  reply = () => ({ choices: [{ message: { content: '```js\nfunction setup() {\n  new Canvas(' }, finish_reason: 'length' }] });
  const cut = await call({ code: P5 });
  check('cut-off answer: an error, no half program', cut.status === 502 && !cut.body.code && /cut off/.test(cut.body.error), cut);
  {
    // A cut-off answer is retried ONCE with double the budget (the hidden thinking counts against it).
    db.sqlite.prepare('DELETE FROM ai_help_usage').run();
    let k = 0;
    sent = [];
    reply = () => (k++ === 0
      ? { choices: [{ message: { content: '```js\nfunction setup() {\n  new Canvas(' }, finish_reason: 'length' }] }
      : { choices: [{ message: { content: '```js\n' + MOSHION + '\n```\nNOTES:\n- ok' }, finish_reason: 'stop' }] });
    const retried = await call({ code: P5 }, { email: 'rex@s.test' });
    check('cut off once: retried with double the budget, then converts', retried.status === 200 && sent.length === 2
      && sent[1].body.max_tokens === 2 * sent[0].body.max_tokens, { status: retried.status, n: sent.length, b: sent.map((x) => x.body.max_tokens) });
    check('cut off once: counted as ONE conversion', count('rex@s.test', 'p5play-convert') === 1, count('rex@s.test', 'p5play-convert'));
    sent = [];
    reply = () => ({ choices: [{ message: { content: '```js\nfunction setup() {\n  new Canvas(' }, finish_reason: 'length' }] });
    const twice = await call({ code: P5 }, { email: 'rex@s.test' });
    check('cut off twice: the error, after exactly two requests', twice.status === 502 && /cut off/.test(twice.body.error) && sent.length === 2, { s: twice.status, n: sent.length });
    check('retryBudget: double, capped, none at the ceiling', core.retryBudget(6000) === 12000 && core.retryBudget(10000) === 16000 && core.retryBudget(16000) === null);
  }

  reply = () => ({ choices: [{ message: { content: 'Sorry, I cannot help with that.' }, finish_reason: 'stop' }] });
  const none = await call({ code: P5 });
  check('no program in the answer: an error', none.status === 502 && !none.body.code, none);

  reply = () => ({ choices: [{ message: { content: null }, finish_reason: 'stop' }] });
  const nul = await call({ code: P5 });
  check('null content: an error', nul.status === 502, nul);

  check('max_tokens is sized to the program, not 32000', req.body.max_tokens === core.maxTokensFor(P5) && req.body.max_tokens <= 6000, req.body.max_tokens);
  check('maxTokensFor: floor 6000, ceiling 16000, grows with the paste',
    core.maxTokensFor('') === 6000 && core.maxTokensFor('x'.repeat(core.MAX_CONVERT_INPUT)) === 16000
    && core.maxTokensFor('x'.repeat(7000)) === 8000);

  reply = () => new Response('{"error":{"message":"requires more credits"}}', { status: 402 });
  const broke = await call({ code: P5 });
  check('upstream 402: "needs more credit, tell your teacher"', broke.status === 502 && /credit/.test(broke.body.error) && /teacher/.test(broke.body.error), broke);

  reply = () => new Response('{"error":{"message":"rate limited"}}', { status: 429 });
  const busy = await call({ code: P5 });
  check('upstream 429: "busy", the raw error is not shown', busy.status === 502 && /busy/.test(busy.body.error) && !/rate limited/.test(busy.body.error), busy);
  reply = () => ({ choices: [{ message: { content: '```js\n' + MOSHION + '\n```' }, finish_reason: 'stop' }] });
}

function init_has(req, s) {
  const text = JSON.stringify({ headers: req.init.headers, body: req.body }).toLowerCase();
  // The paste itself is the student's program, so only look outside the user message's code.
  const withoutPaste = text.replace(JSON.stringify(req.body.messages[1].content).toLowerCase().slice(1, -1), '');
  return new RegExp(`\\b${s}\\b`).test(withoutPaste);
}

// 3b. a program that still calls p5-only functions gets one repair round
{
  const LEFT = 'let s;\nfunction setup() {\n  createCanvas(400, 400);\n  s = new Sprite(1, 2);\n}\nfunction draw() {\n  drawSprites();\n}';
  const FIXED = 'let s;\nfunction setup() {\n  new Canvas(400, 400);\n  s = new Sprite(1, 2);\n}\nfunction draw() {\n  // CONVERTED: drawSprites() deleted\n}';
  let n = 0;
  reply = () => ({ choices: [{ message: { content: '```js\n' + (n++ === 0 ? LEFT : FIXED) + '\n```\nNOTES:\n- fixed' }, finish_reason: 'stop' }] });
  sent = [];
  const before = count('dee@s.test', 'p5play-convert');
  const r = await call({ code: P5 }, { email: 'dee@s.test' });
  check('repair: a second request is made', sent.length === 2, sent.length);
  const second = sent[1]?.body.messages ?? [];
  check('repair: it carries the first answer and names the leftovers', second.length === 4 && second[2].role === 'assistant'
    && /createCanvas, drawSprites/.test(second[3].content), second.map((m) => m.role));
  check('repair: the fixed program is returned, no warnings', r.status === 200 && core.leftoverP5Calls(r.body.code).length === 0 && r.body.code.includes('new Canvas(400, 400)') && r.body.warnings.length === 0, r.body);
  check('repair: counted as ONE conversion', count('dee@s.test', 'p5play-convert') === before + 1);

  reply = () => ({ choices: [{ message: { content: '```js\n' + LEFT + '\n```' }, finish_reason: 'stop' }] });
  sent = [];
  const stuck = await call({ code: P5 }, { email: 'dee@s.test' });
  check('repair fails: still answers, with a plain warning naming the calls', stuck.status === 200 && sent.length === 2
    && /createCanvas, drawSprites/.test(stuck.body.warnings[0] ?? '') && /is not defined/.test(stuck.body.warnings[0] ?? ''), stuck.body);

  n = 0;
  reply = () => (n++ === 0
    ? { choices: [{ message: { content: '```js\n' + LEFT + '\n```' }, finish_reason: 'stop' }] }
    : new Response('{}', { status: 500 }));
  const err2 = await call({ code: P5 }, { email: 'dee@s.test' });
  check('repair errors: the first answer stands, with the warning', err2.status === 200 && err2.body.code.includes('createCanvas') && err2.body.warnings.length === 1, err2.body);

  sent = [];
  reply = () => ({ choices: [{ message: { content: '```js\n' + MOSHION + '\n```' }, finish_reason: 'stop' }] });
  await call({ code: P5 }, { email: 'dee@s.test' });
  check('a clean answer makes ONE request', sent.length === 1, sent.length);

  const L = core.leftoverP5Calls;
  check('leftovers: calls found', L(LEFT).join() === 'createCanvas,drawSprites', L(LEFT));
  check('leftovers: moSHion\'s own preload() and loadImage() are allowed',
    L('let img;\nfunction preload() { img = loadImage("a.png"); }\nfunction setup() { new Canvas(1, 1); }').length === 0);
  // The banned list must never name something the engine has: read the typings the model is given.
  const declared = new Set([...apiDocs.matchAll(/declare\s+(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
  const clash = core.NOT_IN_MOSHION.filter((n) => declared.has(n));
  check('no banned name is declared in moshion.d.ts', clash.length === 0, clash);
  check('leftovers: comments, strings and methods ignored', L('// drawSprites(x)\n/* push() */\ntext("image(a)");\narr.push(1); s.scale = 2; o.rotate(1);').length === 0);
  check('leftovers: moSHion\'s own createVector and loadJSON are allowed', L('let v = createVector(1, 2); loadJSON("a.json");').length === 0);
  check('leftovers: p5.Vector found', L('let v = p5.Vector.random2D();').includes('p5.'));

  // p5play v3: event functions moSHion never calls, members it lacks, globals it lacks.
  const V3 = 'function keyPressed() { jump(); }\nwindow.x = 1;\nmousePressed = () => {};\nplayer.addAnis({ run: { row: 0, frames: 8 } });\n'
    + 'player.mirror.x = true; camera.zoom = 2; enemies.removeAll(); let fast = new enemies.Group();\n'
    + 'if (contro.presses("a")) go(); player.img = "a.png"; player.moveTo(1, 2, 3); world.step(); world.timeScale = 0.5;\n'
    + 'let a = loadAni("run.png", 8); triangle(0, 0, 1, 1, 2, 0); new RopeJoint(a, b); keyIsDown(LEFT_ARROW);';
  const v3 = L(V3);
  const want = ['keyPressed()', 'mousePressed()', 'addAnis()', 'mirror', 'camera.zoom', 'removeAll()', 'new group.Group()', 'contro',
    '.img', 'moveTo()', 'world.step()', 'world.timeScale', 'loadAni', 'triangle', 'RopeJoint', 'keyIsDown'];
  check('leftovers: p5play v3 gaps all found', want.every((w) => v3.includes(w)), { missing: want.filter((w) => !v3.includes(w)), got: v3 });
  check('leftovers: what moSHion has is NOT flagged (sprite.mouse, changeAni, addAni, overlaps cb, joints, texture)',
    L('if (player.mouse.hovering()) x(); player.addAni("run", "run.png", 8); player.changeAni("run"); player.ani.frameDelay = 4;\n'
      + 'player.overlaps(coins, collect); new WheelJoint(car, wheel); new GlueJoint(a, b); s.texture = "coin"; camera.x = player.x;\n'
      + 'enemies.amount = 3; enemies.cull(50); s.scale.x = -1; s.moveTowards(mouse, 0.1); world.autoStep = false; world.physicsUpdate();').length === 0);
  check('leftovers: an event name in a comment or string, or as a method, is ignored',
    L('// keyPressed() is now in update()\nconst tip = "function mousePressed() {}";\nbtn.mousePressed(go);').length === 0);
  // None of the names the check bans may exist in the engine's typings.
  const declaredMembers = (n) => new RegExp(`^\\s+(?:get |set |readonly )?${n}\\??\\s*[(:]`, 'm').test(apiDocs);
  const memberClash = ['addAnis', 'mirror', 'zoom', 'timeScale', 'removeAll', 'moveTo', 'addCollider', 'img', 'anis']
    .filter(declaredMembers);
  check('no flagged p5play member is declared in moshion.d.ts', memberClash.length === 0, memberClash);
  const eventClash = core.P5_EVENT_FUNCTIONS.filter((n) => declared.has(n));
  check('no p5 event function is one moSHion calls (declared in moshion.d.ts)', eventClash.length === 0, eventClash);
}

// 4. caps
{
  const limit = 3;
  const env = { P5PLAY_CONVERT_DAILY_LIMIT: String(limit) };
  db.sqlite.prepare('DELETE FROM ai_help_usage').run();
  for (let i = 0; i < limit; i++) await call({ code: P5 }, { email: 'ben@s.test', env });
  sent = [];
  const capped = await call({ code: P5 }, { email: 'ben@s.test', env });
  check('personal cap: 429 with the number, model not called', capped.status === 429 && capped.body.remaining === 0 && new RegExp(String(limit)).test(capped.body.error) && sent.length === 0, capped);
  const teacher = await call({ code: P5 }, { email: 'tia@s.test', role: 'teacher', env: { P5PLAY_CONVERT_DAILY_LIMIT: '0' } });
  check('teachers are exempt from the personal cap', teacher.status === 200 && teacher.body.remaining === null, teacher);
  const g = await call({ code: P5 }, { email: 'cat@s.test', env: { P5PLAY_CONVERT_GLOBAL_DAILY_LIMIT: '2' } });
  check('deploy-wide cap: 429 for everyone', g.status === 429 && /whole site/.test(g.body.error), g);
  const gt = await call({ code: P5 }, { email: 'tia@s.test', role: 'teacher', env: { P5PLAY_CONVERT_GLOBAL_DAILY_LIMIT: '2' } });
  check('deploy-wide cap binds teachers too', gt.status === 429, gt);
}

// 5. parsing
{
  const p = core.parseConvertAnswer;
  check('parse: fence + NOTES', p('```js\nfunction setup(){}\n```\nNOTES:\n- one\n- two')?.notes.length === 2);
  check('parse: javascript fence, CRLF', p('```javascript\r\nfunction setup(){}\r\n```\r\nNOTES:\r\n* a')?.code === 'function setup(){}\n');
  check('parse: longest fence wins', p('```js\nx\n```\n```js\nfunction setup(){ long(); }\n```')?.code.includes('long'));
  check('parse: bare program with setup accepted', p('function setup() {\n new Canvas(1,1);\n}\nNOTES:\n- x')?.code.includes('new Canvas'));
  check('parse: prose alone is no program', p('I cannot do that.') === null);
  check('parse: bold **NOTES:** and numbered notes', p('```js\nfunction setup(){}\n```\n**NOTES:**\n1. first\n2) second')?.notes.join('|') === 'first|second');
  check('parse: at most 8 notes', p('```js\nfunction setup(){}\n```\nNOTES:\n' + '- n\n'.repeat(12))?.notes.length === 8);
  check('looksLikeMoshionAlready', core.looksLikeMoshionAlready(MOSHION) && !core.looksLikeMoshionAlready(P5));
  check('looksLikeMoshionAlready: a p5play v3 sketch (new Canvas, all in draw()) is NOT moSHion',
    !core.looksLikeMoshionAlready('function setup() {\n  new Canvas(400, 400);\n  player = new Sprite();\n}\nfunction draw() {\n  background(220);\n  if (kb.pressing("left")) player.vel.x = -3;\n}'));
  check('looksLikeMoshionAlready: update() but a p5 event function left is NOT moSHion',
    !core.looksLikeMoshionAlready('function setup() { new Canvas(400, 400); }\nfunction update() {}\nfunction keyPressed() {}'));
  check('the prompt is about p5play v3 and names the event-function trap',
    /p5play v3/.test(core.CONVERT_RULES) && /NEVER called/.test(core.CONVERT_RULES) && /sprite\.mouse/.test(core.CONVERT_RULES) && !/There is no sprite\.mouse/.test(core.CONVERT_RULES));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
