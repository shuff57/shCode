## Two computers, one game

**Read before 6.25.2 Sub-build: Send and receive one number.** About 12 minutes.

When you play a classmate online, each computer runs its own copy of your sketch, with its own
`players` list. Nothing joins the two boards together except the moves. So the whole idea is one
rule: **one list of moves, applied in the same order on every computer, keeps the two boards the
same.** moSHion's `online` carries the moves.

| You write | What it does |
| --- | --- |
| `online.host()` | opens a room; `online.code` becomes its 6-letter code |
| `online.join(code)` | joins a classmate's room |
| `online.send(move)` | sends a move, like `{ roll: 4 }` |
| `online.onMove((move, seat) => { ... })` | runs for every move, in order, with the seat that sent it |
| `online.status` | `'off'`, `'connecting'`, `'waiting'` (room open, nobody else yet), `'ready'`, `'closed'` or `'error'` |
| `online.seat` | your seat: the host is 0, the classmate who joins is 1 |
| `online.error` | what went wrong, when `status` is `'error'` |

Set up `onMove` once, in `setup()`, never in `draw()`.

## Send, then apply in onMove

When it is your roll, **do not move your own token.** Send the roll, and move tokens only inside
`onMove`:

```js
online.onMove((move, seat) => takeTurn(move.roll));
// ...and when SPACE is pressed:
online.send({ roll: floor(random(1, 7)) });
```

**Your own move comes back to you too.** Every move goes into one list, and both computers get
the whole list in the same order. So both run `takeTurn(4)` for your 4, then `takeTurn(2)` for
their 2. If you also moved your token straight away, it would move twice on your screen.

## Only your seat rolls

Seats match the players list: seat 0 is `players[0]`, seat 1 is `players[1]`. So SPACE should
roll only when `online.seat === turn`. When you are not online (`online.status === 'off'`), let
whoever is at the keyboard roll, as before, so the game still works on one computer.

## Hosting and joining

A key hosts: `if (kb.presses('h') && online.status === 'off') online.host();`. Your classmate puts
your code in a line at the top of their sketch, `const JOIN = 'K7QX2M';`, and runs it; `setup()`
does `if (JOIN !== '') online.join(JOIN);`.

**The rules of a room.**

- You must be signed in and in a class. Rooms are for **classmates only**: someone who shares a
  class with you.
- A move is numbers, true or false, and short words (20 letters at most). A sentence is refused
  on purpose: a move is not a chat.
- **To test alone,** open the lesson in a second browser tab. A seat is your account in one tab,
  so host in one tab, put the code in `JOIN` in the other, and Run.
