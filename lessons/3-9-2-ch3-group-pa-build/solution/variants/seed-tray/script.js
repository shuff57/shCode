// Chapter 3 Group PA, Part 2 of 3: Build It.
// Problem: Seed Tray
// Partners: Alex Chen, Jamie Rivera
// Date: 2026-11-02

// STEP 1: The seed data and the level.
const trayKey = "seed-tray-tray";
const packetLevel = 5;

const tray = [
  { variety: "Basil", packets: 4, seedsPerPacket: 50 },
  { variety: "Tomato", packets: 9, seedsPerPacket: 30 },
  { variety: "Marigold", packets: 2, seedsPerPacket: 80 },
  { variety: "Sunflower", packets: 6, seedsPerPacket: 25 }
];

// STEP 2: The contracts from 3.9.1.
// makeVariety(variety, packets, seedsPerPacket) -> one variety object
// totalSeeds(list)                              -> a number
// lowPackets(list, level)                       -> a NEW array of varieties
// labelLines(list)                              -> a NEW array of strings
// sowPacket(list, variety)                      -> nothing (changes the list itself)
// saveTray(list) / loadTray()                   -> nothing / the list (or the seed)

// STEP 3: The five functions, under the contracts they came from.

function makeVariety(variety, packets, seedsPerPacket) {
  return { variety: variety, packets: packets, seedsPerPacket: seedsPerPacket };
}

function totalSeeds(list) {
  let total = 0;
  for (const variety of list) {
    total = total + variety.packets * variety.seedsPerPacket;
  }
  return total;
}

function lowPackets(list, level) {
  const short = [];
  for (const variety of list) {
    if (variety.packets < level) {
      short.push(variety);
    }
  }
  return short;
}

const labelLines = (list) => {
  return list.map((variety) => variety.variety + " x" + variety.packets);
};

// sowPacket changes the list it was handed. The caller holds the same
// array (3.6.2), so the change is already made when this returns --
// that is the side effect the PA asks for, and why this one returns
// nothing at all.
function sowPacket(list, variety) {
  for (const record of list) {
    if (record.variety === variety) {
      record.packets = Math.max(0, record.packets - 1);
    }
  }
}

function saveTray(list) {
  localStorage.setItem(trayKey, JSON.stringify(list));
}

function loadTray() {
  const text = localStorage.getItem(trayKey);
  if (text === null) {
    return tray.map(copyVariety);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    return tray.map(copyVariety);
  }
}

// Copies one record, so the seed list is never the list that gets
// sown from. 3.7.15 is the spread pattern.
function copyVariety(variety) {
  return { ...variety };
}

// STEP 4: The main section -- calls in the order the plan says.
console.log("Total seeds on hand: " + totalSeeds(tray));
console.log("Low packets (under " + packetLevel + "):");
console.log(labelLines(lowPackets(tray, packetLevel)).join("\n"));
console.log("Labels:");
console.log(labelLines(tray).join("\n"));

sowPacket(tray, "Basil");
console.log("Sowed one packet of Basil. New packets: " + tray[0].packets);

saveTray(tray);
const loaded = loadTray();
console.log("Reloaded from storage: " + loaded.length + " varieties.");
console.log(typeof loaded[0].seedsPerPacket);
