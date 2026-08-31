// 2.1.41 Challenges: Optional Stretch

// CHALLENGE 1: Leap year checker.
const year = 2024;
if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
  console.log("Leap year");
} else {
  console.log("Not a leap year");
}

// CHALLENGE 2: Rock-paper-scissors winner.
const playerOne = "rock";
const playerTwo = "scissors";
if (playerOne === playerTwo) {
  console.log("Tie");
} else if (
  (playerOne === "rock" && playerTwo === "scissors") ||
  (playerOne === "paper" && playerTwo === "rock") ||
  (playerOne === "scissors" && playerTwo === "paper")
) {
  console.log("Player one wins");
} else {
  console.log("Player two wins");
}

// CHALLENGE 3: Nested shipping rule.
const isMember = true;
const orderTotal = 40;
if (isMember) {
  if (orderTotal >= 35) {
    console.log("Free shipping");
  } else {
    console.log("$5 shipping fee");
  }
} else {
  if (orderTotal >= 75) {
    console.log("Free shipping");
  } else {
    console.log("$10 shipping fee");
  }
}
