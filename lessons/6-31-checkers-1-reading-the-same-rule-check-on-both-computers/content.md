## The same rule check, on both computers

**Read before 6.31.2 Sub-build: Send a click.** About 8 minutes.

Everything about rooms is the same as in Trail, so reread 6.25.1 (Reading: One list of moves, two
computers) if you need to: `online.host()`, `online.join(code)`, `online.send(move)`,
`online.onMove((move, seat) => ...)` set up once in `setup()`, `online.status`, `online.seat`,
and the one rule, **send, then apply in onMove**. Your own move comes back to you too. This page
is only what is new for checkers.

**A move is four numbers.** In Trail a move was one roll. In checkers it is where a piece
starts and where it goes: the row and column it moves from, and the row and column it moves to.

```js
online.send({ fr: fr, fc: fc, tr: tr, tc: tc });
```

Four numbers fit easily in a move (6.25.1: numbers, true or false, and short words). Nothing else
is sent: not the grid, not whose turn it is. Each computer works those out for itself from the
moves, in order.

**Send instead of moving.** Where the click used to call `doMove`, it now hands the move to one
small function that decides: on one computer, do the move straight away; online, send it, and let
it come back through `onMove`.

```js
function play(fr, fc, tr, tc) {
  if (online.status === 'off') doMove(fr, fc, tr, tc);
  else online.send({ fr: fr, fc: fc, tr: tr, tc: tc });
}
```

**Check the move again when it arrives.** In Trail, `onMove` checked that a roll was a whole
number from 1 to 6. A checkers move has two checks. First, **a move must be four whole numbers on
the board; anything else is ignored.** A move comes from another computer, so it could hold a word
like `'2'`, a half like `3.5`, or nothing at all, and the rule functions only work on real squares.
The same `floor(r) === r` test from 6.25.1 does it:

```js
function goodMove(m) {
  if (m === null || m === undefined) return false;
  return isSquare(m.fr, m.fc) && isSquare(m.tr, m.tc);
}
function isSquare(r, c) { return floor(r) === r && floor(c) === c && onBoard(r, c); }
```

`floor('2') === '2'` is false, because the word `'2'` is not the number 2, so a word is ignored.
Second, the rules. Checkers already has a function that knows every rule: `isLegal`. Use the
same one in `onMove`, so the same rule check guards both computers.

```js
online.onMove((m, seat) => {
  if (goodMove(m) && seat === seatOf(turn) && winner === '' && isLegal(m.fr, m.fc, m.tr, m.tc)) {
    doMove(m.fr, m.fc, m.tr, m.tc);
  }
});
```

A move that is not four whole numbers on the board, a move from the wrong seat, a move after the
game is over, or a move that breaks a rule (a step backward, a jump over your own piece) is
ignored. Both computers run this check on the same list of moves, so both ignore the same bad
ones, and the boards stay the same. This is the payoff of putting every rule in one function on
day two: only the four-numbers check is new; the rules themselves needed nothing new.

**The host is red.** Seats are numbers and turns are letters, so one helper turns a colour into
its seat: the host, seat 0, plays red, and the classmate who joins, seat 1, plays black.

```js
function seatOf(t) { return t === 'r' ? 0 : 1; }
```

Only the seat whose turn it is may click: offline, anyone may; online, only when the room is
`'ready'` and `online.seat === seatOf(turn)`. That is a `myTurn()` like Trail's.

**Starting and ending.** H hosts with a fresh board, `newGame()` and then `online.host()`, as in
6.25.1. R starts again only on one computer (`online.status === 'off'`), because one board cannot
restart alone; online, the win message says "Run again to play again". To play again online, both
players stop and Run again, then only ONE of you presses H, and the other puts the NEW code in
`JOIN` and runs again. If both press H, you are in two different rooms, each waiting for the
other. Keep the words in the strip short enough to fit the 480 pixels of the canvas.
