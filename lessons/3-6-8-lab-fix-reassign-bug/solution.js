// 3.6.8 Lab: Fix a Function That Reassigns Instead of Mutating

function addOne(scores) {
  for (let i = 0; i < scores.length; i++) {
    scores[i] = scores[i] + 1;
  }
}

let quizScores = [10, 20, 30];
addOne(quizScores);
console.log(quizScores);
