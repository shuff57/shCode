// 2.1.39 A2.1.1 -- Grade Recommendation Advisor

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
