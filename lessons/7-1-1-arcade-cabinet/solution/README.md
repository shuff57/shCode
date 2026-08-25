# Salvage Run

## The pitch

A wrecked freighter is shedding cargo over an ocean, and you fly the salvage
collector underneath it. Crates fall in three kinds — supply, medical and
fuel — and the rarer a crate is, the faster it falls and the more it is
worth. You win by banking the highest score the cabinet has ever seen; the
game remembers it between sessions, so the thing you are really playing
against is whoever sat here last. You lose when three crates hit the water.
There is no timer and no level: the run ends when you get careless.

## How to play

`a` / `d` (or the arrow keys) fly the collector left and right. `enter`
launches a run from the title and returns you to the title afterwards. `p`
pauses and unpauses.

Catching a crate while your score is already 3 or more doubles what that
crate is worth, so a good run compounds — the first few catches are worth
little and the decision to chase a fast fuel crate gets more tempting the
better you are doing.

## What is where

`script.js` holds the whole game. Reading order that will make sense:

- `CRATE_KINDS` at the top is the data the game is built from. Adding a
  fourth kind of crate is a one-line edit and nothing below it changes.
- `class Crate` wraps a sprite with the things the game cares about — which
  kind it is, whether it has been counted, whether it has escaped.
- `scoreFor()` and `pickKind()` are the only two places a wrong number would
  be invisible on screen, which is why they are the two things the tests at
  the bottom check.
- `draw()` is a `switch` over four states: title, play, paused, gameover.

## Tests

Open the console and you will see three `PASS` lines when the game starts.
They cover face-value scoring, the combo bonus, and that the rarest crate is
actually the rare one. They run at startup rather than on a key press so a
broken build announces itself before I have played a single round.

## What I would do next

The collector has no acceleration — it goes from stopped to full speed in one
frame, which makes it feel like a cursor rather than a ship. Giving it a
velocity it eases toward would cost about four lines and change the feel of
the whole game. I ran out of time to tune the numbers that would need.
