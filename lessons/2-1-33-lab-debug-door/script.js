// 2.1.35 Debug the Door
//
// This is meant to open the door only when the player is alive
// AND has a key. Find the bug and fix it.

const isAlive = true;
const hasKey = false;

if (isAlive || hasKey) {
  console.log("The door opens.");
} else {
  console.log("The door stays shut.");
}

// STEP 1: Run it. Notice the door opens even though hasKey is false.

// STEP 2: Fix the if condition so it uses && instead of ||.
