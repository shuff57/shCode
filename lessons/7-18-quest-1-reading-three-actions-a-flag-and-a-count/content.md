## Three actions, a flag and a count

**Read before 7.18.2 Sub-build: A flag and a count inside an object.** About 12 minutes.

A fight where both sides only ever attack is decided by luck. Quest gives each turn a choice:
**1** attack, **2** guard, **3** drink a potion. Guarding needs the fighter to remember one
yes-or-no thing, and potions need it to remember a number. Both live inside the object, as
properties, next to `hp`.

## A flag: guarding

A flag is a property that is `true` or `false`. A fighter starts not guarding, so the
constructor sets `this.guarding = false;`, and guarding turns it on:

```js
guard() {
  this.guarding = true;
}
```

The flag does its work in `takeHit`, the one method every hit already goes through (7.17.1).
While the flag is on, the hit is halved; and **any hit ends the guard**, so it lasts one hit:

```js
takeHit(n) {
  if (this.guarding) n = floor(n / 2);
  this.guarding = false;
  this.hp = max(this.hp - n, 0);
  return n;
}
```

`floor(n / 2)` is half, rounded down (5.2.2): a hit of 7 becomes 3, a hit of 6 becomes 3. Look
at the order: halve first, while the flag still says so, then turn the flag off, then take the
hp. And `return n` now pays off: `n` is the hit after the guard, so the message says
`for 3`, not `for 7`. Nothing that calls `takeHit` had to change, because `attack` already hands
back whatever `takeHit` answers.

## A count: potions

A count is a number that goes down as it is used. The constructor gets one more value, how many
potions this fighter starts with, and stores it:

```js
constructor(name, maxHp, power, potions, color) {
  ...
  this.potions = potions;
  this.guarding = false;
}
```

**That changes every `new Fighter(...)`.** A constructor's values are matched by their place in
the list (7.1.5): there are five now, and the fourth is the potions. So
`new Fighter('Hero', 30, 3, 'gold')` must become `new Fighter('Hero', 30, 3, 2, 'gold')`.
Forget one, and `'gold'` lands in `potions` while `color` gets nothing at all.

A potion gives up to 12 hp back, but never more than the most the fighter can have. `min(a, b)`
is the smaller of two numbers (6.23.1 kept a token on the board with it), so
`min(this.hp + 12, this.maxHp)` stops at `maxHp`:

```js
heal() {
  if (this.potions === 0) return 0;
  this.potions -= 1;
  const before = this.hp;
  this.hp = min(this.hp + 12, this.maxHp);
  return this.hp - before;
}
```

With no potions left, `heal` does nothing and says so: it returns 0. Otherwise it uses one up
and returns how much hp it really gave back, which is less than 12 near the top: at 25 out of
30, a potion gives 5.

## Drawing the flag and the count

The count goes on the fighter's line of numbers:
`text(this.hp + '/' + this.maxHp + '  potions ' + this.potions, x - 60, y + 98, 12, '#ccc');`.
The flag gets a gold ring around the body while it is on. Three drawing functions are new
here. `noFill()` means the next shapes have no fill, so a circle is only its outline.
`stroke('gold')` sets the colour of the outline and `strokeWeight(4)` its thickness in pixels.
In 7.1.15 (Worked Example: Sprite Showcase) a sprite had `.stroke` and `.strokeWeight`
properties for the same two things; these functions do it for shapes drawn with `circle` and
`rect`. `noStroke()` (6.1.2) takes the outline away again, so nothing else is drawn with it:

```js
if (this.guarding) {
  noFill();
  stroke('gold');
  strokeWeight(4);
  circle(x, y, 86);
  noStroke();
}
```

## One act for all three

7.17.3 had `attackTurn(t, roll)`. Now a turn can be one of three actions, so the function gets
one more value, `a`, the action: 1 attack, 2 guard, 3 potion. Everything after the action is the
same as before (did the other one fall? pass the turn, start the enemy's pause):

```js
function act(t, a, roll) {
  const me = fighters[t];
  const them = fighters[1 - t];
  if (a === 1) message = me.name + ' hits ' + them.name + ' for ' + me.attack(them, roll);
  if (a === 2) { me.guard(); message = me.name + ' guards'; }
  if (a === 3) message = me.name + ' drinks a potion: +' + me.heal();
  ...
}
```

The roll is only used by an attack; guarding and drinking ignore it. On your turn, the key you
press picks `a`, with `kb.presses('1')`, `'2'` and `'3'` (6.15.2), and nothing happens on a frame
when no key was pressed:

```js
let a = 0;
if (kb.presses('1')) a = 1;
if (kb.presses('2')) a = 2;
if (kb.presses('3')) a = 3;
if (a !== 0) choose(a);
```

`choose(a)` is one line today, `act(turn, a, floor(random(0, 4)));`. On day five it is the one
place that changes when the duel goes online.

## The enemy chooses too

The enemy needs a rule for picking, and a simple one is enough to make it feel alive. In
order: if it is low (less than a third of its hp) and has a potion, drink it; otherwise guard
one time in four; otherwise attack.

```js
function enemyTurn() {
  if (over || turn !== 1) return;
  const e = fighters[1];
  let a = 1;
  if (e.hp < e.maxHp / 3 && e.potions > 0) a = 3;
  else if (random() < 0.25) a = 2;
  act(1, a, floor(random(0, 4)));
}
```

`random()` with nothing in the brackets is a number from 0 up to, but not reaching, 1, like the
`Math.random()` you have seen, so `random() < 0.25` is true about one time in four. `a` starts at 1, attack, and is only changed when one of the
other rules wins. The enemy uses exactly the same `act` as you do: the rules of a turn are
written once, for both sides.

**Do the choices matter?** They were measured: over 40 fights of the whole game, a hero who only
ever attacks won 14. A hero who drinks a potion when below about a third of their hp won 36.
