## Make it yours

Your Quest is complete: one `Fighter` class that makes every fighter, hits that go through
`takeHit`, a turn that passes and an enemy that waits its turn, guarding and potions, a run of
enemies made from data with a level up after each win, and a duel with a classmate on another
computer. Now change one thing of your own choosing. The editor starts from your finished game.

**Challenge 1: a fourth enemy (easy).**
Add a fourth kind to `KINDS`, after the Ogre, with numbers that make it the hardest yet. Because
the game asks `enemies.length` and never the number 3 (7.19.1), a fourth kind is a fourth fight
with no other change. Then give it something new: when the next enemy is the last one, the
level-up message says so.

**Challenge 2: a special move with a cooldown (medium).**
Key 4 is a power hit that does far more damage, but after you use it, it needs three of your turns
to come back. That is a count again (7.18.1): set to 3 when the move is used, down by 1 on each of
your turns, and the move only works when it is 0.

**Challenge 3: a shop that spends gold (hard).**
Each win earns gold, and on your turn key 5 buys a potion with it. That is a second count, kept in
a variable: it goes up in `fightOver`, and down when you buy, only when you have enough.

Whatever you pick, play the whole run afterwards, lose once, and check that R starts it again
cleanly. Online, the duel stays as it was: `goodMove` still lets only actions 1 to 3 through.
