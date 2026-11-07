## Read the square you landed on

**Read before 6.24.2 Sub-build: A square that does something.** About 10 minutes.

Every square remembers its letter as `kind` (6.22.2). After a token moves, ask what it is
standing on:

```js
const kind = path[p.at].kind;
```

Then one `if` per letter. The letter decides; the code only does what it says.

```js
if (kind === 'J') p.at = min(p.at + 3, last);
if (kind === 'S') p.at = max(p.at - 3, 0);
```

- **J jumps ahead 3.** `min` again keeps the token on the board.
- **S slides back 3.** `max(a, b)` is the bigger number, so `max(p.at - 3, 0)` never goes below
  square 0.
- A letter can also add to the words: `message += ', jumped ahead 3';` puts more on the end of
  the message.

To see the letters, write each one on its square in `drawBoard()`, but not the plain ones:

```js
if (s.kind !== '.') text(s.kind, s.x - 5, s.y + 6, 16, 'white');
```

## A wait is a flag

**W makes you miss your next turn.** That cannot happen now, while it is still your turn, so the
player remembers it. Give every player `waiting: false` in `newGame()`, and on a W:

```js
if (kind === 'W') p.waiting = true;
```

A true-or-false value kept for later is called a **flag**. It is checked when the turn passes:

```js
function nextTurn() {
  turn = (turn + 1) % players.length;
  if (players[turn].waiting) {
    players[turn].waiting = false;
    turn = (turn + 1) % players.length;
  }
}
```

If the new player is waiting, the flag is cleared and the turn passes once more. Clearing it
matters: leave it true and that player waits forever.

## Why the board is laid out this way

The rule reads the square once, after the move. So a J that jumped onto an S would just stop
there, and the players would think the S was broken. Look at the track: three squares
after every J and three squares before every S is a plain `.`. When you write your own track,
keep that rule.
