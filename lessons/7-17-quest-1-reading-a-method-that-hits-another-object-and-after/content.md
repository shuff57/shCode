## One object hits another

**Read before 7.17.2 Sub-build: One object hits another.** About 12 minutes.

In 7.3.10 (Reading: A parameter that is another object) a method was handed a whole second
object, and in 7.3.12 you wrote `hit(other)`. Quest's fight is exactly that, twice: the hero hits
the goblin, the goblin hits the hero. Two small methods on `Fighter` do all of it.

**Taking a hit.** 7.3.8 gave `takeHit` a floor at zero, so hp never goes below 0. `max(a, b)` is
the bigger of two numbers (6.24.1), so `max(this.hp - n, 0)` is the new hp, or 0 if that would
be less:

```js
takeHit(n) {
  this.hp = max(this.hp - n, 0);
  return n;
}
```

Why `return n`? So whoever asked can say how hard the hit was. Today the answer is just `n`,
the size of the hit it was handed. It is the size of the hit even when hp stops at 0: a hit of 7
on a goblin with 3 hp left still says `for 7`. On day three, guarding will make the hit smaller,
and only `takeHit` will know by how much, so it is the one that answers.

**Hitting another fighter.** An attack is this fighter's `power` plus a small roll of luck:

```js
attack(target, roll) {
  return target.takeHit(this.power + roll);
}
```

`this` is the fighter who attacks and `target` is the one being hit. `hero.attack(goblin, 2)`
and `goblin.attack(hero, 2)` mean opposite things, as in 7.3.10. Notice that `attack` never
touches `target.hp` itself: it asks the target to take the hit, and the target's own `takeHit`
keeps the floor. Every hit in the game goes through that one method, so the rule "never below
0" is written once.

`attack` hands back what `takeHit` handed back, so one line can hit AND write the message:

```js
message = me.name + ' hits ' + them.name + ' for ' + me.attack(them, roll);
```

## The roll

A die in 6.23.1 was `floor(random(1, 7))`: `random(a, b)` gives a number from `a` up to, but
not including, `b`, and `floor` drops the part after the point. A roll of 0 to 3 is the same
idea: `floor(random(0, 4))` is 0, 1, 2 or 3. With power 3, a hit does 3 to 6. Put
`randomSeed(Date.now());` in `setup()`, as in 6.23.1, so every Run is a different fight.

## Whose turn it is

`turn` is 0 or 1: `fighters[turn]` is the fighter whose turn it is, and `fighters[1 - turn]`
is the other one. With two players, `1 - turn` is the other number: `1 - 0` is 1 and `1 - 1`
is 0. So passing the turn is one line:

```js
turn = 1 - turn;
```

It does the same as 6.23.1's `turn = (turn + 1) % players.length` when there are two players.
One function does a whole attack turn for either fighter:

```js
function attackTurn(t, roll) {
  const me = fighters[t];
  const them = fighters[1 - t];
  message = me.name + ' hits ' + them.name + ' for ' + me.attack(them, roll);
  if (!them.isAlive()) {
    fightOver(t);
    return;
  }
  turn = 1 - turn;
  if (turn === 1) after(45, enemyTurn);
}
```

Look at the order. The hit happens first; then, if the one who was hit has no hp left, the fight
is over and the turn does not pass (`return` leaves the function there). Only a fight that goes
on passes the turn.

## after(): the enemy waits its turn

On your turn you press 1, and `kb.presses('1')` (6.15.2) is true for one frame. If the enemy
hit back in that same frame, its message would replace yours before you could read it, and the
two hp bars would drop at once. So the enemy waits.

**`after(frames, fn)` runs the function `fn` once, that many frames later.** You met it in a
6.21.3 challenge. 60 frames is about a second, so `after(45, enemyTurn)` is about three
quarters of a second. In the meantime the sketch keeps running: `draw()` still draws every
frame, and your message stays up.

```js
function enemyTurn() {
  if (over || turn !== 1) return;
  attackTurn(1, floor(random(0, 4)));
}
```

Two details matter:

- Write `after(45, enemyTurn)`, with **no** `()` after `enemyTurn`. `enemyTurn()` would run the
  enemy's turn right now and hand `after` its answer. Without the brackets you hand `after` the
  function itself, to run later. A function with no name works too, as in the sub-build:
  `after(45, () => { ... })`, the same `=>` shape as 6.25.1's `onMove`.
- `enemyTurn` checks before it acts. By the time it runs, the game might be over, or a new game
  might have started. `if (over || turn !== 1) return;` makes a late enemy turn do nothing.

## The end, and R

A fight is over when either fighter has no hp left. `over` is `true` from then on, so 1 does
nothing, and R starts again:

```js
function fightOver(winner) {
  over = true;
  if (winner === 0) message = 'You beat the ' + fighters[1].name + '! Press R to play again';
  else message = 'The ' + fighters[1].name + ' beat you. Press R to try again';
}
```

and in `draw()`: `if (kb.presses('r') && over) newGame();`. `newGame()` makes two fresh fighters,
so both are back at full hp, and sets `turn = 0`, `over = false` and the first message.
