/* =========================================================
   Snack Shack — Chapter 3 Group PA
   Partner A: ________    Partner B: ________

   Fill in every section marked TODO.
   Do NOT change the SEED DATA or the SELF-CHECK block.
   The Console under the editor shows PASS/FAIL as you type.

   Everything here is built from Chapter 3, sections 3.1 through 3.8.
   You need no array method beyond the four taught in 3.7.
   ========================================================= */

/* ---------------- SEED DATA (do not change) ---------------- */
const SEED = [
  { name: 'Popcorn', price: 3.5, qty: 12 },
  { name: 'Pretzel', price: 4.0, qty: 3 },
  { name: 'Soda', price: 2.25, qty: 20 },
  { name: 'Nachos', price: 5.0, qty: 2 }
];

/* ---------------- TODO 1 — §3.5 Objects, §3.2 Return Values ----------------
   Build and return a NEW object with three properties: name, price, qty.
*/
function makeItem(name, price, qty) {
  // YOUR CODE HERE
}

/* ---------------- TODO 2 — §3.3.5 Walking Through a List ----------------
   Return the total dollar value of the list: every price times qty, added up.

   Use a loop and an accumulator — a total set to 0 before the loop and added
   to inside it. Section 3.7 has no method that combines a list into one
   value; 3.7.6 only names the one that does. Do this by hand.
*/
function totalValue(list) {
  // YOUR CODE HERE
}

/* ---------------- TODO 3 — §3.3.4, §3.3.5 ----------------
   Return a NEW array holding only the items whose qty is below threshold.

   Build it by hand: start with an empty array, walk the list, and add the
   ones you want with the push() method. Leave `list` itself untouched.
*/
function lowStock(list, threshold) {
  // YOUR CODE HERE
}

/* ---------------- TODO 4 — §3.7.1 map, §3.4.3 Arrow Functions ----------------
   Return a NEW array with one receipt line per item, in exactly this shape:

     Popcorn x12

   the name, one space, a lowercase x, then the qty. Use the map() method,
   with an arrow function as its callback.
*/
const receiptLines = (list) => {
  // YOUR CODE HERE
};

/* ---------------- TODO 5 — §3.6 Pass by Value/Reference ----------------
   Find the item named `name` and lower its qty by `count`.
   qty must never drop below 0. Return the list.

   Think first: the list arrived as a copy of a reference, so changing an item
   here is a side effect the caller can see. This one wants that side effect.
*/
function sellItem(list, name, count) {
  // YOUR CODE HERE
}

/* ---------------- TODO 6 — §3.8 Saving and Loading Data ----------------
   saveInventory: turn the list into JSON text and store it in the browser's
                  localStorage under the key 'snack-shack'.

   loadInventory: read that key back and return the array. A key that was
                  never saved reads as null — return a copy of SEED then.
                  Text you did not write can fail to parse, and §3.8.4 says
                  what to do about it: do not let a bad value throw.
*/
function saveInventory(list) {
  // YOUR CODE HERE
}

function loadInventory() {
  // YOUR CODE HERE
}

/* ---------------- PROVIDED — the demo screen ---------------- */
// Copies one item, so the buttons below change the working list and never
// SEED itself. You may call this in loadInventory() if it helps.
function copyItem(item) {
  return { ...item };
}

// A real app loads its saved data at startup, so this one calls your
// loadInventory(). Until you write it, the seed list is used instead.
let inventory = SEED.map(copyItem);
try {
  const startup = loadInventory();
  if (Array.isArray(startup) && startup.length > 0) inventory = startup;
} catch (e) {
  inventory = SEED.map(copyItem);
}

function render() {
  const receipt = document.getElementById('receipt');
  const low = document.getElementById('low');
  const summary = document.getElementById('summary');
  if (!receipt || !low || !summary) return;

  let total = 0;
  try {
    total = Number(totalValue(inventory)) || 0;
  } catch (e) {
    total = 0;
  }
  summary.textContent = 'Total inventory value: $' + total.toFixed(2);

  let lines = [];
  try {
    lines = receiptLines(inventory) || [];
  } catch (e) {
    lines = [];
  }
  receipt.textContent = Array.isArray(lines) ? lines.join('\n') : '';

  let short = [];
  try {
    short = lowStock(inventory, 5) || [];
  } catch (e) {
    short = [];
  }
  let shortLines = [];
  try {
    shortLines = receiptLines(short) || [];
  } catch (e) {
    shortLines = [];
  }
  low.textContent = Array.isArray(shortLines) ? shortLines.join('\n') : '';
}

function wire(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => {
    try {
      handler();
    } catch (e) {
      console.error(e.message);
    }
    render();
  });
}

wire('sell', () => sellItem(inventory, 'Popcorn', 1));
wire('save', () => saveInventory(inventory));
wire('load', () => {
  const loaded = loadInventory();
  if (Array.isArray(loaded)) inventory = loaded;
});

try {
  render();
} catch (e) {
  console.error(e.message);
}

/* ---------------- SELF-CHECK (do not change) ---------------- */
(function selfCheck() {
  let passed = 0;

  const check = (label, fn) => {
    let ok = false;
    try {
      ok = fn() === true;
    } catch (e) {
      ok = false;
    }
    if (ok) passed += 1;
    console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  };

  console.log('--- Snack Shack self-check ---');

  check('1. makeItem returns an object with name, price, qty', () => {
    const it = makeItem('Candy', 1.5, 7);
    return !!it && it.name === 'Candy' && it.price === 1.5 && it.qty === 7;
  });

  check('2. totalValue adds up price times qty', () => {
    const sample = [
      { name: 'a', price: 2, qty: 3 },
      { name: 'b', price: 5, qty: 1 }
    ];
    return totalValue(sample) === 11;
  });

  check('3. lowStock returns a NEW array and leaves the original alone', () => {
    const sample = [
      { name: 'a', price: 1, qty: 1 },
      { name: 'b', price: 1, qty: 9 }
    ];
    const out = lowStock(sample, 5);
    return (
      Array.isArray(out) &&
      out !== sample &&
      out.length === 1 &&
      out[0].name === 'a' &&
      sample.length === 2
    );
  });

  check('4. receiptLines builds one line per item, like "Popcorn x12"', () => {
    const sample = [
      { name: 'Popcorn', price: 1, qty: 12 },
      { name: 'Soda', price: 1, qty: 2 }
    ];
    const out = receiptLines(sample);
    return (
      Array.isArray(out) &&
      out.length === 2 &&
      out[0] === 'Popcorn x12' &&
      out[1] === 'Soda x2'
    );
  });

  check('5. sellItem lowers qty and never goes below 0', () => {
    const sample = [{ name: 'a', price: 1, qty: 5 }];
    sellItem(sample, 'a', 2);
    if (sample[0].qty !== 3) return false;
    sellItem(sample, 'a', 99);
    return sample[0].qty === 0;
  });

  // Borrow the real storage key and put it back afterwards, so this check
  // running as you type never destroys the inventory you saved.
  const KEY = 'snack-shack';
  const held = localStorage.getItem(KEY);

  check('6. save and load round-trip, and a never-saved key returns the seed', () => {
    const sample = [{ name: 'Zed', price: 9, qty: 1 }];
    saveInventory(sample);
    const back = loadInventory();
    const roundTrip =
      Array.isArray(back) &&
      back.length === 1 &&
      back[0].name === 'Zed' &&
      back[0].qty === 1;
    // Nothing saved at all: getItem gives null, and §3.8.5 says what that means.
    localStorage.removeItem(KEY);
    const empty = loadInventory();
    const seeded = Array.isArray(empty) && empty.length === SEED.length;
    return roundTrip && seeded;
  });

  check('7. loading unreadable text does not crash', () => {
    localStorage.setItem(KEY, 'not readable text');
    const rescued = loadInventory();
    return Array.isArray(rescued);
  });

  if (held === null) {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, held);
  }

  console.log(passed + ' of 7 behaviors working');
})();
