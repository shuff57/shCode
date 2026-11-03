# Capstone sound check: 5.11.9 and 5.11.10 (beginner lens)
Session j-beginner, cookie dev_student=jbeginner, dev server :3002 (DEV_ROLE=student), commit eb59c5db. Lock ON.
STATUS: DONE

Route: 5.11.1-5.11.8 marked completed with POST /api/lesson-state (score 100) on the dev stub; not walked. Lock then open.

## 5.11.9 Lab: Sound effects (findings so far)
- Opens unlocked after 5.11.1-8 injected. Starter Run: 0/3, cards red with a hint under each ("Check the path letter by letter...").
- Taught reference (solution.js) injected: 3/3 green, no console errors, no loadSound/fetch errors. Held a real Space in the iframe: `zap.play()` fired once per shot (13 calls in 2.5 s, every ~200 ms = cooldown 12), buffer decoded (0.19 s), `blocked:false`, `error:null`, zap.volume 0.3, boom.rate 0.5. Steering over enemies: `boom` fired exactly once per kill (2 kills, score 20, 2 boom calls), never for an enemy reaching the base. M key: masterVolume 1 -> 0 -> 1.
- Variant (names pew/bang, double quotes, pew.play() in fire() after cooldown = 12, bang.play() inside hitEnemies' `if (!e.isAlive()) {...}` block, no M step): 3/3 green. Submit -> modal shows three Complete rows -> Confirm.

### Where the reading text appears (5.11.9)
- Right-hand tabs: CODY, Docs, Textures, Steps, Quest, File. `content.md` is NOT rendered anywhere on the page. It exists only as a file in the File tab; clicking it swaps the editor to show raw markdown (## and backticks, mis-highlighted as JS) and the Run button then does nothing useful until script.js is selected again.
- Step 1 says "`content.md`, in the File tab, says the same with a little more", so the pointer exists, but it is optional: the Steps panel teaches everything (loadSound, Sound object, load once in setup, .volume, .rate, play, the key-press rule, masterVolume). A student who never opens content.md loses nothing.
- Quest card r1 says "Help: the section 'A sound is an object you load' on this page". No such section is on the page; it is a heading inside content.md. Wrong pointer (should say "in content.md, File tab", or be dropped). Cards r2/r3 point at lessons 5.11.5 / 5.11.4 which is fine.
- Quest card text overflows the panel on the right: the path `loadSound('/moshion/assets/...` is cut off at the edge (cannot read `coin.wav')`) in the 5.11.9 panel.

### Taught-before-asked (5.11.9)
loadSound, Sound object, play, volume, rate, the click-or-key requirement for audio, and masterVolume are all defined in the step that asks for them. "autoplay" is never named; it is explained as "a browser makes no sound until the player has pressed a key", and step 2 says moSHion handles it and Space is the first key, so nothing is asked of the student. Optional M step is clear: says "Optional", gives the code, says "no check; the game is finished without it", and tells where to put it (next to the R line, outside `if (playing)`). Real behaviour confirmed (0 -> 1 toggle).
Minor: step 1 says "Under the scene's other `let` lines add `let zap, boom;`" then setup code, but gives no line number; the starter has the lets around line 105. Findable.
Minor: the name `boom` for a coin.wav at rate 0.5 will sound like a slow blip, not a boom; text says "slower and lower" honestly.

## 5.11.10 Challenges: Make it yours
- Step 1 says "Choose one of the three challenges on the page above." There is NOTHING above. No page text renders. The full challenge text (Challenge 1/2/3, with the difficulty and how-to) is only in content.md in the File tab, and 5.11.10 (unlike 5.11.9) never tells the student to open it. The only on-screen hint is the Quest card "Your rule is in the code", which names the three in one compressed sentence (best score kept across rounds / boss on every fifth wave this.wave % 5 === 0 / Ship class that owns this.cooldown), plus a link to 5.11.6. A student could attempt one from that, but the how-to (startRound must not reset best; boss 10 hp, half speed, purple; fire() returns a Bullet or null) is hidden in a file they are not told about. This is the biggest gap in this check.
- Hints under step 1/2 are present and fine. Step 2 asks for a // comment (no card for it; fine).
- Starter has no sound (grep of script.js: no loadSound/play). Neither the lesson text nor the step mentions sound, so a student who just finished 5.11.9 opens a silent game with no explanation that their 5.11.9 work is not carried over (each lesson has its own script.js). Not blocking, mildly surprising; one sentence would settle it ("this starter is the 5.11.6 game again; to keep your sounds, copy the lines from 5.11.9").
- Card turns green: injecting the reference solution (all three challenges) gave 1/1 "Passed", console clean. Did not test each challenge singly (step text says any one turns it green; the card description lists all three).

## Results per item
1. 5.11.9 everything needed on screen: PARTIAL pass. Steps panel, hints, cards present and sufficient; reading text only in File tab (as the builder said), stale "on this page" pointer in card r1, card text clipped.
2. Starter red / taught answer green: PASS (0/3 -> 3/3).
3. Real sound: PASS (zap play on every shot, buffer decoded, not blocked, no errors; boom once per kill).
4. Differently shaped answer: PASS (renamed vars, double quotes, play in fire() and in hitEnemies' kill block, no M).
5. Optional M step clear: PASS.
6. Terms taught before asked: PASS.
7. 5.11.10 challenges findable: FAIL-ish (step points at a page that has no such text).
8. One challenge turns card green: PASS (solution; not each singly).
9. 5.11.10 silent starter: not mentioned anywhere; minor confusion.

BLOCKERS: none (nothing is unfinishable).
CONFUSING: "challenges on the page above" (5.11.10 step 1); "on this page" in 5.11.9 card r1.
Verdict: clean for 5.11.9 sound behaviour. Biggest gap: 5.11.10 sends the student to text that is not on screen; either render content.md or say "open content.md in the File tab" as 5.11.9 does, or copy the three challenges into step 1.
Environment: session closed. Lock route used: POST /api/lesson-state for 5.11.1-8 (not walked); 5.11.9 completed via real Submit/Confirm.
