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
      ['a second END FOR', ['r3'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. END FOR', '6. OUTPUT withTax')],
      ['nothing printed at all', ['r5'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. SET done TO true')],
      ['adds the untaxed price', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['list reset inside the loop (END FOR EACH is not a loop start)', ['r2'], lines('1. FOR EACH price IN prices', '2.   SET withTax TO an empty list', '3.   ADD price * 1.08 TO withTax', '4. END FOR EACH', '5. OUTPUT withTax')],
      ['adds a constant, not the taxed price', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   SET tax TO price * 1.08', '4.   ADD 5 TO withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['adds the untaxed price after a tax line', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   SET tax TO price * 1.08', '4.   ADD price TO withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['1.0825 is not 1.08', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.0825 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['SEND BACK inside the loop', ['r6'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4.   SEND BACK withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['list started before and again inside the loop', ['r2'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4.   SET withTax TO an empty list', '5. END FOR EACH', '6. OUTPUT withTax')],
      ['reversed ADD', ['r4'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD withTax TO price * 1.08', '4. END FOR', '5. OUTPUT withTax')],
      ['an early IF ... THEN OUTPUT in the loop', ['r6'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4.   IF done THEN OUTPUT withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['a dash-bulleted OUTPUT in the loop', ['r6'], lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4.   - OUTPUT withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['a list of prices is not an empty list', ['r2'], lines('1. SET withTax TO a list of prices', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['adds only the tax', ['r4'], lines('1. SET withTax TO []', '2. FOR EACH price IN prices', '3.   ADD price * 0.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['a print on the same line as the add', ['r6'], lines('1. SET withTax TO []', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax, print it', '4. END FOR', '5. OUTPUT withTax')],
      ['a letter-bulleted print inside the loop', ['r6'], lines('1. SET withTax TO []', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', 'a. PRINT withTax', '4. END FOR', '5. OUTPUT withTax')],
    ],
    lower: lines('1. set withTax to a new empty array', '2. for each price in prices', '3.   push price * 1.08 to withTax', '4. end for', '5. print withTax'),
    ok: [
      ['a note that says next price', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax, then move to the next price', '4. END FOR', '5. OUTPUT withTax')],
      ['a note that says for the prices', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax (this is done for the prices)', '4. END FOR', '5. OUTPUT withTax')],
      ['END-FOR with a hyphen', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END-FOR', '5. OUTPUT withTax')],
      ['backticks around the list name', lines('1. SET `withTax` TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['Start with an empty list, called withTax', lines('1. Start with an empty list, called withTax', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['price * (1 + 0.08)', lines('1. SET withTax TO []', '2. FOR EACH price IN prices', '3.   ADD price * (1 + 0.08) TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['append(withTax, ...)', lines('1. SET withTax TO []', '2. FOR EACH price IN prices', '3.   append(withTax, price * 1.08)', '4. END FOR', '5. OUTPUT withTax')],
      ['LET taxed BE ...', lines('1. SET withTax TO []', '2. FOR EACH price IN prices', '3.   LET taxed BE price * 1.08', '4.   ADD taxed TO withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['LOOP THROUGH and END LOOP', lines('1. SET withTax TO an empty list', '2. LOOP THROUGH prices', '3.   ADD price * 1.08 TO withTax', '4. END LOOP', '5. OUTPUT withTax')],
      ['price + price * 0.08', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price + price * 0.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['withTax is blank, store, SHOW the list', lines('1. withTax is blank', '2. FOR EACH price IN prices', '3.   STORE price * 1.08 IN withTax', '4. END FOR', '5. SHOW the list')],
      ['four numbered lines, closer unnumbered', lines('1. SET withTax TO an empty list', '2. FOR EACH p IN prices', '3.   APPEND p * 1.08 TO withTax', 'END FOR', '4. PRINT withTax')],
      ['any loop variable name, no indent', lines('1. SET withTax TO []', '2. FOR EACH cost IN prices', '3. ADD cost times 1.08 TO withTax', '4. NEXT cost', '5. RETURN withTax')],
      ['multiply, then ADD the result', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   multiply price by 1.08', '4.   ADD the result TO withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['Create an empty list withTax', lines('1. Create an empty list withTax', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['withTax starts as an empty list', lines('1. withTax starts as an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['withTax.push(price * 1.08)', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   withTax.push(price * 1.08)', '4. END FOR', '5. OUTPUT withTax')],
      ['multiply price by 1.08 and ADD it TO withTax', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   multiply price by 1.08 and ADD it TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['ADD price MULTIPLIED BY 1.08 TO withTax', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price MULTIPLIED BY 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['CREATE an empty list called withTax', lines('1. CREATE an empty list called withTax', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['Make withTax an empty list', lines('1. Make withTax an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['IN the list of prices', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN the list of prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['a note with print inside the loop', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax (do not show it yet)', '4. END FOR', '5. OUTPUT withTax')],
      ['SET taxed, then ADD taxed', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   SET taxed TO price * 1.08', '4.   ADD taxed TO withTax', '5. END FOR', '6. OUTPUT withTax')],
      ['WRITE withTax after the loop', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. WRITE withTax')],
      ['RETURN instead of OUTPUT', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. RETURN withTax')],
      ['END FOR EACH as the closer', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR EACH', '5. OUTPUT withTax')],
      ['ENDFOR in one word', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. ENDFOR', '5. OUTPUT withTax')],
      ['SET withTax TO the array []', lines('1. SET withTax TO the array []', '2. FOR EACH price IN prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['SET withTax TO withTax + price * 1.08', lines('1. SET withTax TO an empty list', '2. FOR EACH price IN prices', '3.   SET withTax TO withTax + price * 1.08', '4. END FOR', '5. OUTPUT withTax')],
      ['FOR EACH price OF the prices', lines('1. SET withTax TO an empty list', '2. FOR EACH price OF the prices', '3.   ADD price * 1.08 TO withTax', '4. END FOR', '5. OUTPUT withTax')],
      ['blank lines between steps', lines('1. SET withTax TO an empty list', '', '2. FOR EACH price IN prices', '', '3.   ADD price * 1.08 TO withTax', '', '4. END FOR', '', '5. OUTPUT withTax')],
    ],
  },
  '3-8-17-chart-save-load-round-trip': {
    frame: (body) => lines('loadSettings() starts', body, 'back to the caller'),
    muts: [
      ['parse before the null check', ['r3'], lines('1. SET text TO the value stored under "settings"', '2. TRY', '3.   RETURN the parsed text', '4. IF the parse fails', '5.   RETURN defaults', '6. END TRY', '7. IF text is null', '8.   RETURN defaults', '9. END IF')],
      ['no null check at all', ['r3', 'r4'], lines('1. SET text TO the value stored under "settings"', '2. TRY', '3.   RETURN the parsed text', '4. IF the parse fails', '5.   RETURN defaults', '6. END TRY')],
      ['null check without the defaults', ['r4'], lines('1. SET text TO the value stored under "settings"', '2. IF text is null', '3.   RETURN nothing', '4. END IF', '5. TRY', '6.   RETURN the parsed text', '7. IF the parse fails', '8.   RETURN defaults', '9. END TRY')],
      ['parse with no try and no failure', ['r5', 'r6'], lines('1. SET text TO the value stored under "settings"', '2. IF text is null', '3.   RETURN defaults', '4. END IF', '5. RETURN the parsed text')],
      ['failed parse never gives defaults', ['r6'], lines('1. SET text TO the value stored under "settings"', '2. IF text is null', '3.   RETURN defaults', '4. END IF', '5. TRY', '6.   RETURN the parsed text', '7. IF the parse fails', '8.   SHOW an error message', '9. END TRY')],
      ['never reads the stored text', ['r2'], lines('1. SET up the settings object', '2. IF there is nothing saved', '3.   RETURN defaults', '4. END IF', '5. TRY', '6.   RETURN the parsed text', '7. IF the parse fails', '8.   RETURN defaults', '9. END TRY')],
      ['not numbered', ['r1'], lines('SET text TO the value stored under "settings"', 'IF text is null', '  RETURN defaults', 'END IF', 'TRY', '  RETURN the parsed text', 'IF the parse fails', '  RETURN defaults', 'END TRY')],
    ],
    lower: lines('1. get the saved text for the key', '2. if nothing is stored', '3.   give back the defaults', '4. end if', '5. try to parse the text and give it back', '6. if it fails, give back the defaults'),
    ok: [
      ['getItem and catch', lines('1. SET text TO localStorage.getItem("settings")', '2. IF text === null', '3.   RETURN defaults', '4. END IF', '5. TRY RETURN JSON.parse(text)', '6. CATCH error', '7.   RETURN defaults')],
      ['plain English', lines('1. Read the saved text for the key', '2. If there is no saved text, use the defaults', '3. Otherwise parse the text', '4. If the parse throws an error, use the defaults')],
    ],
  },
  '3-2-18-chart-chained-calls': {
    frame: (body) => lines('the program starts', body, 'the program ends'),
    muts: [
      ['addTen runs first', ['r3'], lines('1. CALL addTen WITH 5', '2. CALL double WITH 5', '3. SET result TO what addTen handed back', '4. IF result is over 25', '5.   PRINT Big', '6. ELSE', '7.   PRINT Small', '8. END IF')],
      ['addTen is given 5, not double\'s answer', ['r3'], lines('1. CALL double WITH 5', '2. CALL addTen WITH 5', '3. SET result TO what addTen handed back', '4. IF result is over 25', '5.   PRINT Big', '6. ELSE', '7.   PRINT Small', '8. END IF')],
      ['double called with 6', ['r2'], lines('1. CALL double WITH 6', '2. CALL addTen WITH that 10', '3. SET result TO what addTen handed back', '4. IF result is over 25', '5.   PRINT Big', '6. ELSE', '7.   PRINT Small', '8. END IF')],
      ['result set from something else', ['r4'], lines('1. CALL double WITH 5', '2. CALL addTen WITH that 10', '3. SET total TO what addTen handed back', '4. IF result is over 25', '5.   PRINT Big', '6. ELSE', '7.   PRINT Small', '8. END IF')],
      ['result never set', ['r4'], lines('1. CALL double WITH 5', '2. CALL addTen WITH that 10', '3. IF result is over 25', '4.   PRINT Big', '5. ELSE', '6.   PRINT Small', '7. END IF')],
      ['tests 20 instead of 25', ['r5'], lines('1. CALL double WITH 5', '2. CALL addTen WITH that 10', '3. SET result TO what addTen handed back', '4. IF result is over 20', '5.   PRINT Big', '6. ELSE', '7.   PRINT Small', '8. END IF')],
      ['asks whether result equals 25', ['r5'], lines('1. CALL double WITH 5', '2. CALL addTen WITH that 10', '3. SET result TO what addTen handed back', '4. IF result equals 25', '5.   PRINT Big', '6. ELSE', '7.   PRINT Small', '8. END IF')],
      ['only Big is ever printed', ['r6'], lines('1. CALL double WITH 5', '2. CALL addTen WITH that 10', '3. SET result TO what addTen handed back', '4. IF result is over 25', '5.   PRINT Big', '6. END IF')],
      ['both prints, no ELSE', ['r6'], lines('1. CALL double WITH 5', '2. CALL addTen WITH that 10', '3. SET result TO what addTen handed back', '4. IF result is over 25', '5.   PRINT Big', '6.   PRINT Small', '7. END IF')],
      ['not numbered', ['r1'], lines('CALL double WITH 5', 'CALL addTen WITH that 10', 'SET result TO what addTen handed back', 'IF result is over 25', '  PRINT Big', 'ELSE', '  PRINT Small', 'END IF')],
    ],
    lower: lines('1. call double with 5 (gives 10)', '2. call addTen with that 10 (gives 20)', '3. set result to what addTen gave back', '4. if result is over 25, print big', '5. else print small'),
    ok: [
      ['plain English', lines('1. Call double with 5, which gives 10', '2. Call addTen on that 10, which gives 20', '3. Store what addTen gave back in result', '4. If result is more than 25, show Big', '5. If not, show Small')],
      ['one nested line', lines('1. SET result TO addTen(double(5))', '2. IF result > 25', '3.   PRINT Big', '4. ELSE', '5.   PRINT Small', '6. END IF')],
      ['reversed check, same meaning', lines('1. SET inner TO double(5)', '2. SET result TO addTen(inner)', '3. IF result is at most 25 THEN PRINT Small', '4. OTHERWISE PRINT Big')],
    ],
  },
  '3-3-11-chart-the-array-loop': {
    frame: (body) => lines('the program starts', body, 'the program ends'),
    muts: [
      ['cheapCount never started', ['r2'], lines('1. FOR EACH price IN prices', '2.   IF price < 10', '3.     ADD 1 TO cheapCount', '4.   END IF', '5. END FOR', '6. PRINT cheapCount')],
      ['cheapCount reset inside the loop', ['r2'], lines('1. FOR EACH price IN prices', '2.   SET cheapCount TO 0', '3.   IF price < 10', '4.     ADD 1 TO cheapCount', '5.   END IF', '6. END FOR', '7. PRINT cheapCount')],
      ['cheapCount starts at 1', ['r2'], lines('1. SET cheapCount TO 1', '2. FOR EACH price IN prices', '3.   IF price < 10', '4.     ADD 1 TO cheapCount', '5.   END IF', '6. END FOR', '7. PRINT cheapCount')],
      ['loops over the wrong list', ['r3'], lines('1. SET cheapCount TO 0', '2. FOR EACH score IN scores', '3.   IF score < 10', '4.     ADD 1 TO cheapCount', '5.   END IF', '6. END FOR', '7. PRINT cheapCount')],
      ['price greater than 10', ['r4'], lines('1. SET cheapCount TO 0', '2. FOR EACH price IN prices', '3.   IF price > 10', '4.     ADD 1 TO cheapCount', '5.   END IF', '6. END FOR', '7. PRINT cheapCount')],
      ['price under 100', ['r4'], lines('1. SET cheapCount TO 0', '2. FOR EACH price IN prices', '3.   IF price < 100', '4.     ADD 1 TO cheapCount', '5.   END IF', '6. END FOR', '7. PRINT cheapCount')],
      ['adds outside the check', ['r5'], lines('1. SET cheapCount TO 0', '2. FOR EACH price IN prices', '3.   IF price < 10', '4.   END IF', '5.   ADD 1 TO cheapCount', '6. END FOR', '7. PRINT cheapCount')],
      ['adds the price instead of one', ['r5'], lines('1. SET cheapCount TO 0', '2. FOR EACH price IN prices', '3.   IF price < 10', '4.     ADD price TO cheapCount', '5.   END IF', '6. END FOR', '7. PRINT cheapCount')],
      ['adds 2 instead of one', ['r5'], lines('1. SET cheapCount TO 0', '2. FOR EACH price IN prices', '3.   IF price < 10', '4.     ADD 2 TO cheapCount', '5.   END IF', '6. END FOR', '7. PRINT cheapCount')],
      ['print inside the loop', ['r6'], lines('1. SET cheapCount TO 0', '2. FOR EACH price IN prices', '3.   IF price < 10', '4.     ADD 1 TO cheapCount', '5.   END IF', '6.   PRINT cheapCount', '7. END FOR')],
      ['prints nothing about the count', ['r6'], lines('1. SET cheapCount TO 0', '2. FOR EACH price IN prices', '3.   IF price < 10', '4.     ADD 1 TO cheapCount', '5.   END IF', '6. END FOR', '7. PRINT the word finished')],
      ['no print at all', ['r6'], lines('1. SET cheapCount TO 0', '2. FOR EACH price IN prices', '3.   IF price < 10', '4.     ADD 1 TO cheapCount', '5.   END IF', '6. END FOR')],
      ['not numbered', ['r1'], lines('SET cheapCount TO 0', 'FOR EACH price IN prices', '  IF price < 10', '    ADD 1 TO cheapCount', '  END IF', 'END FOR', 'PRINT cheapCount')],
    ],
    lower: lines('1. set cheapcount to 0', '2. for each price in prices', '3.   if price < 10', '4.     add 1 to cheapcount', '5.   end if', '6. end for', '7. print cheapcount'),
    ok: [
      ['plain English', lines('1. Start a counter, cheapCount, at 0', '2. Go through every price in the list', '3.   If the price is under 10, add one to cheapCount', '4. After the loop, print the count')],
      ['counted loop with ++', lines('1. SET cheapCount = 0', '2. FOR i FROM 0 TO prices.length - 1', '3.   IF prices[i] < 10', '4.     cheapCount++', '5.   END IF', '6. END FOR', '7. PRINT cheapCount')],
      ['WHILE loop', lines('1. SET cheapCount TO 0', '2. SET i TO 0', '3. WHILE i < prices.length', '4.   IF prices[i] < 10 THEN cheapCount = cheapCount + 1', '5.   i = i + 1', '6. END WHILE', '7. OUTPUT cheapCount')],
      ['LOOP THROUGH and INCREASE', lines('1. Create cheapCount and set it to 0', '2. LOOP THROUGH prices', '3.   IF the price is below 10 THEN increase cheapCount by 1', '4. END LOOP', '5. DISPLAY cheapCount')],
    ],
  },
  '3-4-9-chart-expand-arrow': {
    frame: (body) => lines('applyTwice starts', body, 'back to the caller'),
    muts: [
      ['reads only operation', ['r2'], lines('1. READ operation', '2. SET first TO operation(value)', '3. SET second TO operation(first)', '4. PRINT second')],
      ['no read step', ['r2'], lines('1. SET first TO operation(value)', '2. SET second TO operation(first)', '3. PRINT second', '4. DONE')],
      ['no first call', ['r3', 'r4'], lines('1. READ operation AND value', '2. SET second TO twice the value', '3. PRINT second', '4. DONE')],
      ['second call uses value again', ['r4'], lines('1. READ operation AND value', '2. SET first TO operation(value)', '3. SET second TO operation(value)', '4. PRINT second')],
      ['second call before the first', ['r4'], lines('1. READ operation AND value', '2. SET second TO operation(first)', '3. SET first TO operation(value)', '4. PRINT second')],
      ['operation called only once', ['r4', 'r5'], lines('1. READ operation AND value', '2. SET first TO operation(value)', '3. PRINT first', '4. DONE')],
      ['prints the first answer', ['r5'], lines('1. READ operation AND value', '2. SET first TO operation(value)', '3. SET second TO operation(first)', '4. PRINT first')],
      ['prints value', ['r5'], lines('1. READ operation AND value', '2. SET first TO operation(value)', '3. SET second TO operation(first)', '4. PRINT value')],
      ['print before the second call', ['r6'], lines('1. READ operation AND value', '2. SET first TO operation(value)', '3. PRINT second', '4. SET second TO operation(first)')],
      ['no print at all', ['r5', 'r6'], lines('1. READ operation AND value', '2. SET first TO operation(value)', '3. SET second TO operation(first)', '4. DONE')],
      ['not numbered', ['r1'], lines('READ operation AND value', 'SET first TO operation(value)', 'SET second TO operation(first)', 'PRINT second')],
    ],
    lower: lines('1. read operation and value', '2. set first to operation(value)', '3. set second to operation(first)', '4. print second'),
    ok: [
      ['one nested line', lines('1. READ operation AND value', '2. SET result TO operation(operation(value))', '3. PRINT result', '4. DONE')],
      ['plain English', lines('1. Take operation and value as input', '2. Apply operation to value and call that first', '3. Apply operation again to first and call that second', '4. Show second')],
      ['arrow notation', lines('1. Receive the operation and the value', '2. first = operation of value', '3. second = operation of first', '4. Output second')],
    ],
  },
  '3-4-15-chart-form-decision': {
    frame: (body) => lines('choosing a function form starts', body, 'the form is chosen'),
    muts: [
      ['no first question', ['r2'], lines("1. READ the function's job", '2. WRITE a function declaration', '3. IF its body is a single expression', '4.   WRITE a one-line arrow with an implicit return', '5. ELSE', '6.   WRITE an arrow with a block body and an explicit return', '7. END IF')],
      ['no body question', ['r3'], lines("1. READ the function's job", '2. IF it is a main operation called from several places', '3.   WRITE a function declaration', '4. OTHERWISE WRITE a one-line arrow with an implicit return', '5. OTHERWISE WRITE an arrow with a block body and an explicit return')],
      ['no declaration', ['r4'], lines("1. READ the function's job", '2. IF it is a main operation called from several places', '3.   WRITE the function', '4. ELSE IF its body is a single expression', '5.   WRITE a one-line arrow with an implicit return', '6. ELSE', '7.   WRITE an arrow with a block body and an explicit return', '8. END IF')],
      ['one-line arrow written with an explicit return', ['r5'], lines("1. READ the function's job", '2. IF it is a main operation called from several places', '3.   WRITE a function declaration', '4. ELSE IF its body is a single expression', '5.   WRITE an arrow function', '6. ELSE', '7.   WRITE an arrow with a block body and an explicit return', '8. END IF')],
      ['no block-body arrow', ['r6'], lines("1. READ the function's job", '2. IF it is a main operation called from several places', '3.   WRITE a function declaration', '4. ELSE IF its body is a single expression', '5.   WRITE a one-line arrow with an implicit return', '6. ELSE', '7.   WRITE nothing', '8. END IF')],
      ['block arrow described as plain arrow', ['r6'], lines("1. READ the function's job", '2. IF it is a main operation called from several places', '3.   WRITE a function declaration', '4. ELSE IF its body is a single expression', '5.   WRITE a one-line arrow with an implicit return', '6. ELSE', '7.   WRITE another arrow', '8. END IF')],
      ['not numbered', ['r1'], lines("READ the function's job", 'IF it is a main operation called from several places', '  WRITE a function declaration', 'ELSE IF its body is a single expression', '  WRITE a one-line arrow with an implicit return', 'ELSE', '  WRITE an arrow with a block body and an explicit return', 'END IF')],
    ],
    lower: lines("1. read the function's job", '2. if it is a main operation called from several places', '3.   write a function declaration', '4. else if its body is a single expression', '5.   write a one-line arrow with an implicit return', '6. else', '7.   write an arrow with a block body and an explicit return', '8. end if'),
    ok: [
      ['plain English', lines('1. Look at what the function has to do', '2. Ask: is it a main operation called from many places? If so, use a regular named function (a declaration).', '3. Otherwise ask whether the body is just one expression.', '4. If it is, use an arrow function with an implicit return and no braces.', '5. If not, use an arrow function with a block body and a return.')],
      ['declaration THEN, curly braces', lines('1. READ the job', '2. IF the function is called in several places THEN it is a declaration', '3. IF the body is only one expression, make it an arrow without braces or return', '4. Else it is an arrow with curly braces and statements')],
    ],
  },
  '3-4-20-chart-forms-comparison': {
    frame: (body) => lines('the forms comparison starts', body, 'the comparison ends'),
    muts: [
      ['arrow question before the named question', ['r2'], lines('1. READ in the operation: add two numbers', '2. IF it is written with =>', '3.   WRITE addC as an arrow function with an implicit return', '4. ELSE IF the function is named', '5.   WRITE addA as a function declaration with an explicit return', '6. ELSE', '7.   WRITE addB as a function expression assigned to a const, with an explicit return', '8. END IF', '9. PRINT addA(1, 2), addB(1, 2), addC(1, 2)')],
      ['no named question', ['r2'], lines('1. READ in the operation: add two numbers', '2. WRITE addA as a function declaration with an explicit return', '3. IF it is written with =>', '4.   WRITE addC as an arrow function with an implicit return', '5. ELSE', '6.   WRITE addB as a function expression assigned to a const, with an explicit return', '7. END IF', '8. PRINT addA(1, 2), addB(1, 2), addC(1, 2)')],
      ['no declaration', ['r3'], lines('1. READ in the operation: add two numbers', '2. IF the function is named', '3.   WRITE addA', '4. ELSE IF it is written with =>', '5.   WRITE addC as an arrow function with an implicit return', '6. ELSE', '7.   WRITE addB as a function expression assigned to a const, with an explicit return', '8. END IF', '9. PRINT addA(1, 2), addB(1, 2), addC(1, 2)')],
      ['no function expression', ['r4'], lines('1. READ in the operation: add two numbers', '2. IF the function is named', '3.   WRITE addA as a function declaration with an explicit return', '4. ELSE IF it is written with =>', '5.   WRITE addC as an arrow function with an implicit return', '6. ELSE', '7.   WRITE addB', '8. END IF', '9. PRINT addA(1, 2), addB(1, 2), addC(1, 2)')],
      ['arrow written with an explicit return', ['r5'], lines('1. READ in the operation: add two numbers', '2. IF the function is named', '3.   WRITE addA as a function declaration with an explicit return', '4. ELSE IF it is written with =>', '5.   WRITE addC as an arrow function with an explicit return', '6. ELSE', '7.   WRITE addB as a function expression assigned to a const, with an explicit return', '8. END IF', '9. PRINT addA(1, 2), addB(1, 2), addC(1, 2)')],
      ['no print', ['r6'], lines('1. READ in the operation: add two numbers', '2. IF the function is named', '3.   WRITE addA as a function declaration with an explicit return', '4. ELSE IF it is written with =>', '5.   WRITE addC as an arrow function with an implicit return', '6. ELSE', '7.   WRITE addB as a function expression assigned to a const, with an explicit return', '8. END IF', '9. DONE')],
      ['only one call printed', ['r6'], lines('1. READ in the operation: add two numbers', '2. IF the function is named', '3.   WRITE addA as a function declaration with an explicit return', '4. ELSE IF it is written with =>', '5.   WRITE addC as an arrow function with an implicit return', '6. ELSE', '7.   WRITE addB as a function expression assigned to a const, with an explicit return', '8. END IF', '9. PRINT addA(1, 2)')],
      ['not numbered', ['r1'], lines('READ in the operation: add two numbers', 'IF the function is named', '  WRITE addA as a function declaration with an explicit return', 'ELSE IF it is written with =>', '  WRITE addC as an arrow function with an implicit return', 'ELSE', '  WRITE addB as a function expression assigned to a const, with an explicit return', 'END IF', 'PRINT addA(1, 2), addB(1, 2), addC(1, 2)')],
    ],
    lower: lines('1. read in the operation: add two numbers', '2. if the function is named', '3.   write adda as a function declaration with an explicit return', '4. else if it is written with =>', '5.   write addc as an arrow function with an implicit return', '6. else', '7.   write addb as a function expression assigned to a const, with an explicit return', '8. end if', '9. print adda(1, 2), addb(1, 2), addc(1, 2)'),
    ok: [
      ['plain English', lines('1. Read in the operation: add two numbers', '2. If the function is named, write it as a declaration (addA) with its own return', '3. If it is not named, ask whether it is written with =>', '4. If it is, write addC as an arrow with no return and no function keyword', '5. If it is not, write addB as a function expression stored in a const', '6. Show all three results')],
      ['code-ish', lines('1. SET job TO add two numbers', '2. IF the function has a name', '3.   function addA(a, b) { return a + b }', '4. ELSE IF the syntax uses an arrow =>', '5.   const addC = (a, b) => a + b', '6. ELSE', '7.   const addB = function (a, b) { return a + b }', '8. END IF', '9. console.log(addA(1, 2), addB(1, 2), addC(1, 2))')],
    ],
  },
  '3-5-11-chart-nested-access': {
    frame: (body) => lines('the order summary starts', body, 'the order summary ends'),
    muts: [
      ['no zero start', ['r2'], lines('1. FOR EACH item IN order.items', '2.   SET total TO total + item.price', '3. END FOR', '4. SET name TO order.customer.name', '5. IF order.customer.vip', '6.   PRINT name + " (VIP) total: " + total', '7. ELSE', '8.   PRINT name + " total: " + total', '9. END IF')],
      ['total reset inside the loop', ['r2'], lines('1. FOR EACH item IN order.items', '2.   SET total TO 0', '3.   SET total TO total + item.price', '4. END FOR', '5. SET name TO order.customer.name', '6. IF order.customer.vip', '7.   PRINT name + " (VIP) total: " + total', '8. ELSE', '9.   PRINT name + " total: " + total', '10. END IF')],
      ['price added after the loop', ['r3'], lines('1. SET total TO 0', '2. FOR EACH item IN order.items', '3. END FOR', '4. SET total TO total + item.price', '5. SET name TO order.customer.name', '6. IF order.customer.vip', '7.   PRINT name + " (VIP) total: " + total', '8. ELSE', '9.   PRINT name + " total: " + total', '10. END IF')],
      ['adds 1 instead of the price', ['r3'], lines('1. SET total TO 0', '2. FOR EACH item IN order.items', '3.   SET total TO total + 1', '4. END FOR', '5. SET name TO order.customer.name', '6. IF order.customer.vip', '7.   PRINT name + " (VIP) total: " + total', '8. ELSE', '9.   PRINT name + " total: " + total', '10. END IF')],
      ['name read inside the loop', ['r4'], lines('1. SET total TO 0', '2. FOR EACH item IN order.items', '3.   SET total TO total + item.price', '4.   SET name TO order.customer.name', '5. END FOR', '6. IF order.customer.vip', '7.   PRINT name + " (VIP) total: " + total', '8. ELSE', '9.   PRINT name + " total: " + total', '10. END IF')],
      ['VIP question inside the loop', ['r5'], lines('1. SET total TO 0', '2. FOR EACH item IN order.items', '3.   SET total TO total + item.price', '4.   IF order.customer.vip', '5.     PRINT name + " (VIP) total: " + total', '6.   ELSE', '7.     PRINT name + " total: " + total', '8.   END IF', '9. END FOR', '10. SET name TO order.customer.name')],
      ['no print for the other case', ['r6'], lines('1. SET total TO 0', '2. FOR EACH item IN order.items', '3.   SET total TO total + item.price', '4. END FOR', '5. SET name TO order.customer.name', '6. IF order.customer.vip', '7.   PRINT name + " (VIP) total: " + total', '8. END IF')],
      ['one print for both', ['r6'], lines('1. SET total TO 0', '2. FOR EACH item IN order.items', '3.   SET total TO total + item.price', '4. END FOR', '5. SET name TO order.customer.name', '6. IF order.customer.vip', '7.   SET label TO "VIP"', '8. END IF', '9. PRINT name + label + total')],
      ['not numbered', ['r1'], lines('SET total TO 0', 'FOR EACH item IN order.items', '  SET total TO total + item.price', 'END FOR', 'SET name TO order.customer.name', 'IF order.customer.vip', '  PRINT name + " (VIP) total: " + total', 'ELSE', '  PRINT name + " total: " + total', 'END IF')],
    ],
    lower: lines('1. set total to 0', '2. for each item in order.items', '3.   set total to total + item.price', '4. end for', '5. set name to order.customer.name', '6. if order.customer.vip', '7.   print name + " (vip) total: " + total', '8. else', '9.   print name + " total: " + total', '10. end if'),
    ok: [
      ['plain English', lines('1. Start the total at 0', '2. Go through each item in the order and add its price to the total', "3. After the loop, get the customer's name", '4. If the customer is a VIP, print the name and total with VIP', '5. Otherwise print the name and total')],
      ['code-ish', lines('1. total = 0', '2. for (let i = 0; i < order.items.length; i++)', '3.   total = total + order.items[i].price', '4. end for', '5. name = order.customer.name', "6. if (order.customer.vip) console.log(name + ' (VIP) total: ' + total)", "7. else console.log(name + ' total: ' + total)")],
      ['ADD price TO total, END FOR EACH, IF NOT', lines('1. SET total TO 0', '2. FOR EACH item IN order.items', "3.   ADD the item's price TO total", '4. END FOR EACH', '5. GET the name of the customer', '6. IF the customer is a VIP, SHOW name and total with VIP', '7. IF the customer is NOT a VIP, SHOW name and total')],
    ],
  },
  '3-5-21-chart-destructure-vs-access': {
    frame: (body) => lines('describeBox() starts', body, 'back to the caller'),
    muts: [
      ['unpack one field at a time', ['r2'], lines('1. SET width TO options.width', '2. SET height TO options.height', '3. SET color TO options.color', '4. BUILD the note: color + " box " + width + "x" + height', '5. IF width > height', '6.   ADD " (wide)" to the end of the note', '7. END IF', '8. RETURN the note')],
      ['note built before the unpack', ['r3'], lines('1. BUILD the note: color + " box " + width + "x" + height', '2. SET width, height and color TO the values taken out of options', '3. IF width > height', '4.   ADD " (wide)" to the end of the note', '5. END IF', '6. RETURN the note')],
      ['no unpack at all', ['r2', 'r3'], lines('1. BUILD the note: color + " box " + width + "x" + height', '2. IF width > height', '3.   ADD " (wide)" to the end of the note', '4. END IF', '5. RETURN the note')],
      ['width < height', ['r4'], lines('1. SET width, height and color TO the values taken out of options', '2. BUILD the note: color + " box " + width + "x" + height', '3. IF width < height', '4.   ADD " (wide)" to the end of the note', '5. END IF', '6. RETURN the note')],
      ['height > width', ['r4'], lines('1. SET width, height and color TO the values taken out of options', '2. BUILD the note: color + " box " + width + "x" + height', '3. IF height > width', '4.   ADD " (wide)" to the end of the note', '5. END IF', '6. RETURN the note')],
      ['width >= height', ['r4'], lines('1. SET width, height and color TO the values taken out of options', '2. BUILD the note: color + " box " + width + "x" + height', '3. IF width >= height', '4.   ADD " (wide)" to the end of the note', '5. END IF', '6. RETURN the note')],
      ['the wide text is never added', ['r5'], lines('1. SET width, height and color TO the values taken out of options', '2. BUILD the note: color + " box " + width + "x" + height', '3. IF width > height', '4.   SHRINK the box', '5. END IF', '6. RETURN the note')],
      ['wide text added before the check', ['r5'], lines('1. SET width, height and color TO the values taken out of options', '2. BUILD the note: color + " box " + width + "x" + height', '3. ADD " (wide)" to the end of the note', '4. IF width > height', '5.   DO NOTHING', '6. END IF', '7. RETURN the note')],
      ['the note is never given back', ['r6'], lines('1. SET width, height and color TO the values taken out of options', '2. BUILD the note: color + " box " + width + "x" + height', '3. IF width > height', '4.   ADD " (wide)" to the end of the note', '5. END IF')],
      ['note given back before the check', ['r6'], lines('1. SET width, height and color TO the values taken out of options', '2. BUILD the note: color + " box " + width + "x" + height', '3. RETURN the note', '4. IF width > height', '5.   ADD " (wide)" to the end of the note', '6. END IF')],
      ['not numbered', ['r1'], lines('SET width, height and color TO the values taken out of options', 'BUILD the note: color + " box " + width + "x" + height', 'IF width > height', '  ADD " (wide)" to the end of the note', 'END IF', 'RETURN the note')],
    ],
    lower: lines('1. unpack width, height and color from options', '2. make the note from color, width and height', '3. if width is bigger than height', '4.   add (wide) to the note', '5. end if', '6. return the note'),
    ok: [
      ['code-style destructure', lines('1. const { width, height, color } = options', "2. note = color + ' box ' + width + 'x' + height", '3. IF width > height', "4.   note = note + ' (wide)'", '5. END IF', '6. RETURN note')],
      ['plain English, wider than tall', lines('1. Take width, height and color out of options', '2. Join the color, the width and the height into a note', '3. If the box is wider than it is tall (width is greater than height)', '4. Add (wide) to the end of the note', '5. Show the note')],
      ['height < width', lines('1. SET width, height and color TO the values taken out of options', '2. BUILD the note: color + " box " + width + "x" + height', '3. IF height < width', '4.   APPEND " (wide)" to the note', '5. END IF', '6. OUTPUT the note')],
    ],
  },
  '3-6-7-chart-reassign-vs-mutate': {
    frame: (body) => lines('process() starts', body, 'back to the caller'),
    muts: [
      ['item 0 is never written', ['r2'], lines('1. DO NOTHING to the array yet', '2. ASK did the caller see this write? YES: scores now starts with 0', '3. SET nums TO a NEW array [9, 9]', '4. ASK did the caller see this write? NO: only the local name moved, scores is unchanged', '5. The caller prints scores: [0, 20, 30]')],
      ['writes item 1 instead', ['r2'], lines('1. SET item 1 OF nums TO 0', '2. ASK did the caller see this write? YES: scores now starts with 0', '3. SET nums TO a NEW array [9, 9]', '4. ASK did the caller see this write? NO: only the local name moved, scores is unchanged', '5. The caller prints scores: [0, 20, 30]')],
      ['writes 5 instead of 0', ['r2'], lines('1. SET item 0 OF nums TO 5', '2. ASK did the caller see this write? YES: scores now starts with 0', '3. SET nums TO a NEW array [9, 9]', '4. ASK did the caller see this write? NO: only the local name moved, scores is unchanged', '5. The caller prints scores: [0, 20, 30]')],
      ['says the caller does not see the mutation', ['r3'], lines('1. SET item 0 OF nums TO 0', '2. ASK did the caller see this write? NO: the caller does not see it', '3. SET nums TO a NEW array [9, 9]', '4. ASK did the caller see this write? NO: only the local name moved, scores is unchanged', '5. The caller prints scores: [0, 20, 30]')],
      ['never asks about the mutation', ['r3'], lines('1. SET item 0 OF nums TO 0', '2. SET nums TO a NEW array [9, 9]', '3. ASK did the caller see this write? NO: only the local name moved, scores is unchanged', '4. The caller prints scores: [0, 20, 30]')],
      ['no reassignment mentioned', ['r4', 'r5'], lines('1. SET item 0 OF nums TO 0', '2. ASK did the caller see this write? YES: nums and scores are the same array, so scores now starts with 0', '3. DO NOTHING else in the function', '4. The caller prints scores: [0, 20, 30]')],
      ['says the caller sees the reassignment', ['r5'], lines('1. SET item 0 OF nums TO 0', '2. ASK did the caller see this write? YES: nums and scores are the same array', '3. SET nums TO a NEW array [9, 9]', '4. ASK did the caller see this write? YES: scores becomes the new array', '5. The caller prints scores: [0, 20, 30]')],
      ['prints [9, 9]', ['r6'], lines('1. SET item 0 OF nums TO 0', '2. ASK did the caller see this write? YES: nums and scores are the same array', '3. SET nums TO a NEW array [9, 9]', '4. ASK did the caller see this write? NO: only the local name moved, scores is unchanged', '5. The caller prints scores: [9, 9]')],
      ['prints the original numbers', ['r6'], lines('1. SET item 0 OF nums TO 0', '2. ASK did the caller see this write? YES: nums and scores are the same array', '3. SET nums TO a NEW array [9, 9]', '4. ASK did the caller see this write? NO: only the local name moved, scores is unchanged', '5. The caller prints scores: [10, 20, 30]')],
      ['not numbered', ['r1'], lines('SET item 0 OF nums TO 0', 'ASK did the caller see this write? YES: nums and scores are the same array', 'SET nums TO a NEW array [9, 9]', 'ASK did the caller see this write? NO: only the local name moved, scores is unchanged', 'The caller prints scores: [0, 20, 30]')],
    ],
    lower: lines('1. set item 0 of nums to 0', '2. ask did the caller see this? yes, nums and scores are the same array', '3. set nums to a new array [9, 9]', '4. ask did the caller see this? no, only the local name moved', '5. the caller prints scores: [0, 20, 30]'),
    ok: [
      ['code-style', lines('1. nums[0] = 0', '2. the caller sees it, because nums and scores share one array', '3. nums = [9, 9]', '4. the caller does not see it, scores is unaffected', '5. scores is [0, 20, 30]')],
      ['plain English', lines('1. Change the first item of nums to 0', '2. Because nums and scores are the same array, the caller sees that change', '3. Point nums at a brand new array of 9 and 9', '4. The caller never sees the new array, so scores stays the same', '5. Printing scores gives 0, 20, 30')],
    ],
  },
  '3-2-8-chart-parameter-trace': {
    frame: (body) => lines('the program starts', body, 'the program ends'),
    muts: [
      ['decision before the call', ['r4'], lines('1. SET base TO 100', '2. IF base is over 80', '3.   OUTPUT "Over budget"', '4. ELSE', '5.   OUTPUT "Within budget"', '6. END IF', '7. CALL showPriceWithTax WITH base')],
      ['no call at all', ['r3', 'r4'], lines('1. SET base TO 100', '2. IF base is over 80', '3.   OUTPUT "Over budget"', '4. ELSE', '5.   OUTPUT "Within budget"', '6. END IF')],
      ['call without base', ['r3'], lines('1. SET base TO 100', '2. CALL showPriceWithTax', '3. IF base is over 80', '4.   OUTPUT "Over budget"', '5. ELSE', '6.   OUTPUT "Within budget"', '7. END IF')],
      ['base never set', ['r2'], lines('1. DO NOTHING YET', '2. CALL showPriceWithTax WITH base', '3. IF base is over 80', '4.   OUTPUT "Over budget"', '5. ELSE', '6.   OUTPUT "Within budget"', '7. END IF')],
      ['base set to 50', ['r2'], lines('1. SET base TO 50', '2. CALL showPriceWithTax WITH base', '3. IF base is over 80', '4.   OUTPUT "Over budget"', '5. ELSE', '6.   OUTPUT "Within budget"', '7. END IF')],
      ['checks price instead of base', ['r5'], lines('1. SET base TO 100', '2. CALL showPriceWithTax WITH base', '3. IF price is over 80', '4.   OUTPUT "Over budget"', '5. ELSE', '6.   OUTPUT "Within budget"', '7. END IF')],
      ['checks against 100', ['r4', 'r5'], lines('1. SET base TO 100', '2. CALL showPriceWithTax WITH base', '3. IF base is over 100', '4.   OUTPUT "Over budget"', '5. ELSE', '6.   OUTPUT "Within budget"', '7. END IF')],
      ['both ways print Over budget', ['r6'], lines('1. SET base TO 100', '2. CALL showPriceWithTax WITH base', '3. IF base is over 80', '4.   OUTPUT "Over budget"', '5. ELSE', '6.   OUTPUT "Over budget"', '7. END IF')],
      ['no other way out', ['r6'], lines('1. SET base TO 100', '2. CALL showPriceWithTax WITH base', '3. IF base is over 80', '4.   OUTPUT "Over budget"', '5. END IF', '6. OUTPUT "Within budget"')],
      ['not numbered', ['r1'], lines('SET base TO 100', 'CALL showPriceWithTax WITH base', 'IF base is over 80', '  OUTPUT "Over budget"', 'ELSE', '  OUTPUT "Within budget"', 'END IF')],
    ],
    lower: lines('1. set base to 100', '2. call showpricewithtax with base', '3. if base is over 80', '4.   output over budget', '5. else', '6.   output within budget', '7. end if'),
    ok: [
      ['code style', lines('1. SET base = 100', '2. CALL showPriceWithTax(base)', '3. IF base > 80', '4.   PRINT "Over budget"', '5. ELSE', '6.   PRINT "Within budget"', '7. END IF')],
      ['plain English', lines('1. Make base equal to 100', '2. Run the function showPriceWithTax and give it base', '3. Ask whether base is greater than 80', '4. If yes, print Over budget', '5. If not, print Within budget')],
      ['reversed question', lines('1. SET base TO 100', '2. CALL showPriceWithTax WITH base', '3. IF 80 is less than base', '4.   OUTPUT "Over budget"', '5. OTHERWISE', '6.   OUTPUT "Within budget"')],
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
      ['nothing returned at all', ['r5'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. SET done TO true')],
      ['loops over the wrong list', ['r2', 'r3', 'r4', 'r6'], lines('1. SET sum TO 0', '2. FOR EACH number IN scores', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['sum reset inside the loop (END FOR EACH)', ['r2'], lines('1. FOR EACH number IN numbers', '2.   SET sum TO 0', '3.   SET sum TO sum + number', '4. END FOR EACH', '5. RETURN sum')],
      ['sum TO 0.5', ['r2'], lines('1. SET sum TO 0.5', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['adds twice the number', ['r4'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number * 2', '4. END FOR', '5. RETURN sum')],
      ['GIVE sum BACK inside the loop', ['r6'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4.   GIVE sum BACK', '5. END FOR', '6. RETURN sum')],
      ['sum started twice, once in the loop', ['r2'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4.   SET sum TO 0', '5. END FOR EACH', '6. RETURN sum')],
      ['an early IF ... THEN RETURN in the loop', ['r6'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4.   IF sum > 5 THEN RETURN sum', '5. END FOR', '6. RETURN sum')],
      ['adds the whole list', ['r4'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + numbers', '4. END FOR', '5. RETURN sum')],
      ['IF ... RETURN with no THEN', ['r6'], lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   IF sum > 10 RETURN sum', '4.   SET sum TO sum + number', '5. END FOR', '6. RETURN sum')],
    ],
    lower: lines('1. set sum = 0', '2. for each n in numbers', '3.   add n to sum', '4. end for', '5. return sum'),
    ok: [
      ['Create sum and set it to 0', lines('1. Create sum and set it to 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['Start the running total, `sum`, at 0', lines('1. Start the running total, `sum`, at 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['Zero out sum', lines('1. Zero out sum', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['a // note after the add', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number // add it', '4. END FOR', '5. RETURN sum')],
      ['CHANGE sum BY number', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   CHANGE sum BY number', '4. END FOR', '5. RETURN sum')],
      ['sum becomes sum + number', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   sum becomes sum + number', '4. END FOR', '5. RETURN sum')],
      ['a note that says next number', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number, then go to the next number', '4. END FOR', '5. RETURN sum')],
      ['result and tally names', lines('1. SET result TO 0', '2. FOR EACH n IN numbers', '3.   SET result TO result + n', '4. END FOR', '5. RETURN result')],
      ['temporary variable then sum', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET newSum TO sum + number', '4.   SET sum TO newSum', '5. END FOR', '6. RETURN sum')],
      ['LOOP OVER ...numbers, NEXT', lines('1. SET sum TO 0', '2. LOOP OVER ...numbers', '3.   sum = sum + number', '4. END LOOP', '5. RETURN sum')],
      ['SET sum TO 0.0', lines('1. SET sum TO 0.0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['sum starts at 0', lines('1. sum starts at 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['add it to sum', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   ADD it TO sum', '4. END FOR', '5. RETURN sum')],
      ['total as the name', lines('1. SET total TO 0', '2. FOR EACH number IN numbers', '3.   SET total TO total + number', '4. END FOR', '5. RETURN total')],
      ['INCREASE sum BY number', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   INCREASE sum BY number', '4. END FOR', '5. RETURN sum')],
      ['ADD number TO the sum', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   ADD number TO the sum', '4. END FOR', '5. RETURN sum')],
      ['sum <- 0', lines('1. sum <- 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['the plan own wording, with commas', lines('1. Start the running total, sum, at 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. RETURN sum')],
      ['a note with return inside the loop', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number (do not return yet)', '4. END FOR', '5. RETURN sum')],
      ['GIVE sum BACK after the loop', lines('1. SET sum TO 0', '2. FOR EACH number IN numbers', '3.   SET sum TO sum + number', '4. END FOR', '5. GIVE sum BACK')],
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
    ok: [['mouse is pressed instead of pressing', lines('1. IF mouse is pressed', '2.   IF sprite is under the mouse', '3.     SET sprite position TO the mouse', '4.   END IF', '5. ELSE', '6.   SET velocity TO zero', '7. END IF')]],
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
