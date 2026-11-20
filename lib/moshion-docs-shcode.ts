// shCode's own pages of the moSHion docs, and the few places its copy of a
// shared page says more. Everything else comes from the moshion repo
// (docs/content/, copied in as lib/moshion-docs-shared.generated.ts by
// `npm run sync:moshion`); lib/moshion-docs.ts puts the two together.
//
// Write a page here only when it is about shCode itself (the Library, the
// account, rooms, sharing). A page about the engine belongs in the moshion
// repo, so the engine's own site has it too.
//
// An override carries `basedOn`, the first 10 hex of the SHA-1 of the shared
// page it was written against (JSON of its title, body and code). When the moshion repo changes that page,
// scripts/test-moshion-docs.mjs fails until someone re-reads the override and
// updates the hash, so the two copies cannot drift apart unnoticed.

import type { DocPage, DocSection } from './docs-core';

export interface DocOverride {
  section: string;
  page: string;
  why: string;
  basedOn: string;
  /** Replaces the body. */
  body?: string;
  /** Added as a last paragraph. */
  append?: string;
  /** Replaces the paragraph that starts with `from`. */
  swap?: { from: string; to: string };
}

export const overrides: DocOverride[] = [
  {
    section: 'animation',
    page: 'texture-catalog',
    why: "shCode ships its own, larger texture catalog (126 textures, 32 animated); the repo's page lists the repo's 105.",
    basedOn: 'b3fc4f1916',
    body: `moSHion ships 126 pixel-art textures. Every name below works the same way: sprite.texture = 'coin', sprite.texture = 'slime'.

94 are stills; 32 are animated sprite sheets that simply play when you assign the name (see below). The terrain, things, battle, numbers and candy groups are newer: ground to build levels from, flags and switches, swords and shields, the digits 0-9 for a score or a die, and candy.

The names, by group —

characters: player, playerBeige, playerBeigeJump, playerBeigeWalk, playerBlue, playerBlueJump, playerBlueWalk, playerJump, playerPink, playerPinkJump, playerPinkWalk, playerWalk, playerYellow, playerYellowJump, playerYellowWalk, runner, runnerJump

pickups: coin, coinBronze, coinBronzeSpin, coinSilver, coinSilverSpin, coinSpin, gem, gemGreen, gemGreenSparkle, gemOrange, gemOrangeSparkle, gemSparkle, gemYellow, gemYellowSparkle, heart, heartBlink, heartHalf, heartLose, key, keyBlue, keyGreen, keyOrange, star, starTwinkle

blocks: block, bomb, cactus, crate, crateX, door, exitSign, mushroom, mushroomBrown, torch, torchFlicker

creatures: bat, batFly, bee, beeFly, bird, fish, fishPink, fishSwim, frog, ghost, ladybug, ladybugWalk, monster, slime, slimeBlue, snail, snailCrawl, worm

terrain: brick, brickTan, bush, grass, ice, lava, lavaDeep, rock, sand, snow, spikes, stone, tree, water, waterDeep

things: apple, flag, flagBlue, flagBlueWave, flagGreen, flagGreenWave, flagRed, flagRedWave, flagWave, lever, lock, lockGreen, sign, signArrow, spring

battle: blaster, boom, burst, burstBlue, burstGreen, burstOrange, shield, shieldGold, shieldSilver, sword, swordGold

numbers: num0, num1, num2, num3, num4, num5, num6, num7, num8, num9

candy: candyGreen, candyOrange, candyYellow, swirl, swirlMint

Animated ones to try: coinSpin (and coinSilverSpin, coinBronzeSpin), starTwinkle, gemSparkle (and gemGreenSparkle, gemYellowSparkle, gemOrangeSparkle), heartBlink, playerJump (one per player colour, like playerBlueJump), flagWave (one per flag colour), torchFlicker and boom.

Every animation loops unless you set sprite.texture.loop = false, which plays it once and stops on the last picture. Two are made to play once: heartLose (a heart flashes, then shows half) and boom (an explosion that grows and fades). Show them for one loop, then change the picture or remove the sprite. heartLose shows 6 pictures for 10 frames each, so after(60, () => heart.texture = 'heartHalf'). boom shows 6 pictures for 6 frames each, so after(36, () => blast.remove()).`,
  },
  {
    section: 'animation',
    page: 'textures',
    why: "shCode's texture editor makes textures a sketch can use by name.",
    basedOn: '41136135e4',
    append: `Draw your own in the texture editor — the Textures tab in the sandbox, or the Textures link in the header. Open a built-in, change it, save it under any name. Save more than one frame and the texture ANIMATES: sprite.texture = 'myWalk' plays it, with no addAni call, because a saved animation is stored as the same horizontal frame strip addAni already slices.`,
  },
  {
    section: 'animation',
    page: 'add-ani',
    why: "shCode's texture editor makes animations a sketch can use by name.",
    basedOn: 'de9bafb4f7',
    append: `The sheet can also be the name of an animation you drew in the Texture editor: sprite.addAni('walk', 'myWalk') uses its own frames and frame lengths, so changeAni switches between two drawn animations. Give a frame count to override it. loop, frame, tick, pause() and play() work on a drawn animation too, and on a texture you drew: after sprite.texture = 'openDoor', use sprite.texture.loop = false.`,
  },
  {
    section: 'animation',
    page: 'animation-objects',
    why: "shCode's texture editor gives each frame its own length.",
    basedOn: '5f9b11db26',
    append: `An animation you draw in the Textures tab can give each frame a different length, and frameDelays is where those lengths show up.`,
  },
  {
    section: 'text',
    page: 'fonts',
    why: "shCode students save fonts in their Library.",
    basedOn: 'dfae633a23',
    append: `fontNames() also lists the fonts you saved in your Library, and textFont() takes their names the same way.`,
  },
  {
    section: 'sound',
    page: 'sound',
    why: "shCode's Library, sound mixer and the 190 KB limit on a saved sound.",
    basedOn: 'cbee28ae59',
    swap: {
      from: "The built-in sounds load by name, no pat",
      to: `moSHion ships a small 8-bit palette you load by name, no path needed: loadSound('coin') is a short chime and loadSound('music') is a short tune. There are also jump, hit, laser, powerup, explode, blip, select and tone, with title, win and lose for menus. For board and battle games there are dice, step, sword, clang, potion, levelup, crown, whoosh, pop and door. Every one is in the Library under Built in, where you can play it and copy the line that loads it. The longer path, loadSound('/moshion/assets/coin.wav'), still works. A sound that cannot load never plays, and the console says why.

The sound mixer at /sound (also the Sounds tab beside a moSHion lesson's code) builds a sound from a chip preset and saves it, and Import a clip there saves your own MP3, WAV or OGG file. Load a saved sound by its name, exactly as you saved it, capitals too, and without .mp3: let zap = loadSound('zap');. A sound you save under a built-in name, like coin, plays instead of the built-in one. A saved sound can be about 190 KB at most, which is a few seconds of effect or a short music loop, not a whole song: for music, save a short loop and play it with .loop(). A link to a sound on another website does not work here; download the file and import it instead.`,
    },
  },
];

/** Pages added to a shared section, each after the page named in `after`. */
export const extraPages: { section: string; after: string; page: DocPage }[] = [
  {
    section: 'persistence',
    after: 'saving',
    page: {
      id: 'account-saves',
      title: "Saving to your account: save() and load()",
      body: `storeItem() keeps a value in this browser only. Open your game on another computer and the high score is gone. save() and load() do the same job, and they can also keep the value in your shCode account instead.

save(name, value) saves a value under a name, and load(name) reads it back (null when nothing is saved yet). On their own they work exactly like storeItem() and getItem(), in this browser.

Add 'remote' at the end and the value is kept in your account: save('best', score, 'remote') and load('best', 'remote'). Sign in on any computer, run the same game, and it is still there. 'local' means this browser, and it is what you get when you leave the word out.

Remote saves belong to one sketch: a lesson keeps its own, the Sandbox keeps its own, and a game from the Library keeps each player's saves in that player's own account. You must be signed in. If you are not, or the internet drops, the save stays in this browser and the console says so once, so the game keeps running.

To keep several values together, use saved(name, defaults). It gives back an object with your saved fields laid over the defaults. Change its fields, then call .save() to save the whole object: saved('player', { best: 0, coins: 0 }, 'remote') remembers 'remote', so player.save() goes to your account too.

A remote save can hold up to 100 names, 16 KB for one value and 64 KB in total, which is plenty for scores, levels and settings. Never save a password: anyone who can see your code can read it.`,
      code: `let player;
let score = 0;

function setup() {
  new Canvas(400, 400);
  // Saved in your account, so it follows you to any computer.
  player = saved('player', { best: 0, plays: 0 }, 'remote');
  player.plays += 1;
  player.save();
}

function update() {
  if (kb.presses(' ')) {
    score++;
    if (score > player.best) {
      player.best = score;
      player.save();
    }
  }
}

function draw() {
  background('#222');
  fill('white');
  textSize(18);
  text('Score: ' + score, 14, 30);
  fill('gold');
  text('Best: ' + player.best, 14, 54);
  fill('#888');
  textSize(12);
  text('Plays: ' + player.plays + '   space = score', 14, 76);
}`,
    },
  },
];

/** Whole sections only this course has, each placed after the section named in `after`. */
export const extraSections: { after: string; section: DocSection }[] = [
  {
    after: 'persistence',
    section: {
      slug: 'multiplayer',
      title: "Multiplayer",
      pages: [
        {
          id: 'one-line',
          title: "One line: multiplayer()",
          body: `multiplayer(mode, players) turns a one-player sketch into a game for 2 to 4 people. Call it once, in setup(). The mode is one of four words:

'none' is one player, the same as not calling it at all.

'local' is 2 to 4 players taking turns at ONE keyboard.

'versus' is 2 to 4 players online, each on their own computer, taking turns against each other.

'coop' is 2 to 4 players online on the SAME side, with no turns: anyone can act at any time.

The second number is how many players, from 2 to 4 (2 if you leave it out). A mode it does not know, or a number outside 2 to 4, prints a message in the console and plays as one player.

After the call your sketch has a few new names: players (how many), turn (whose turn it is, counting from 0), nextTurn() (pass the turn to the next player), myTurn() (is it my turn right now?) and, online, seat (which player YOU are, 0 for the player who hosted). There is also game, with game.mode, game.players and game.ready, for showing what is going on. If your sketch already has its own turn or nextTurn, multiplayer() leaves yours alone and says so in the console.`,
          code: `function setup() {
  new Canvas(400, 200);
  multiplayer('local', 2);
}

function update() {
  if (kb.presses('space')) nextTurn();
}

function draw() {
  background('#1b1d2a');
}

function drawTop() {
  text(game.mode + ' game for ' + players + ' players', 10, 30, 16, 'white');
  text('Player ' + (turn + 1) + ': press SPACE to pass the turn', 10, 60, 16, 'gold');
}`,
        },
        {
          id: 'local',
          title: "Taking turns at one keyboard (local)",
          body: `In a 'local' game everyone shares the keyboard, so myTurn() is always true and whoever is at the keys plays for whoever's turn it is. Your code does the move and then calls nextTurn().

The example is race to 21: players take turns adding 1 or 2, and whoever makes the count reach 21 wins. Press 1 or 2. turn says whose turn it is; turn + 1 turns 0 and 1 into Player 1 and Player 2 for the screen.`,
          code: `let count = 0;
let winner = -1;

function setup() {
  new Canvas(400, 200);
  multiplayer('local', 2);
}

function update() {
  if (winner === -1) {
    if (kb.presses('1')) add(1);
    if (kb.presses('2')) add(2);
  }
}

function draw() {
  background('#1b1d2a');
}

function add(n) {
  count = min(count + n, 21);
  if (count === 21) winner = turn;
  else nextTurn();
}

function drawTop() {
  text('Count: ' + count, 10, 40, 24, 'white');
  if (winner === -1) text('Player ' + (turn + 1) + ': press 1 or 2', 10, 80, 16, 'gold');
  else text('Player ' + (winner + 1) + ' reached 21 and wins!', 10, 80, 16, 'gold');
}`,
        },
        {
          id: 'versus',
          title: "Playing a classmate online (versus)",
          body: `Change one word, 'local' to 'versus', and the same game is played by two computers. A bar appears above the game with three ways in: Host makes a room and shows its code as four pictures (like coin, bee, key, apple); Join lets a classmate click those four pictures in order; and Open rooms lists rooms your classmates are hosting for THIS game, so they can just press Join. The bar shows how many are here ("1 of 2 here") until the room is full.

Two rules keep both screens the same:

Send, then apply. On your turn you do not change count yourself: you send your move with online.send({ add: 1 }). Every move, yours too, comes back to every computer through online.onMove, in the same order, and THAT is where count changes and nextTurn() is called. Both computers run the same moves in the same order, so they always agree.

Only the right player. myTurn() is true only when the room is full and it is your seat's turn. In onMove, check that the move came from the player whose turn it is (who === turn) and that it makes sense (1 or 2), and ignore it otherwise: then a wrong or broken move changes nothing anywhere.

Rooms are for classmates only (someone who shares a class with you), and you must be signed in. To try it alone, open the same page in a second browser tab: each tab is a different player.`,
          code: `let count = 0;
let winner = -1;

function setup() {
  new Canvas(400, 200);
  multiplayer('versus', 2);
  online.onMove((move, who) => {
    if (winner !== -1 || who !== turn) return;
    if (move.add !== 1 && move.add !== 2) return;
    count = min(count + move.add, 21);
    if (count === 21) winner = turn;
    else nextTurn();
  });
}

function update() {
  if (winner === -1 && myTurn()) {
    if (kb.presses('1')) online.send({ add: 1 });
    if (kb.presses('2')) online.send({ add: 2 });
  }
}

function draw() {
  background('#1b1d2a');
}

function drawTop() {
  text('Count: ' + count, 10, 40, 24, 'white');
  if (!game.ready) text('Waiting for players: use the bar above', 10, 80, 14, '#8393c4');
  else if (winner !== -1) text('Player ' + (winner + 1) + ' wins!', 10, 80, 16, 'gold');
  else if (myTurn()) text('Your turn: press 1 or 2', 10, 80, 16, 'gold');
  else text('Player ' + (turn + 1) + ' is thinking...', 10, 80, 16, '#8393c4');
}`,
        },
        {
          id: 'coop',
          title: "Playing on the same side (coop)",
          body: `In a 'coop' game there are no turns: everyone is on the same team and can act whenever they like. myTurn() is true for everyone once the room is full. Moves still travel the same way, send then apply in onMove, so every computer sees the team's moves in one order.

The example is a shared tank for up to 4 players. Each press of SPACE sends one pump; every pump from anyone fills the tank, and the team wins when it is full. seat tells each computer which player it is, so the screen can say "You are player 3".`,
          code: `let water = 0;

function setup() {
  new Canvas(400, 200);
  multiplayer('coop', 4);
  online.onMove((move, who) => {
    if (move.pump === 1 && water < 100) water = min(water + 5, 100);
  });
}

function update() {
  if (myTurn() && water < 100 && kb.presses('space')) online.send({ pump: 1 });
}

function draw() {
  background('#1b1d2a');
  fill('#333');
  rect(20, 100, 360, 40);
  fill('dodgerblue');
  rect(20, 100, 360 * water / 100, 40);
}

function drawTop() {
  if (!game.ready) text('Waiting for the team: use the bar above', 10, 40, 14, '#8393c4');
  else text('You are player ' + (seat + 1) + ' of ' + players + '. SPACE pumps!', 10, 40, 14, 'gold');
  if (water === 100) text('Full! The team did it.', 10, 80, 18, 'limegreen');
}`,
        },
        {
          id: 'what-for',
          title: "What online play is good for",
          body: `Moves travel through the shCode server, which each computer checks about once a second (faster while everyone is in the room). Each player can send at most 30 moves every 10 seconds. That is plenty for turn-based and slower games: board games, card games, battles where each side picks an action, puzzles you solve together. It is NOT fast enough for real-time action where two players steer ships around the screen at the same moment, so do not send a move every frame: send one when something happens. (For a game where players move at the same time, see Real-time play, next.)

A move is game data only: numbers, true or false, and short one-word labels (no spaces, at most 24 letters of words in one move). A sentence is refused on purpose, because a game room is not a chat.

If the player who hosted runs their game again, the room closes and everyone else sees that it closed: one player hosts a new room and the others join it. A player who runs again with the room still open gets their seat back and catches up on every move.`,
          code: `// Send a move when something HAPPENS (a key press), never every frame.
let jumps = 0;

function setup() {
  new Canvas(400, 160);
  multiplayer('coop', 2);
  online.onMove((move, who) => {
    if (move.jump === true) jumps += 1;
  });
}

function update() {
  if (myTurn() && kb.presses('space')) online.send({ jump: true });
}

function draw() {
  background('#1b1d2a');
}

function drawTop() {
  text('Jumps by the team: ' + jumps, 10, 40, 18, 'white');
  text('One move per press, not one per frame.', 10, 80, 14, '#8393c4');
}`,
        },
        {
          id: 'realtime',
          title: "Real-time play",
          body: `Add a third piece to multiplayer() and the room becomes a real-time room: multiplayer('coop', 2, { realtime: true }). The lobby bar is the same (Host, Join, the four pictures, Open rooms), but moves now arrive in a few hundredths of a second instead of about once a second, and you get one new call:

online.share(sprite) shows this sprite on every other computer. About 15 times a second your computer sends where the sprite is (x, y, rotation), its size and its colour. On the other computers a copy appears by itself and glides smoothly between those updates, so it does not jump. Only YOUR computer moves your sprite; the copies just follow it. Call it once, in setup(), after multiplayer().

The copies of other players' sprites are in online.peers: online.peers[1] is the sprite player 2 (seat 1) shares, ready to draw or test. A copy has collider 'none', so it never pushes anything: ask overlaps() if you want to know when you touch it.

In the example each player steers their own square with the arrow keys and sees the other square glide around. Try it alone with a second browser tab.

What real time does NOT do, honestly:

No physics is shared. Each computer runs its own physics; a shared sprite is a position, not a body. If two players bump, each screen works it out on its own and they can disagree.

The owner decides. When something is hit, the computer that owns the thing that was hit decides what happened, and sends a move to say so (online.send). Everyone else believes that move.

Lag is real. A copy is drawn about a tenth of a second behind, so it can glide smoothly. Over a slow network it can be further behind.

The limits are the same as before: game data only in a move (numbers, true or false, short one-word labels), and at most 30 messages a second from each computer, sharing included. A sprite that has not moved is only sent once a second.`,
          code: `let me;

function setup() {
  new Canvas(400, 300);
  multiplayer('coop', 2, { realtime: true });
  me = new Sprite(200, 150, 40, 40);
  me.color = 'gold';
  online.share(me);
}

function update() {
  me.vel.x = 0;
  me.vel.y = 0;
  if (kb.pressing('left')) me.vel.x = -4;
  if (kb.pressing('right')) me.vel.x = 4;
  if (kb.pressing('up')) me.vel.y = -4;
  if (kb.pressing('down')) me.vel.y = 4;
  me.x = constrain(me.x, 20, 380);
  me.y = constrain(me.y, 20, 280);
  if (seat === 1) me.color = 'deepskyblue';
}

function draw() {
  background('#1b1d2a');
}

function drawTop() {
  if (!game.ready) text('Waiting for a player: use the bar above', 10, 24, 14, '#8393c4');
  else {
    text('You are player ' + (seat + 1) + '.', 10, 24, 14, 'white');
    text('Arrow keys move your square.', 10, 44, 14, 'white');
  }
  let other = online.peers[seat === 0 ? 1 : 0];
  if (other && me.overlaps(other)) text('Touching!', 10, 68, 16, 'limegreen');
}`,
        },
        {
          id: 'host-decides',
          title: "Real-time play: the host decides",
          body: `Many online games work like a Minecraft server: one computer, the HOST, runs the real game, and everyone else sends what they are pressing and watches. Nobody can disagree, because there is only one world.

online.isHost is true on the host's computer (the player who pressed Host, seat 0) and false everywhere else.

Every player, the host too, sends their arrow keys as a move, but only when they CHANGE (pressing or letting go), never every frame: online.send({ dx: 1, dy: 0 }).

Only the host listens to those moves. In online.onMove it remembers each seat's keys; every frame it moves the real sprites by those keys; and it shares every sprite with online.share(), so every screen shows the host's world.

The others make no sprites of their own. The host's shared sprites appear on their screens by themselves; online.sharedBy(0) lists them, in the order the host shared them.

Because the host decides everything, a collision, a score or a win only happens on the host's computer. To show it on everyone's screen, share a sprite that shows it, or send a move about it.`,
          code: `let boxes = [];
let keys = [];
let sentKeys = '';

function setup() {
  new Canvas(400, 300);
  multiplayer('coop', 2, { realtime: true });
  online.onMove((move, who) => {
    if (online.isHost) keys[who] = move;
  });
}

function draw() {
  background('#1b1d2a');
}

function update() {
  if (!game.ready) return;
  // Everyone: send my keys when they change.
  let dx = 0;
  let dy = 0;
  if (kb.pressing('left')) dx = -1;
  if (kb.pressing('right')) dx = 1;
  if (kb.pressing('up')) dy = -1;
  if (kb.pressing('down')) dy = 1;
  if (dx + ',' + dy !== sentKeys) {
    sentKeys = dx + ',' + dy;
    online.send({ dx: dx, dy: dy });
  }
  // The host: make the real sprites once, then move them by everyone's keys.
  if (online.isHost) {
    if (boxes.length === 0) {
      for (let i = 0; i < players; i++) {
        let box = new Sprite(100 + i * 200, 150, 40, 40);
        box.color = i === 0 ? 'gold' : 'deepskyblue';
        boxes.push(box);
        online.share(box);
      }
    }
    for (let i = 0; i < boxes.length; i++) {
      let k = keys[i] || { dx: 0, dy: 0 };
      boxes[i].vel.x = k.dx * 4;
      boxes[i].vel.y = k.dy * 4;
      boxes[i].x = constrain(boxes[i].x, 20, 380);
      boxes[i].y = constrain(boxes[i].y, 20, 280);
    }
  }
}

function drawTop() {
  if (!game.ready) text('Waiting for a player: use the bar above', 10, 24, 14, '#8393c4');
  else if (online.isHost) {
    text('You are the host:', 10, 24, 14, 'gold');
    text('your computer runs the game.', 10, 44, 14, 'gold');
  } else {
    text('The host runs the game.', 10, 24, 14, 'white');
    text('Your keys go to the host.', 10, 44, 14, 'white');
  }
}`,
        },
        {
          id: 'online-object',
          title: "The online object, step by step",
          body: `multiplayer() is the easy way in. Under it is the online object, which does the same job with the details showing. You only need it if you want to build your own lobby.

online.host(players) starts a room for 2 to 4 players and online.code becomes the room's 4-letter code. online.join(code) joins a classmate's room. online.leave() leaves it, and when the host leaves the room closes. online.codeIcons is the same code as 4 picture names, for drawing it.

online.status is one of 'off', 'connecting', 'waiting', 'ready', 'closed' or 'error', and if it is 'error' then online.error says what went wrong in words. online.seat is your place in the room, 0 for the host, and online.seats is how many players the room is for. online.players lists who is in it. online.live is true while you are in a real-time room.

online.unshare(sprite) stops showing one of your sprites on the other computers, and online.unshare() stops all of them. The game object has status and code too, for a sketch that used multiplayer().`,
        },
      ],
    },
  },
  {
    after: 'coordinates',
    section: {
      slug: 'sharing',
      title: "Sharing your game",
      pages: [
        {
          id: 'versions',
          title: "Versions: saving with a note",
          body: `Publish game saves your sketch as a game in your Library. Every time you press Update game after that, it asks "What did you change?" and saves a new version with your answer as its note: "Added a second level", "Fixed the jump".

Your game's History lists every version with its note, who made it and when. See the changes shows exactly which lines changed: red lines are gone, green lines are new. Go back to this version puts an old version's code back as a NEW version, so nothing is ever lost, and you can go back from going back.

Write notes that say what changed, not "update" or "stuff". In a month, "Coins give 5 points now" tells you something; "changes" does not.`,
        },
        {
          id: 'remix',
          title: "Remix: your own copy",
          body: `Remix on a classmate's game copies its code into your own sandbox. Change anything: it is your copy, and the original does not change. When you publish it, it says "Remixed from" the original, with its maker's name.

Your sandbox remembers which game and which version you started from. That is what lets you send your change back (Propose change) and bring in the maker's newer versions later.

A game shared as "Just play" has no Remix. A game shared as "keep remixes open" asks that your remix is shared the same way.`,
        },
        {
          id: 'proposing',
          title: "Proposing a change",
          body: `Made something better in your remix: a fixed bug, a new level, a nicer jump? Send it back. In the sandbox press Propose change, say what you changed in a few words, and (if you like) why. Press See my changes first to check exactly what you are sending.

The maker sees it in their Library under Proposed changes. They can look at the changes, press Try it to play the game with your change in, and then Accept it or say No thanks. If they accept, it becomes a new version of their game with your name on it, and the game's page says "With changes by" you.

Every proposed change has a conversation. The maker, you, and any classmate who can see the game can comment: ask a question, say what you tried, suggest something. It stays open after the change is accepted or not, until the maker or a teacher closes it. Your teacher can read every conversation. Talk about the game and the code, and be kind.

To change your proposal, edit the code in your sandbox and press Propose change again: it updates the one you sent. Take it back takes it away.`,
        },
        {
          id: 'newest-version',
          title: "Bring in the newest version",
          body: `While you work on your remix, the maker might change their game too. When they do, Propose change shows a dot, and the panel says the game has a newer version. Bring in the newest version puts their new lines into your code and keeps yours. Your code from before goes to the sandbox's History first, so nothing is lost.

If you and the maker changed the SAME lines, the two changes cannot be put together by themselves. You pick: keep your code for now, or start from the newest version and copy your change back in by hand (your code is in History). See both shows the two side by side.

Bring in the newest version before you propose, so the maker can accept your change without a clash.`,
        },
        {
          id: 'github',
          title: "How this matches GitHub",
          body: `Everything here is a small version of how programmers work together on GitHub:

Update game with a note is a commit. History is the commit history. Go back to this version is a revert.

Remix is a fork. Bring in the newest version is syncing your fork.

Propose change is a pull request. Its conversation is the pull request's conversation. See the changes is "Files changed". Try it is checking out the branch and testing it. Accept is merge, and No thanks is closing it.

Two changes to the same lines is a merge conflict. On GitHub you fix it by editing the lines yourself; here you keep one version and copy your change back in.`,
        },
      ],
    },
  },
];
