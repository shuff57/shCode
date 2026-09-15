// 3.1.13 Refactor the Grade Advisor
//
// This is the program from 2.1.42, unchanged. Your chart from 3.1.12 planned
// two functions -- decideGrade and printAdvice. Build the code to match it.

const score = 88;
const attendance = 85;
const lateAssignments = 2;

if (score >= 90) {
  console.log("Recommend: A");
} else if (score >= 80) {
  console.log("Recommend: B");
} else if (score >= 70) {
  console.log("Recommend: C");
} else if (score >= 60) {
  console.log("Recommend: D");
} else {
  console.log("Recommend: F");
}

if (attendance < 90 || lateAssignments >= 3) {
  console.log("Warning: recommendation should be reviewed.");
}

// STEP 1: Leave score, attendance, and lateAssignments as top-level
//         variables, right where they are above.

// STEP 2: Define a parameterless function called decideGrade. Move the
//         else-if chain into its body -- it should log the recommendation
//         itself, reading score from the outer scope.

// STEP 3: Define a parameterless function called printAdvice. Move the
//         attendance/lateAssignments check into its body -- it should log
//         the warning when the condition is true.

// STEP 4: Delete the two if/else-if blocks above once they live inside
//         decideGrade and printAdvice, then call decideGrade() and
//         printAdvice() so the output matches what this program printed
//         before the refactor.
