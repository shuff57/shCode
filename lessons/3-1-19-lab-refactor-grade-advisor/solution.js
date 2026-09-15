// 3.1.13 Refactor the Grade Advisor

const score = 88;
const attendance = 85;
const lateAssignments = 2;

function decideGrade() {
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
}

function printAdvice() {
  if (attendance < 90 || lateAssignments >= 3) {
    console.log("Warning: recommendation should be reviewed.");
  }
}

decideGrade();
printAdvice();
