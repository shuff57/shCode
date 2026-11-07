## A die

**Read before 6.23.2 Sub-build: One die, two turns.** About 10 minutes.

`random(1, 7)` gives a number from 1 up to, but never reaching, 7: something like `4.83`.
`floor` cuts off the fraction, so `floor(random(1, 7))` is a whole number from 1 to 6, each one
as likely as the others. **Why 7?** The top number is never reached. `floor(random(1, 6))` can
never roll a 6.

**A fresh start on every Run.** In 5.2.2 you saw that moSHion's `random` starts over each time
you press Run, so the first roll is the same every Run, and so is the second. That makes a bug
easy to repeat, but a board game where every game rolls the same numbers is no game at all. So
a board game starts the die from a different place each Run, once, in `setup()`:

```js
randomSeed(Date.now());
```

`Date.now()` is the time right now, counted in thousandths of a second, so it is different every
time you press Run. `randomSeed` tells `random` where to start from.

## Players are a list

Each player is an object that remembers its own name, colour and square:

```js
players = [
  { name: 'Red', color: 'tomato', at: 0 },
  { name: 'Blue', color: 'dodgerblue', at: 0 },
];
```

Drawing them is a loop, like the board. `path[players[p].at]` is the square under player p, and
`p * 20` shifts each token sideways so two on one square both show:

```js
for (let p = 0; p < players.length; p++) {
  const s = path[players[p].at];
  fill(players[p].color);
  circle(s.x - 10 + p * 20, s.y + 14, 18);
}
```

## Whose turn it is

`turn` is an index into the list: 0 is Red, 1 is Blue, and `players[turn]` is the player whose
turn it is. Passing the turn is one line:

```js
turn = (turn + 1) % players.length;
```

`%` is the remainder after dividing. With two players, 0 becomes 1, and 1 becomes `2 % 2`, which
is 0 again. The same line works for three or four players.

## One function does a whole turn

```js
function takeTurn(r) {
  const p = players[turn];
  const last = path.length - 1;
  p.at = min(p.at + r, last);
  message = p.name + ' rolled ' + r;
  if (p.at === last) {
    winner = turn;
    message = p.name + ' wins! Press R to play again';
    return;
  }
  nextTurn();
}

function nextTurn() {
  turn = (turn + 1) % players.length;
}
```

- `p` is not a copy. It is the same object that sits in the list, so `p.at = ...` moves that
  player.
- `min(a, b)` gives the smaller number. From square 28, a roll of 5 would be square 33, which is
  not on the board; `min(33, 30)` stops the token on the last square instead.
- `return` leaves the function early, so the winner keeps the turn and nothing else happens.

SPACE calls `takeTurn(floor(random(1, 7)))` only while `winner === -1` (nobody has won yet), and
R calls a `newGame()` that puts every player back on square 0. `takeTurn` takes the roll as a
number on purpose: on day four the roll will come from another computer, and `takeTurn` will not
change at all.
