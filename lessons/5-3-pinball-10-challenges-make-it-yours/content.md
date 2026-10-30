## Make it yours

Your game is complete: a table, a goal, a score that counts events, an end, and a restart. Now change one rule of your own choosing. Pick any of these, or invent one.

**Challenge 1 — a second goal (easy).**
Add a second goal worth more than the first. Give each goal its own value, the same way the bumpers in 5.3.7 each had a `worth`.

**Challenge 2 — a bumper that moves (medium).**
Make one bumper slide left and right. A static sprite does not move, so this one must be dynamic — give it a low `bounciness` and set its velocity, and it will keep going until something stops it.

**Challenge 3 — your best score (hard).**
A restart wipes the score, which is right. But the best score should survive it. Keep a second variable that is *not* reset when R is pressed, update it when the score beats it, and show it beside the current score.

Whatever you pick, the game must still be playable from a fresh start: press R and everything that belongs to a round goes back.
