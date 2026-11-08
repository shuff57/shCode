## Two computers, one game

**Read before 6.25.2 Sub-build: Send and receive one number.** About 14 minutes.

When you play a classmate online, each computer runs its own copy of your sketch, with its own
`players` list. Nothing joins the two boards together except the moves. So the whole idea is one
rule: **one list of moves, applied in the same order on every computer, keeps the two boards the
same.** moSHion's `online` carries the moves.

| You write | What it does |
| --- | --- |
| `online.host()` | opens a room for 2; `online.code` becomes its room code (4 letters, like `'BHKE'`) |
| `online.host(n)` | opens a room for n players (2 to 4); testing it alone needs n tabs |
| `online.join(code)` | joins a classmate's room |
| `online.send(move)` | sends a move, like `{ roll: 4 }` |
| `online.onMove((move, seat) => { ... })` | runs for every move, in order, with the seat that sent it |
| `online.status` | `'off'`, `'connecting'`, `'waiting'` (room open, nobody else yet), `'ready'`, `'closed'` or `'error'` |
| `online.seat` | your seat: the host is 0, the classmate who joins is 1 |
| `online.error` | what went wrong, when `status` is `'error'` |

Set up `onMove` once, in `setup()`, never in `draw()`. Before you host or join, `online.code`
and `online.seat` hold nothing yet (`null`), so show "Press H to host" instead of them.

## Send, then apply in onMove

When it is your roll, **do not move your own token.** Send the roll, and move tokens only inside
`onMove`:

```js
online.onMove((move, seat) => takeTurn(move.roll));
// ...and where SPACE rolls the die:
online.send({ roll: floor(random(1, 7)) });
```

**Your own move comes back to you too.** Every move goes into one list, and both computers get
the whole list in the same order. So both run `takeTurn(4)` for your 4, then `takeTurn(2)` for
their 2. If you also moved your token straight away, it would move twice on your screen.

The die is why 6.23.1's `randomSeed(Date.now())` matters here as well: without it, both
computers would roll the very same numbers every game.

## Ignore a move that makes no sense

A move arrives from another computer, so check it before you use it. A move from a seat whose
turn it is not, or a roll that is not a whole number from 1 to 6, is ignored:

```js
online.onMove((move, seat) => {
  if (seat === turn && winner === -1 && goodRoll(move.roll)) takeTurn(move.roll);
});

function goodRoll(r) {
  return floor(r) === r && r >= 1 && r <= 6;
}
```

`floor(r) === r` is true only for a whole number. Because every computer runs the same check on
the same list of moves, every computer ignores the same bad ones, so the boards still agree.

## Only your seat rolls

Seats match the players list: seat 0 is `players[0]`, seat 1 is `players[1]`. So SPACE should
roll only when `online.seat === turn`. When you are not online (`online.status === 'off'`), let
whoever is at the keyboard roll, as before, so the game still works on one computer.

## Hosting, joining, and the end of a room

A key hosts, and **hosting starts a fresh game**, because the classmate who joins starts on
square 0. If you had played a few turns on your own first, your board and theirs would not match:

```js
if (kb.presses('h') && online.status === 'off') {
  newGame();
  online.host();
}
```

Your classmate puts your code in a line at the top of their sketch, `const JOIN = 'BHKE';`, and
runs it; `setup()` does `if (JOIN !== '') online.join(JOIN);`.

A room ends when the host runs the sketch again or leaves the page: the classmate's
`online.status` becomes `'closed'`. R cannot restart an online game on one computer alone (the
other board would not restart), so after a win, say "Run again and host a new room".

**The rules of a room.**

- You must be signed in and in a class. Rooms are for **classmates only**: someone who shares a
  class with you.
- A move is numbers, true or false, and short words. A word cannot have a space in it, and one
  move holds at most 24 letters of words in all. A sentence is refused on purpose: a move is not
  a chat.
- **To test alone,** open the lesson in a second browser tab. A seat is your account in one tab,
  so host in one tab, put the code in `JOIN` in the other, and Run.
