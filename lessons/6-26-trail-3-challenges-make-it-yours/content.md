## Make it yours

Your Trail is complete: a board made from one line of text, two players taking turns with a die,
squares that jump, slide and wait, and a game that plays a classmate on another computer. Now
change one rule of your own choosing. The editor starts from your finished game.

**Challenge 1: three players (easy).**
Add a third player object in `newGame()`. The turn already passes with `% players.length`, so the
game takes three turns in a row without any other change. Draw the tokens with `s.x - 16 + p * 16`
and a diameter of 14 so three fit on one square. Online, `online.host(3)` (6.25.1) opens a room
for three; testing it alone needs three tabs.

**Challenge 2: a token that hops (medium).**
Walk the roll one square at a time: keep the roll in `hops`, and every 10 frames
(`frameCount % 10 === 0`) move the player one square and take one off `hops`. When `hops` is 0,
finish the turn: the letter, the win, the pass. Block SPACE while a token is hopping.

**Challenge 3: a new letter.**
Invent a square, such as `B` for "back to the start": a letter in `TRACK`, a colour in `COLORS`
and an `if` in `takeTurn`. Put it where a J or an S can never land on it (6.24.1).

Whatever you pick, play a whole game afterwards and check that R starts it again cleanly.
