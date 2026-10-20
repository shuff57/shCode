// The "Plain English to Pseudocode" labs replaced the Chart-the-Code activities
// (5.4.6 and 3.7.5 / 3.7.16 so far). A student types numbered pseudocode into
// README.md and six regex requirements grade it, no model call. For each lab
// this proves, offline:
//   - the starter README.md passes nothing (a target must not equal the starter);
//   - the reference (solution/README.md) passes every requirement;
//   - a lower-case, differently spaced version of the reference still passes;
//   - each classic mistake fails exactly the requirement it is about, and no other.
// Run: node scripts/test-pseudocode-labs.mjs   (also part of `npm test`)

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
let n = 0;
const check = (ok, msg) => { n++; if (!ok) { failures++; console.log('  FAIL  ' + msg); } };

const lines = (...l) => l.join('\n') + '\n';

// Every mutation: the text the student types and the ONE requirement that must go red.
const LABS = {
  '5-3-20a-chart-the-method-chain': {
    frame: (body) => lines('takeDamage(amount) starts', body, 'back to the caller'),
    muts: [
      ['flashRed inside the IF', ['r5'], lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die', '4.   CALL flashRed', '5. END IF')],
      ['die outside the IF', ['r4'], lines('1. SET health TO health - amount', '2. CALL die', '3. IF health <= 0', '4. END IF', '5. CALL flashRed')],
      ['a third CALL', ['r6'], lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die', '4. END IF', '5. CALL flashRed', '6. CALL removeSprite')],
      ['flipped test: health > 0', ['r3'], lines('1. SET health TO health - amount', '2. IF health > 0', '3.   CALL die', '4. END IF', '5. CALL flashRed')],
      ['health == 0 only', ['r3'], lines('1. SET health TO health - amount', '2. IF health == 0', '3.   CALL die', '4. END IF', '5. CALL flashRed')],
      ['two IFs', ['r3'], lines('1. SET health TO health - amount', '2. IF health <= 0', '3. IF health < 5', '4.   CALL die', '5. END IF', '6. CALL flashRed')],
      ['not numbered', ['r1'], lines('SET health TO health - amount', 'IF health <= 0', '  CALL die', 'END IF', 'CALL flashRed')],
    ],
    lower: lines('1. set health to health - amount', '2. if health is 0 or less', '3.   call die', '4. end if', '5. call flashRed'),
    ok: [
      ['CALL this.die / this.flashRed', lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL this.die', '4. END IF', '5. CALL this.flashRed')],
      ['health -= amount', lines('1. SET health -= amount', '2. IF health <= 0', '3.   CALL die', '4. END IF', '5. CALL flashRed')],
      ['END  IF with two spaces', lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die', '4. END  IF', '5. CALL flashRed')],
      ['ENDIF as one word', lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die', '4. ENDIF', '5. CALL flashRed')],
      ['a comment that says sprite', lines('1. SET health TO health - amount', '2. IF health <= 0', '3.   CALL die (removes the sprite)', '4. END IF', '5. CALL flashRed')],
      ['blank lines between steps', lines('1. SET health TO health - amount', '', '2. IF health <= 0', '', '3.   CALL die', '', '4. END IF', '', '5. CALL flashRed')],
    ],
  },
  '3-7-5-chart-map-trace': {
    frame: (body) => lines('START', body, 'END'),
    muts: [
      ['print inside the loop', ['r6'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4.   OUTPUT withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['only a print inside the loop', ['r5', 'r6'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4.   OUTPUT withTax', '5. END FOR')],
      ['add after the loop, not inside it', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3. END FOR', '4. ADD price * 1.08 TO withTax', '5. OUTPUT withTax')],
      ['list never started', ['r2'], lines('1. DO NOTHING YET', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['no END FOR', ['r3', 'r5', 'r6'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. OUTPUT withTax', '5. KEEP GOING')],
      ['divides instead of multiplying', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price / 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['adds a name the loop never made', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH x IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['a second END FOR', ['r3'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. END FOR', '6. OUTPUT withTax')],
      ['nothing printed at all', ['r5'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. SET done TO true')],
      ['adds the untaxed price', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price TO withTax', '4. END FOR', '5. OUTPUT withTax')],
    ],
    lower: lines('1. set withTax to a new empty array', '2. for each price in prices', '3.   push price * 1.08 to withTax', '4. end for', '5. print withTax'),
    ok: [
      ['RETURN instead of OUTPUT', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. RETURN withTax')],
      ['END FOR EACH as the closer', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR EACH', '5. OUTPUT withTax')],
      ['ENDFOR in one word', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. ENDFOR', '5. OUTPUT withTax')],
      ['SET withTax TO the array []', lines('1. SET withTax TO the array []', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['SET withTax TO withTax + price * 1.08', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   SET withTax TO withTax + price * 1.08', '4. END FOR', '5. OUTPUT withTax')],
      ['FOR EACH price OF the prices', lines('1. SET withTax TO an empty list', '2. FOR EACH price OF the prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['blank lines between steps', lines('1. SET withTax TO an empty list', '', '2. FOR EACH price IN prices', '', '3.   ADD price * 1.08 TO withTax', '', '4. END FOR', '', '5. OUTPUT withTax')],
    ],
  },
  '3-7-16-chart-spread-vs-rest': {
    frame: (body) => lines('total(...numbers) starts', body, 'back to the caller'),
    muts: [
      ['return inside the loop', ['r6'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4.   RETURN sum', '5. END FOR', '6. RETURN sum')],
      ['only a return inside the loop', ['r5', 'r6'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4.   RETURN sum', '5. END FOR')],
      ['sum never started at 0', ['r2'], lines('1. DO NOTHING YET', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['add outside the loop', ['r4'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3. END FOR', '4. SET sum TO sum + number', '5. RETURN sum')],
      ['counts instead of adds', ['r4'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + 1', '4. END FOR', '5. RETURN sum')],
      ['adds a name the loop never made', ['r4'], lines('1. SET sum TO 0', '2. FOR EACH n IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['nothing returned at all', ['r5'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. SET done TO true')],
      ['loops over the wrong list', ['r3'], lines('1. SET sum TO 0', '2. FOR EACH number IN scores', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
    ],
    lower: lines('1. set sum = 0', '2. for each n in numbers', '3.   add n to sum', '4. end for', '5. return sum'),
    ok: [
      ['OUTPUT instead of RETURN', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. OUTPUT sum')],
      ['give back sum', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. give back sum')],
      ['sum plus number', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum plus number', '4. END FOR', '5. RETURN sum')],
      ['sum += number', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   sum += number', '4. END FOR', '5. RETURN sum')],
      ['Start sum at 0', lines('1. Start sum at 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
    ],
  },
'6-6-13a-chart-the-state-machine': {
    frame: (body) => lines('draw() runs', body, 'end of frame'),
    muts: [
      ['draws after the check, not before', ['r3'], lines('1. IF state is "title"', '2.   IF space is pressed', '3.     SET state TO "play"', '4.   END IF', '5.   CALL drawTitle', '6. ELSE IF state is "play"', '7.   CALL updateGame', '8.   IF playerDead', '9.     SET state TO "gameover"', '10.  END IF', '11. ELSE IF state is "gameover"', '12.  CALL drawGameOver', '13.  IF r is pressed', '14.    SET state TO "title"', '15.  END IF', '16. END IF')],
      ['three separate IFs, no chain', ['r2'], lines('1. IF state is "title"', '2.   CALL drawTitle', '3.   IF space is pressed', '4.     SET state TO "play"', '5.   END IF', '6. END IF', '7. IF state is "play"', '8.   CALL updateGame', '9.   IF playerDead', '10.    SET state TO "gameover"', '11.  END IF', '12. END IF', '13. IF state is "gameover"', '14.  CALL drawGameOver', '15.  IF r is pressed', '16.    SET state TO "title"', '17.  END IF', '18. END IF')],
      ['a state change that jumps', ['r6'], lines('1. IF state is "title"', '2.   CALL drawTitle', '3.   IF space is pressed', '4.     SET state TO "play"', '5.     GO TO step 6', '6.   END IF', '7. ELSE IF state is "play"', '8.   CALL updateGame', '9.   IF playerDead', '10.    SET state TO "gameover"', '11.  END IF', '12. ELSE IF state is "gameover"', '13.  CALL drawGameOver', '14.  IF r is pressed', '15.    SET state TO "title"', '16.  END IF', '17. END IF')],
      ['gameover goes to the wrong state', ['r5'], lines('1. IF state is "title"', '2.   CALL drawTitle', '3.   IF space is pressed', '4.     SET state TO "play"', '5.   END IF', '6. ELSE IF state is "play"', '7.   CALL updateGame', '8.   IF playerDead', '9.     SET state TO "gameover"', '10.  END IF', '11. ELSE IF state is "gameover"', '12.  CALL drawGameOver', '13.  IF r is pressed', '14.    SET state TO "play"', '15.  END IF', '16. END IF')],
    ],
    ok: [['spacebar, dies, = and a restart note', lines('1. IF state is "title"', '2.   CALL drawTitle', '3.   IF spacebar is pressed', "4.     SET state = 'play'", '5.   END IF', '6. ELSE IF state is "play"', '7.   CALL updateGame', '8.   IF the player dies', '9.     SET state TO "gameover"', '10.  END IF', '11. ELSE IF state is "gameover"', '12.  CALL drawGameOver', '13.  IF r is pressed (restart)', '14.    SET state TO "title"', '15.  END IF', '16. END IF')]],
    lower: lines('1. if state == "title"', '2.   call drawTitle', '3.   if space is pressed', '4.     set state to "play"', '5.   end if', '6. else if state == "play"', '7.   call updateGame', '8.   if the player is dead', '9.     set state to "gameover"', '10.  end if', '11. else if state == "gameover"', '12.  call drawGameOver', '13.  if r is pressed', '14.    set state to "title"', '15.  end if', '16. end if'),
  },
  '6-7-21a-chart-the-slingshot': {
    frame: (body) => lines('draw() runs', body, 'end of frame'),
    muts: [
      ['applyForce on the stretch path', ['r4'], lines('1. IF mouse presses AND ball is hovered', '2.   SET held TO true', '3. END IF', '4. IF held AND mouse is pressing', '5.   SET ball position TO the mouse', '6.   CALL drawBand', '7.   CALL applyForce', '8. END IF', '9. IF held AND mouse is released', '10.  SET held TO false', '11. END IF')],
      ['released test not guarded by held', ['r4'], lines('1. IF mouse presses AND ball is hovered', '2.   SET held TO true', '3. END IF', '4. IF held AND mouse is pressing', '5.   SET ball position TO the mouse', '6.   CALL drawBand', '7. END IF', '8. IF mouse is released', '9.   CALL applyForce', '10.  SET held TO false', '11. END IF')],
      ['held never set', ['r2'], lines('1. IF mouse presses AND ball is hovered', '2.   CALL playSound', '3. END IF', '4. IF held AND mouse is pressing', '5.   SET ball position TO the mouse', '6.   CALL drawBand', '7. END IF', '8. IF held AND mouse is released', '9.   CALL applyForce', '10.  SET held TO false', '11. END IF')],
      ['no band drawn', ['r3'], lines('1. IF mouse presses AND ball is hovered', '2.   SET held TO true', '3. END IF', '4. IF held AND mouse is pressing', '5.   SET ball position TO the mouse', '6.   CALL playSound', '7. END IF', '8. IF held AND mouse is released', '9.   CALL applyForce', '10.  SET held TO false', '11. END IF')],
    ],
    ok: [['mouse is pressed / let go, MOVE the ball', lines('1. IF mouse presses AND ball is hovered', '2.   SET held TO true', '3. END IF', '4. IF held AND mouse is pressed', '5.   MOVE ball TO the mouse', '6.   CALL drawBand', '7. END IF', '8. IF held AND mouse is let go', '9.   CALL applyForce', '10.  SET held TO false', '11. END IF')]],
    lower: lines('1. if mouse presses and the ball is hovered', '2.   set held to true', '3. end if', '4. if held and mouse is pressing', '5.   set ball position to the mouse', '6.   call drawBand', '7. end if', '8. if held and mouse is released', '9.   set force to the pull times POWER', '10.  call applyForce', '11.  set held to false', '12. end if'),
  },
  '6-6-19a-fix-the-pause-chart': {
    frame: (body) => lines('draw() runs', body, 'end of frame'),
    starterRed: ['r1', 'r2', 'r3', 'r4'],
    muts: [
      ['fixed the ELSE but left the GO TO', ['r3'], lines('1. IF state is "play"', '2.   CALL updateGame', '3.   IF p is pressed', '4.     SET state TO "paused"', '5.     GO TO step 4', '6.   END IF', '7. ELSE', '8.   CALL drawPauseScreen', '9.   IF p is pressed', '10.    SET state TO "play"', '11.  END IF', '12. END IF')],
      ['ELSE hung on the wrong IF', ['r1'], lines('1. IF state is "play"', '2.   CALL updateGame', '3.   IF p is pressed', '4.     SET state TO "paused"', '5.   ELSE', '6.     CALL drawPauseScreen', '7.     IF p is pressed', '8.       SET state TO "play"', '9.     END IF', '10.  END IF', '11. END IF')],
      ['REPEAT step 4 as the jump', ['r3'], lines('1. IF state is "play"', '2.   CALL updateGame', '3.   IF p is pressed', '4.     SET state TO "paused"', '5.     REPEAT step 4', '6.   END IF', '7. ELSE', '8.   CALL drawPauseScreen', '9.   IF p is pressed', '10.    SET state TO "play"', '11.  END IF', '12. END IF')],
      ['ELSE after the outer END IF', ['r1'], lines('1. IF state is "play"', '2.   CALL updateGame', '3.   IF p is pressed', '4.     SET state TO "paused"', '5.   END IF', '6. END IF', '7. ELSE', '8.   CALL drawPauseScreen', '9.   IF p is pressed', '10.    SET state TO "play"', '11.  END IF')],
      ['updateGame only on the paused branch', ['r6'], lines('1. IF state is "play"', '2.   IF p is pressed', '3.     SET state TO "paused"', '4.   END IF', '5. ELSE', '6.   CALL updateGame', '7.   CALL drawPauseScreen', '8.   IF p is pressed', '9.     SET state TO "play"', '10.  END IF', '11. END IF')],
      ['paused but no way out', ['r4'], lines('1. IF state is "play"', '2.   CALL updateGame', '3.   IF p is pressed', '4.     SET state TO "paused"', '5.   END IF', '6. ELSE', '7.   CALL drawPauseScreen', '8. END IF')],
      ['pause screen left floating', ['r2'], lines('1. IF state is "play"', '2.   CALL updateGame', '3.   IF p is pressed', '4.     SET state TO "paused"', '5.   END IF', '6. ELSE', '7.   IF p is pressed', '8.     SET state TO "play"', '9.   END IF', '10. END IF', '11. CALL drawPauseScreen')],
    ],
    ok: [['OTHERWISE instead of ELSE', lines('1. IF state is "play"', '2.   CALL updateGame', '3.   IF p is pressed', '4.     SET state TO "paused"', '5.   END IF', '6. OTHERWISE', '7.   CALL drawPauseScreen', '8.   IF p is pressed', '9.     SET state TO "play"', '10.  END IF', '11. END IF')]],
    lower: lines('1. if state is "play"', '2.   call updateGame', '3.   if p is pressed', '4.     set state to "paused"', '5.   end if', '6. else', '7.   call drawPauseScreen', '8.   if p is pressed', '9.     set state to "play"', '10.  end if', '11. end if'),
  },
  '6-7-10a-fix-the-drag-chart': {
    frame: (body) => lines('draw() runs', body, 'end of frame'),
    starterRed: ['r1', 'r2', 'r3'],
    muts: [
      ['fixed the release path but left the GO TO', ['r3'], lines('1. IF mouse is pressing', '2.   IF sprite is under the mouse', '3.     SET sprite position TO the mouse', '4.     GO TO step 3', '5.   END IF', '6. ELSE', '7.   SET velocity TO zero', '8. END IF')],
      ['ELSE on the inner IF', ['r1'], lines('1. IF mouse is pressing', '2.   IF sprite is under the mouse', '3.     SET sprite position TO the mouse', '4.   ELSE', '5.     SET velocity TO zero', '6.   END IF', '7. END IF')],
      ['REPEAT step 3 as the jump', ['r3'], lines('1. IF mouse is pressing', '2.   IF sprite is under the mouse', '3.     SET sprite position TO the mouse', '4.     REPEAT step 3', '5.   END IF', '6. ELSE', '7.   SET velocity TO zero', '8. END IF')],
      ['velocity zeroed while still dragging', ['r2'], lines('1. IF mouse is pressing', '2.   IF sprite is under the mouse', '3.     SET sprite position TO the mouse', '4.     SET velocity TO zero', '5.   END IF', '6. ELSE', '7.   CALL idle', '8. END IF')],
      ['velocity box still floating', ['r1', 'r2'], lines('1. IF mouse is pressing', '2.   IF sprite is under the mouse', '3.     SET sprite position TO the mouse', '4.   END IF', '5. END IF', '6. SET velocity TO zero')],
    ],
    lower: lines('1. if mouse is pressing', '2.   if the sprite is under the mouse', '3.     set sprite position to the mouse', '4.   end if', '5. else', '6.   set velocity to 0', '7. end if'),
  },
  '4-1-3a-a4-1-0-design-chart': {
    frame: (body) => lines('START', body, 'END'),
    noChart: true,
    muts: [
      ['fewer than ten steps', ['r1', 'r2'], lines('1. CALL loadQueue', '2. IF a saved queue was found', '3. ELSE', '4. CALL sortByPriority', '5. FOR EACH order IN queue', '6.   CALL priceOf', '7. END FOR', '8. CALL saveQueue', '9. OUTPUT the verdict line')],
      ['over nineteen steps', ['r1'], lines(...Array.from({ length: 20 }, (_, i) => `${i + 1}. CALL loadQueue`), '21. IF a saved queue was found', '22. ELSE', '23. END IF', '24. FOR EACH order IN queue', '25.   CALL sortByPriority', '26. END FOR', '27. CALL saveQueue', '28. OUTPUT the verdict line')],
      ['an empty loop', ['r3'], lines('1. CALL loadQueue', '2. IF a saved queue was found', '3.   SET queue TO the saved queue', '4. ELSE', '5.   SET queue TO the starting list', '6. END IF', '7. CALL sortByPriority', '8. CALL priceOf', '9. FOR EACH order IN queue', '10. END FOR', '11. CALL saveQueue', '12. OUTPUT the verdict line')],
      ['one CALL doing sort, save and load', ['r5'], lines('1. CALL loadQueue', '2. IF a saved queue was found', '3.   SET queue TO the saved queue', '4. ELSE', '5.   SET queue TO the starting list', '6. END IF', '7. CALL sortSaveLoad', '8. FOR EACH order IN queue', '9.   CALL priceOf', '10. END FOR', '11. OUTPUT the verdict line')],
      ['a decision with only one way out', ['r2'], lines('1. CALL loadQueue', '2. IF a saved queue was found', '3.   SET queue TO the saved queue', '4. END IF', '5. CALL sortByPriority', '6. FOR EACH order IN queue', '7.   CALL priceOf', '8.   CALL estimateHours', '9. END FOR', '10. CALL saveQueue', '11. OUTPUT the verdict line')],
      ['no loop', ['r3'], lines('1. CALL loadQueue', '2. IF a saved queue was found', '3.   SET queue TO the saved queue', '4. ELSE', '5.   SET queue TO the starting list', '6. END IF', '7. CALL sortByPriority', '8. CALL priceOf', '9. CALL estimateHours', '10. CALL saveQueue', '11. OUTPUT the verdict line')],
      ['no save planned', ['r5'], lines('1. CALL loadQueue', '2. IF a saved queue was found', '3.   SET queue TO the saved queue', '4. ELSE', '5.   SET queue TO the starting list', '6. END IF', '7. CALL sortByPriority', '8. FOR EACH order IN queue', '9.   CALL priceOf', '10. END FOR', '11. OUTPUT the verdict line')],
      ['no verdict printed', ['r6'], lines('1. CALL loadQueue', '2. IF a saved queue was found', '3.   SET queue TO the saved queue', '4. ELSE', '5.   SET queue TO the starting list', '6. END IF', '7. CALL sortByPriority', '8. FOR EACH order IN queue', '9.   CALL priceOf', '10. END FOR', '11. CALL saveQueue')],
    ],
    lower: lines('1. call loadGames', '2. if there is saved data', '3.   set games to the saved games', '4. else', '5.   set games to the starter list', '6. end if', '7. call sortByScore', '8. for each game in games', '9.   call gradeOf', '10.  call hoursOf', '11. end for', '12. call saveGames', '13. print the verdict line'),
  },
};

for (const [id, lab] of Object.entries(LABS)) {
  const dir = path.join(root, 'lessons', id);
  const lesson = JSON.parse(readFileSync(path.join(dir, 'lesson.json'), 'utf8'));
  const reqs = lesson.requirements;
  const starter = readFileSync(path.join(dir, 'README.md'), 'utf8');
  const solution = readFileSync(path.join(dir, 'solution', 'README.md'), 'utf8');

  check(lesson.preview === 'console' && !lesson.diagram, `${id}: a console lab with no diagram block`);
  check(lab.noChart || (!!lesson.planChart?.mermaid && /^flowchart LR/.test(lesson.planChart.mermaid)), `${id}: a left-to-right read-only chart above the editor`);
  check(reqs.length >= 4 && reqs.every((r) => r.file === 'README.md' && r.stripComments === false && r.pattern), `${id}: README.md requirements that read comments`);

  // grade(): what lib/grader.ts checkRegex does, minus the comment stripping a pseudocode file must skip
  const results = (text) => Object.fromEntries(reqs.map((r) => [r.id, new RegExp(r.pattern, r.flags ?? '').test(text)]));
  const red = (text) => Object.entries(results(text)).filter(([, ok]) => !ok).map(([k]) => k);

  const wantRed = lab.starterRed ?? reqs.map((r) => r.id);
  check(red(starter).sort().join() === [...wantRed].sort().join(), `${id}: the starter is red on exactly ${wantRed} (red: ${red(starter)})`);
  check(red(solution).length === 0, `${id}: the reference passes everything (red: ${red(solution)})`);
  check(red(lab.frame(lab.lower)).length === 0, `${id}: lower-case, differently worded answer passes (red: ${red(lab.frame(lab.lower))})`);
  check(solution.split('\n')[0] === starter.split('\n')[0] && solution.trimEnd().split('\n').pop() === starter.trimEnd().split('\n').pop(), `${id}: starter and reference share the first and last line`);

  for (const [name, body] of lab.ok ?? []) {
    const got = red(lab.frame(body));
    check(got.length === 0, `${id}: honest answer "${name}" passes (red: ${got.join() || 'none'})`);
  }
  for (const [name, mustFail, body] of lab.muts) {
    const got = red(lab.frame(body));
    const want = [...mustFail].sort().join();
    check(got.slice().sort().join() === want, `${id}: "${name}" goes red on exactly ${want || 'none'} (got ${got.join() || 'none'})`);
  }
}

console.log(`[test-pseudocode-labs] ${n - failures}/${n} checks passed`);
process.exit(failures ? 1 : 0);
