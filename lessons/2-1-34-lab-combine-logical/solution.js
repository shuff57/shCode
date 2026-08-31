// 2.1.37 Combine &&, ||, and !

const hasTicket = true;
const age = 10;
const isBlocked = false;

if (hasTicket && !isBlocked && (age < 5 || age >= 65)) {
  console.log("You can enter.");
} else {
  console.log("You cannot enter.");
}
