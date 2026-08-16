**Goal:** Apply all four techniques to a problem with no code in it, to see that computational thinking is a way of deciding what to do — not a way of programming.

## Step 1 — What a strong chess player actually does

To play well, a player has to:

- Understand the movement and strategic value of each piece, and how each controls the board.
- Visualise the layout, spot threats and opportunities, and plan several moves ahead.
- Recognise patterns from earlier games — common tactics and their counters — and build a flexible strategy.

None of that is programming. All of it is computational thinking.

## Step 2 — Name the techniques

| The player… | Technique |
|---|---|
| Dissects the game into components — the function of each piece, the state of the board | **Decomposition** |
| Recalls positions like this one from earlier games | **Pattern recognition** |
| Concentrates on the pieces that decide the outcome and sets less critical factors aside | **Abstraction** |
| Turns prior knowledge into a step-by-step approach for playing through the game | **Algorithmic thinking** |

The abstraction row is the interesting one. A strong player is not tracking all thirty-two pieces equally — they are tracking the four or five that matter in this position, and *deliberately not* tracking the rest. That is not laziness. It is the only way the position fits in a human head.

## Step 3 — The abstraction, made concrete

```js live plain
// The full board state is 64 squares. The abstraction is: which
// pieces actually bear on the decision in front of me?
let relevant = ["my queen", "their rook", "the pawn on e5"];
let ignoredForNow = 29;

console.log("tracking " + relevant.length + " pieces closely");
console.log("deliberately not tracking " + ignoredForNow);

for (let i = 0; i < relevant.length; i = i + 1) {
  console.log("  watching: " + relevant[i]);
}
```

Twenty-nine pieces set aside. They are still on the board and they still exist — the player has decided they do not change the move under consideration, which is 1.5.13's test applied under time pressure.

And if the position changes, a piece can move from `ignoredForNow` into `relevant` instantly. Abstraction is a choice made for a problem, not a permanent property of a piece.

## Step 4 — Why this example is in the book

Computers help us solve problems, but the problem and the shape of its solution have to be understood first. **Programming is the craft of telling a computer what to do. Computational thinking is how you decide what those instructions should be.**

If you ever set out to write a chess program, the questions above are exactly the ones you would have to settle before writing any code. The four techniques do not become relevant when you open an editor. They were the work.

## Key takeaways

- All four techniques apply to a problem containing no code at all.
- A strong player abstracts under time pressure — tracking few pieces on purpose.
- What is relevant changes with the position, not with the piece.
- Deciding what the instructions should be is a separate job from writing them.
