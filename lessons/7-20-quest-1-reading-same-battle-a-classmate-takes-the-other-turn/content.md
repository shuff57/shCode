## Same battle, a classmate takes the other turn

**Read before 7.20.2 Sub-build: Send an action.** About 8 minutes.

Everything about rooms is the same as in Trail and Checkers, so reread 6.25.1 (Reading: One list
of moves, two computers) and 6.31.1 (Reading: The same rule check, on both computers) if you need
to: `online.host()`, `online.join(code)`, `online.send(move)`, `online.onMove((move, seat) => ...)`
set up once in `setup()`, `online.status`, `online.seat`, and the one rule, **send, then apply in
onMove**. Your own move comes back to you too. This page is only what is new for Quest.

**A duel, not a campaign.** Online, there is no computer enemy: two heroes face each other, Red
(the host, seat 0, `fighters[0]`) and Blue (the classmate who joins, seat 1, `fighters[1]`). Both
start fresh, with the same numbers, so it is a fair fight. A flag, `duel`, says which game this is,
and `newGame()` makes one or the other:

```js
if (duel) {
  fighters = [new Fighter('Red', 30, 3, 2, 'tomato'), new Fighter('Blue', 30, 3, 2, 'dodgerblue')];
} else {
  ...the run of enemies, as in 7.19.3...
}
```

Seats and turns are the same numbers here (seat 0 plays turn 0), so no `seatOf` is needed.

**The same act.** A turn in a duel is exactly a turn in the campaign: `act(t, a, roll)` from
7.18.1. Nothing about attacking, guarding or potions changes. What changes is only WHERE `act` is
called: in a duel, never on the spot, always in `onMove`.

**A move is `{ act, roll }`, and the sender rolls.** If each computer rolled its own dice when the
move arrived, Red's computer might roll a 3 and Blue's a 0, and the two hp bars would stop
agreeing. So the player who chooses also rolls, once, and sends the roll with the action:

```js
function choose(a) {
  const roll = floor(random(0, 4));
  if (duel) online.send({ act: a, roll: roll });
  else act(turn, a, roll);
}
```

Both computers then run `act` with the very same two numbers, in the same order, and get the same
fight. Offline, `choose` does what it always did.

**Check the move when it arrives.** As in 6.31.1, a move from another computer could hold
anything. **A Quest move must be two whole numbers: an action from 1 to 3 and a roll from 0 to 3;
anything else is ignored.** `[1, 2, 3].includes(x)` (3.7.19) is true only when `x` is one of
those numbers, and the word `'1'` is not the number 1, so a word is ignored too:

```js
function goodMove(m) {
  return m !== null && typeof m === 'object' &&
    [1, 2, 3].includes(m.act) && [0, 1, 2, 3].includes(m.roll);
}
```

`typeof m === 'object'` comes first, because `m.act` on a move that is `null` would stop
the sketch. Then the handler only acts for the seat whose turn it is, while the duel is on:

```js
online.onMove((m, seat) => {
  if (duel && !over && seat === turn && goodMove(m)) act(turn, m.act, m.roll);
});
```

A key pressed out of turn, a move after the duel is over, or a broken move is ignored on both
computers, so both stay alike.

**Only your seat chooses.** `myTurn()`: offline it is `turn === 0`, as before; in a duel it is true
only when the room is `'ready'` and `online.seat === turn`. The key block asks `myTurn()` instead
of `turn === 0`. And there is no `after(45, enemyTurn)` in a duel: the other turn is your
classmate's, and it arrives through `onMove`.

**Starting and ending.** H hosts a duel: `duel = true;`, `newGame();`, `online.host();`, as in
6.25.1. A JOIN code does the same in `setup()` with `online.join(JOIN)`. R starts again only
offline; in a duel the win message says `Run again to play again`, and to duel again ONE player
presses H and the other puts the NEW code in `JOIN`. Show the room code big, at size 18, so it is
easy to read and type, and keep every line inside the 480 pixels of the canvas.
