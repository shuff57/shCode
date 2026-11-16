// Optional examples for new projects. Starters and existing projects stay intact.
import type { DiagramDoc } from './diagram-types';
import type { SandboxModeId } from './sandbox-modes';

export interface SandboxDemo {
  id: string;
  mode: SandboxModeId;
  name: string;
  description: string;
  source: string;
}

function chart(nodes: DiagramDoc['nodes'], edges: DiagramDoc['edges']): string {
  return JSON.stringify({ version: 1, nodes, edges } satisfies DiagramDoc);
}

export const SANDBOX_DEMOS: readonly SandboxDemo[] = [
  {
    id: 'cafe-receipt', mode: 'js', name: 'Café receipt',
    description: 'Turn a basket of items into a receipt with quantities and tax.',
    source: `// Try changing the quantities or adding another item.
const basket = [
  { name: 'Hot chocolate', price: 3.50, quantity: 2 },
  { name: 'Blueberry muffin', price: 2.75, quantity: 3 },
  { name: 'Fruit cup', price: 4, quantity: 1 },
];
const taxRate = 0.08;
const money = amount => '$' + amount.toFixed(2);
let subtotal = 0;

console.log('THE CORNER CAFÉ');
console.log('------------------------------');
for (const item of basket) {
  const cost = item.price * item.quantity;
  subtotal += cost;
  console.log(item.quantity + ' × ' + item.name + ': ' + money(cost));
}
const tax = Math.round(subtotal * taxRate * 100) / 100;
console.log('------------------------------');
console.log('Subtotal: ' + money(subtotal));
console.log('Tax:      ' + money(tax));
console.log('Total:    ' + money(subtotal + tax));
`,
  },
  {
    id: 'trail-planner', mode: 'js', name: 'Trail planner',
    description: 'Filter trails by distance, sort them, and draw a console chart.',
    source: `// Change the limit to find a different weekend adventure.
const maxDistance = 6;
const trails = [
  { name: 'Lake loop', km: 2.5 },
  { name: 'Pine ridge', km: 5.5 },
  { name: 'Summit climb', km: 9 },
  { name: 'River walk', km: 4 },
  { name: 'Meadow path', km: 1.5 },
];
const matches = trails
  .filter(trail => trail.km <= maxDistance)
  .sort((a, b) => a.km - b.km);

console.log('TRAILS UP TO ' + maxDistance + ' KM');
for (const trail of matches) {
  const bar = '#'.repeat(Math.round(trail.km * 2));
  console.log(trail.name.padEnd(14) + bar + ' ' + trail.km + ' km');
}
if (matches.length === 0) {
  console.log('No matches yet. Try a larger distance.');
}
console.log(matches.length + ' trails to choose from.');
`,
  },
  {
    id: 'orbit-garden', mode: 'moshion', name: 'Orbit garden',
    description: 'Move the pointer to guide a glowing sun and its orbiting planets.',
    source: `// Move the pointer across the canvas. Change the speeds and colours.
let angle = 0;

function setup() {
  new Canvas(400, 400);
}

function draw() {
  background(18, 22, 40);
  noStroke();
  // A repeatable star field, with no image files needed.
  fill(130, 150, 190);
  for (let i = 0; i < 45; i++) {
    circle((i * 97) % 400, (i * 53) % 400, 2);
  }
  const x = Math.max(100, Math.min(300, mouseX));
  const y = Math.max(100, Math.min(300, mouseY));
  fill(255, 205, 90);
  circle(x, y, 42);
  for (let i = 0; i < 6; i++) {
    const phase = angle * (1 + i * 0.12) + i;
    const radius = 45 + i * 12;
    fill(90 + i * 25, 220 - i * 18, 240);
    circle(x + Math.cos(phase) * radius, y + Math.sin(phase) * radius, 10 + i * 2);
  }
  text('Move the pointer to guide the sun', 18, 24, 16, '#ffffff');
  angle += 0.02;
}
`,
  },
  {
    id: 'ripple-pond', mode: 'moshion', name: 'Ripple pond',
    description: 'A moving ripple pattern follows the pointer. Experiment with waves.',
    source: `// Each dot measures its distance from the pointer.
// Try changing the spacing, wave speed, or ripple size.
let time = 0;

function setup() {
  new Canvas(400, 400);
}

function draw() {
  background(12, 30, 46);
  noStroke();
  for (let x = 20; x < 400; x += 20) {
    for (let y = 50; y < 400; y += 20) {
      const distance = Math.hypot(x - mouseX, y - mouseY);
      const wave = (Math.sin(distance * 0.06 - time) + 1) / 2;
      fill(40 + wave * 70, 130 + wave * 100, 220);
      circle(x, y, 3 + wave * 12);
    }
  }
  text('Move the pointer to stir the pond', 18, 24, 16, '#ffffff');
  time += 0.07;
}
`,
  },
  {
    id: 'beacon-buddies', mode: 'moshion', name: 'Beacon buddies',
    description: 'Online co-op for two: host a room, share its code, and light matching beacons together.',
    source: `// Both players: open this demo and press Run.
// One chooses Host a room; the other joins using the room code.
// Arrow keys move your robot. Both must reach their matching beacons.
// Finish all three rounds together. Press Run for a fresh game.
let robot;
let stage = 0;
let sentStage = -1;
const colours = ['gold', 'deepskyblue'];
const beacons = [
  [[70, 130], [330, 310]],
  [[330, 130], [70, 310]],
  [[150, 220], [250, 220]],
];

function setup() {
  new Canvas(400, 400);
  multiplayer('coop', 2, { realtime: true });
  robot = new Sprite(200, 220, 24, 24);
  robot.collider = 'none';
  online.share(robot);
  // Only the host announces a completed round. Both screens apply it here.
  online.onMove((move, who) => {
    if (who === 0 && move.stage === stage + 1 && move.stage <= beacons.length) {
      stage = move.stage;
    }
  });
}

function onBeacon(sprite, point) {
  return sprite && Math.hypot(sprite.x - point[0], sprite.y - point[1]) < 18;
}

function draw() {
  background(18, 26, 42);
  robot.color = colours[seat] || colours[0];
  if (!game.ready || stage === beacons.length) return;

  let dx = 0;
  let dy = 0;
  if (kb.pressing('left')) dx -= 1;
  if (kb.pressing('right')) dx += 1;
  if (kb.pressing('up')) dy -= 1;
  if (kb.pressing('down')) dy += 1;
  const speed = dx && dy ? 2.1 : 3;
  robot.x = Math.max(16, Math.min(384, robot.x + dx * speed));
  robot.y = Math.max(90, Math.min(384, robot.y + dy * speed));

  const goals = beacons[stage];
  noStroke();
  for (let i = 0; i < 2; i++) {
    fill(i === 0 ? 110 : 25, i === 0 ? 85 : 90, i === 0 ? 25 : 130);
    circle(goals[i][0], goals[i][1], 60);
    text(i === 0 ? 'GOLD' : 'BLUE', goals[i][0] - 20, goals[i][1] + 4, 12, colours[i]);
  }
  // Each computer moves only its own robot. The host checks both positions.
  if (online.isHost && sentStage !== stage &&
      onBeacon(robot, goals[0]) && onBeacon(online.peers[1], goals[1])) {
    sentStage = stage;
    online.send({ stage: stage + 1 });
  }
}

function drawTop() {
  text('BEACON BUDDIES', 16, 24, 20, '#ffffff');
  if (!game.ready) {
    text('Host or join a room using the bar above.', 16, 48, 14, '#ffffff');
  } else if (stage === beacons.length) {
    text('All three rounds complete. Great teamwork!', 16, 48, 14, '#ffffff');
    text('Press Run on both screens to play again.', 16, 70, 14, '#ffffff');
  } else {
    text('Round ' + (stage + 1) + ' / 3 - Arrow keys move', 16, 48, 14, '#ffffff');
    text('Your beacon: ' + (seat === 0 ? 'GOLD' : 'BLUE'), 16, 70, 14, colours[seat]);
  }
}
`,
  },
  {
    id: 'mounting-plate', mode: 'reshape', name: 'Mounting plate',
    description: 'A rounded plate with four bolt holes. Adjust it in Dimensions.',
    source: `// A small mounting plate, in millimetres.
// Change the dimensions or move a hole in the Dimensions panel.
const plate = box(70, 50, 6, { corner: 1 })
hole(plate, { across: 5, at: [-24, -14] })
hole(plate, { across: 5, at: [24, -14] })
hole(plate, { across: 5, at: [-24, 14] })
hole(plate, { across: 5, at: [24, 14] })
`,
  },
  {
    id: 'desk-cup', mode: 'reshape', name: 'Desk cup',
    description: 'Hollow a cylinder into a pencil cup with a solid base.',
    source: `// A desktop pencil cup, in millimetres.
// Try changing the diameter, height, and wall thickness.
const cup = cylinder(50, 65)
shell(cup, { wall: 3, open: 'top' })
`,
  },
  {
    id: 'picnic-plan', mode: 'flow', name: 'Picnic plan',
    description: 'Follow yes/no branches that join again before the end.',
    source: chart([
      { id: 'start', shape: 'terminal', label: 'Start', x: 360, y: 40 },
      { id: 'forecast', shape: 'io', label: 'Read the forecast', x: 360, y: 150 },
      { id: 'rain', shape: 'decision', label: 'Will it rain?', x: 360, y: 280 },
      { id: 'indoors', shape: 'process', label: 'Pack an indoor picnic', x: 140, y: 440 },
      { id: 'outdoors', shape: 'process', label: 'Pack a park picnic', x: 580, y: 440 },
      { id: 'eat', shape: 'process', label: 'Share lunch with friends', x: 360, y: 580 },
      { id: 'end', shape: 'terminal', label: 'End', x: 360, y: 700 },
    ], [
      { id: 'e1', from: 'start', to: 'forecast' },
      { id: 'e2', from: 'forecast', to: 'rain' },
      { id: 'e3', from: 'rain', to: 'indoors', label: 'yes' },
      { id: 'e4', from: 'rain', to: 'outdoors', label: 'no' },
      { id: 'e5', from: 'indoors', to: 'eat' },
      { id: 'e6', from: 'outdoors', to: 'eat' },
      { id: 'e7', from: 'eat', to: 'end' },
    ]),
  },
  {
    id: 'countdown', mode: 'flow', name: 'Launch countdown',
    description: 'Trace a loop that counts down, then exits to launch.',
    source: chart([
      { id: 'start', shape: 'terminal', label: 'Start', x: 360, y: 40 },
      { id: 'set', shape: 'process', label: 'count = 5', x: 360, y: 150 },
      { id: 'check', shape: 'decision', label: 'count > 0?', x: 360, y: 280 },
      { id: 'show', shape: 'io', label: 'Display count', x: 140, y: 440 },
      { id: 'decrease', shape: 'process', label: 'count = count - 1', x: 140, y: 570 },
      { id: 'launch', shape: 'io', label: 'Display "Lift off!"', x: 580, y: 440 },
      { id: 'end', shape: 'terminal', label: 'End', x: 580, y: 570 },
    ], [
      { id: 'e1', from: 'start', to: 'set' },
      { id: 'e2', from: 'set', to: 'check' },
      { id: 'e3', from: 'check', to: 'show', label: 'yes' },
      { id: 'e4', from: 'show', to: 'decrease' },
      { id: 'e5', from: 'decrease', to: 'check', fromSide: 'l', toSide: 'l' },
      { id: 'e6', from: 'check', to: 'launch', label: 'no' },
      { id: 'e7', from: 'launch', to: 'end' },
    ]),
  },
];
