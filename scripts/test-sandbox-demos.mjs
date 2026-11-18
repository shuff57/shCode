// Run examples and flowchart checks. CAD uses the shipped SolidCraft script
// sandbox; scripts/test-solidcraft-sandbox.mjs builds it on the pinned engine.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { runSketch } from './moshion-harness.mjs';
import { SANDBOX_DEMOS } from '../lib/sandbox-demos.ts';
import { SANDBOX_MODES } from '../lib/sandbox-modes.ts';
import { DEFAULT_RULES } from '../lib/diagram-types.ts';
import { checkDiagram } from '../lib/diagram-check.ts';
import { evaluateCad } from './_solidcraft-harness.mjs';
assert.equal(new Set(SANDBOX_DEMOS.map(d => d.id)).size, SANDBOX_DEMOS.length);
for (const mode of SANDBOX_MODES) {
  assert.ok(SANDBOX_DEMOS.filter(d => d.mode === mode.id).length >= 2, mode.id + ' has two demos');
}
for (const demo of SANDBOX_DEMOS) {
  assert.ok(demo.name.length <= 40);
  if (demo.mode === 'js') {
    const output = [];
    vm.runInNewContext(demo.source, { console: { log: line => output.push(line) } }, { timeout: 1000 });
    if (demo.id === 'cafe-receipt') assert.ok(output.includes('Total:    $20.79'), output.join('\n'));
    if (demo.id === 'trail-planner') {
      assert.equal(output.at(-1), '4 trails to choose from.');
      assert.ok(!output.some(line => line.includes('Summit climb')));
      assert.ok(output[1].startsWith('Meadow path'));
    }
  } else if (demo.id === 'beacon-buddies') {
    const engine = runSketch(demo.source, { frames: 5 });
    assert.ok(engine.ok, String(engine.error));
    const peers = [];
    const moves = [];
    const buttons = new Set();
    const clients = [0, 1].map(seat => {
      let receive;
      const online = {
        isHost: seat === 0, peers,
        share(sprite) { peers[seat] = sprite; },
        onMove(fn) { receive = fn; },
        send(move) { moves.push({ move, who: seat }); },
      };
      const context = vm.createContext({
        Canvas: function() {},
        Sprite: function(x, y) { this.x = x; this.y = y; },
        multiplayer(mode, count, options) {
          assert.equal(mode, 'coop'); assert.equal(count, 2); assert.equal(options.realtime, true);
        },
        online, seat, game: { ready: false },
        kb: { pressing: key => buttons.has(key) },
        background() {}, noStroke() {}, fill() {}, circle() {}, text() {},
      });
      vm.runInContext(demo.source + '\nsetup();', context);
      return { context, receive: (move, who) => receive(move, who) };
    });
    const frame = client => vm.runInContext('draw(); drawTop();', client.context, { timeout: 1000 });
    // Lobby: no movement or progression while waiting for the other player.
    buttons.add('right');
    frame(clients[0]);
    assert.equal(peers[0].x, 200);
    for (const client of clients) client.context.game.ready = true;
    frame(clients[0]);
    assert.equal(peers[0].x, 203);
    buttons.clear();
    // Guests cannot announce wins; skipped and malformed stages are ignored.
    for (const client of clients) {
      client.receive({ stage: 1 }, 1);
      client.receive({ stage: 3 }, 0);
      client.receive({ stage: '1' }, 0);
      assert.equal(vm.runInContext('stage', client.context), 0);
    }
    const goals = [[[70, 130], [330, 310]], [[330, 130], [70, 310]], [[150, 220], [250, 220]]];
    for (let round = 0; round < goals.length; round++) {
      // One matching robot is not sufficient.
      [peers[0].x, peers[0].y] = goals[round][0];
      peers[1].x = 200; peers[1].y = 100;
      frame(clients[0]);
      assert.equal(moves.length, 0);
      [peers[1].x, peers[1].y] = goals[round][1];
      frame(clients[1]);
      assert.equal(moves.length, 0, 'only host announces completion');
      frame(clients[0]); frame(clients[0]);
      assert.equal(moves.length, 1, 'one announcement while waiting for delivery');
      const { move, who } = moves.shift();
      assert.equal(move.stage, round + 1);
      for (const client of clients) {
        client.receive(move, who);
        client.receive(move, who); // Duplicate delivery must be harmless.
        assert.equal(vm.runInContext('stage', client.context), round + 1);
      }
    }
    buttons.add('right');
    const finalX = peers[0].x;
    frame(clients[0]);
    assert.equal(peers[0].x, finalX, 'movement stops after winning');
    assert.equal(moves.length, 0);
  } else if (demo.mode === 'moshion') {
    let circles = 0;
    let canvases = 0;
    const finite = (...numbers) => assert.ok(numbers.every(Number.isFinite));
    const context = vm.createContext({
      Canvas: function(w, h) { assert.deepEqual([w, h], [400, 400]); canvases++; },
      background: finite, fill: finite, noStroke() {},
      circle(x, y, size) { finite(x, y, size); assert.ok(size > 0); circles++; },
      text(label, x, y, size) { assert.equal(typeof label, 'string'); finite(x, y, size); },
      mouseX: 0, mouseY: 0,
    });
    vm.runInContext(demo.source + '\nsetup();', context, { timeout: 1000 });
    for (const [x, y] of [[0, 0], [200, 200], [400, 400], [-50, 450]]) {
      context.mouseX = x; context.mouseY = y;
      vm.runInContext('for (let frame = 0; frame < 60; frame++) draw();', context, { timeout: 1000 });
    }
    assert.equal(canvases, 1);
    assert.ok(circles > 1000);
  } else if (demo.mode === 'reshape') {
    const result = evaluateCad(demo.source);
    assert.deepEqual(result.errors, []);
    assert.ok(result.doc.features.length);
    assert.equal(result.doc.features.some(f=>f.kind==='sketch'),demo.id==='organizer-outline');
  } else {
    const doc = JSON.parse(demo.source);
    const failures = checkDiagram(doc, DEFAULT_RULES).filter(r => !r.passed);
    assert.deepEqual(failures, []);
    assert.equal(new Set(doc.nodes.map(n => n.id)).size, doc.nodes.length);
    for (const edge of doc.edges) {
      assert.ok(doc.nodes.some(n => n.id === edge.from));
      assert.ok(doc.nodes.some(n => n.id === edge.to));
    }
  }
  console.log('PASS ' + demo.mode + ': ' + demo.name);
}
