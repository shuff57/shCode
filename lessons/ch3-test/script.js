/* =========================================================
   Gradebook — Chapter 3 Test (individual, closed book)
   Name: ________

   Work alone. Fill in every section marked TODO.
   Do NOT change the ROSTER or the SELF-CHECK block.
   Answer the written questions in answers.md as well.

   Every tool you need is taught in Chapter 3, sections 3.1 to 3.8.
   ========================================================= */

/* ---------------- ROSTER (do not change) ---------------- */
const ROSTER = [
  { name: 'Ana', scores: [88, 92, 79] },
  { name: 'Ben', scores: [54, 61, 70] },
  { name: 'Cruz', scores: [100, 95, 98] },
  { name: 'Dee', scores: [72, 68, 75] }
];

/* ---------------- TODO 1 — §3.3.5, §3.2.4 ----------------
   Return the average of an array of numbers.
   An empty array returns 0, and §3.2.4 says where that answer belongs.

   Walk the list with a loop and an accumulator.
*/
function average(scores) {
  // YOUR CODE HERE
}

/* ---------------- TODO 2 — §3.7.4 ----------------
   Return the largest number in the array.

   Math.max wants separate numbers, not one array — handed an array it gives
   NaN. Section 3.7.4 names the operator that unpacks an array into separate
   arguments. Use it.
*/
function highest(scores) {
  // YOUR CODE HERE
}

/* ---------------- TODO 3 — §3.3.4, §3.3.5 ----------------
   Return a NEW array containing only the students whose average score is
   greater than or equal to cutoff.

   Build it by hand: an empty array, a loop, and the push() method.
   `students` itself must come out unchanged.
*/
function passing(students, cutoff) {
  // YOUR CODE HERE
}

/* ---------------- TODO 4 — §3.7.5, §3.6.3 ----------------
   Return a NEW student object with `score` added to the end of its scores.

   The student you were handed must NOT change — and neither must its scores
   array. A shallow copy is not enough here; read §3.6.3 again if that is not
   obvious. Section 3.7.5, "Copying an object with changes", is the tool.
*/
function addScore(student, score) {
  // YOUR CODE HERE
}

/* ---------------- PROVIDED — the display ---------------- */
function render() {
  const list = document.getElementById('students');
  const passList = document.getElementById('passing');
  const summary = document.getElementById('summary');
  if (!list || !passList || !summary) return;

  list.textContent = ROSTER.map((s) => {
    let avg = 0;
    let best = 0;
    try {
      avg = Number(average(s.scores)) || 0;
      best = Number(highest(s.scores)) || 0;
    } catch (e) {
      avg = 0;
      best = 0;
    }
    return s.name + ' — average ' + avg.toFixed(1) + ', best ' + best;
  }).join('\n');

  let classAvg = 0;
  try {
    classAvg =
      Number(average(ROSTER.map((s) => Number(average(s.scores)) || 0))) || 0;
  } catch (e) {
    classAvg = 0;
  }
  summary.textContent = 'Class average: ' + classAvg.toFixed(1);

  let ok = [];
  try {
    ok = passing(ROSTER, 70) || [];
  } catch (e) {
    ok = [];
  }
  passList.textContent = Array.isArray(ok)
    ? ok.map((s) => s.name).join('\n')
    : '';
}

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

  console.log('--- Gradebook self-check ---');

  check('1. average returns the mean, and 0 for an empty array', () => {
    return average([2, 4, 6]) === 4 && average([]) === 0;
  });

  check('2. highest returns the largest score', () => {
    return highest([3, 9, 5]) === 9 && highest([7]) === 7;
  });

  check('3. passing returns a NEW array and leaves the roster alone', () => {
    const sample = [
      { name: 'x', scores: [90, 90] },
      { name: 'y', scores: [50, 50] }
    ];
    const out = passing(sample, 70);
    return (
      Array.isArray(out) &&
      out !== sample &&
      out.length === 1 &&
      out[0].name === 'x' &&
      sample.length === 2
    );
  });

  check('4. addScore copies the student and its scores, changing neither', () => {
    const s = { name: 'z', scores: [80] };
    const updated = addScore(s, 100);
    return (
      !!updated &&
      updated !== s &&
      updated.scores !== s.scores &&
      s.scores.length === 1 &&
      updated.scores.length === 2 &&
      updated.scores[1] === 100 &&
      updated.name === 'z'
    );
  });

  console.log(passed + ' of 4 behaviors working');
})();
