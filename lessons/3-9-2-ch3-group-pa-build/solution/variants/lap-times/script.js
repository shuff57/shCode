// Chapter 3 Group PA, Part 2 of 3: Build It.
// Problem: Lap Times
// Partners: Alex Chen, Jamie Rivera
// Date: 2026-11-02

// STEP 1: The seed data and the level.
const meetKey = "lap-times-meet";
const targetLapSeconds = 60;

const meet = [
  { name: "Ana", laps: 6, lapSeconds: 55 },
  { name: "Ben", laps: 5, lapSeconds: 62 },
  { name: "Cara", laps: 4, lapSeconds: 75 },
  { name: "Dev", laps: 8, lapSeconds: 50 }
];

// STEP 2: The contracts from 3.9.1.
// makeRunner(name, laps, lapSeconds)  -> one runner object
// totalSeconds(list)                  -> a number
// slowRunners(list, target)           -> a NEW array of runners
// resultLines(list)                   -> a NEW array of strings
// dropLap(list, name)                 -> nothing (changes the list itself)
// saveMeet(list) / loadMeet()         -> nothing / the list (or the seed)

// STEP 3: The five functions, under the contracts they came from.

function makeRunner(name, laps, lapSeconds) {
  return { name: name, laps: laps, lapSeconds: lapSeconds };
}

function totalSeconds(list) {
  let total = 0;
  for (const runner of list) {
    total = total + runner.laps * runner.lapSeconds;
  }
  return total;
}

function slowRunners(list, target) {
  const slow = [];
  for (const runner of list) {
    if (runner.lapSeconds > target) {
      slow.push(runner);
    }
  }
  return slow;
}

const resultLines = (list) => {
  return list.map((runner) => runner.name + ": " + runner.laps + " laps");
};

// dropLap changes the list it was handed. The caller holds the same
// array (3.6.2), so the change is already made when this returns --
// that is the side effect the PA asks for, and why this one returns
// nothing at all.
function dropLap(list, name) {
  for (const runner of list) {
    if (runner.name === name) {
      runner.laps = Math.max(0, runner.laps - 1);
    }
  }
}

function saveMeet(list) {
  localStorage.setItem(meetKey, JSON.stringify(list));
}

function loadMeet() {
  const text = localStorage.getItem(meetKey);
  if (text === null) {
    return meet.map(copyRunner);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    return meet.map(copyRunner);
  }
}

// Copies one record, so the seed list is never the list that gets
// changed. 3.7.15 is the spread pattern.
function copyRunner(runner) {
  return { ...runner };
}

// STEP 4: The main section -- calls in the order the plan says.
console.log("Total seconds run: " + totalSeconds(meet));
console.log("Slow runners (over " + targetLapSeconds + " seconds a lap):");
console.log(resultLines(slowRunners(meet, targetLapSeconds)).join("\n"));
console.log("Results:");
console.log(resultLines(meet).join("\n"));

dropLap(meet, "Ana");
console.log("Dropped one lap from Ana. New laps: " + meet[0].laps);

saveMeet(meet);
const loaded = loadMeet();
console.log("Reloaded from storage: " + loaded.length + " runners.");
console.log(typeof loaded[0].lapSeconds);
