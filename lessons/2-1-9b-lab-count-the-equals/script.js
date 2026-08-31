// 2.1.19 Count the Equals Signs
//
// This is meant to sound the alarm only when temperature is exactly 100.
// It sounds every time. Find out why.

let temperature = 20;

if (temperature = 100) {
  console.log("ALARM: overheating!");
}

console.log("temperature is", temperature);

// STEP 1: Run it. The alarm sounds even though temperature is 20,
//         and the last line prints 100 instead of 20.

// STEP 2: Fix the if condition so it uses === instead of a single =.

// STEP 3: Run it again. Nothing should sound, and temperature should
//         still be 20.
