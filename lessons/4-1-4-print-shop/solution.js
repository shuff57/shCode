// Print Shop: Q1 Synthesis Project

// Filament cost per gram, kept in one place so it's easy to change.
const FILAMENT_COST_PER_GRAM = {
  PLA: 0.03,
  PETG: 0.04,
  ABS: 0.035,
};

// Rough estimates: about 15,000 cubic mm printed per hour, and about
// 0.00124 grams of filament used per cubic mm of the part's bounding box.
const HOURS_PER_CUBIC_MM = 1 / 15000;
const GRAMS_PER_CUBIC_MM = 0.00124;
const MACHINE_COST_PER_HOUR = 1.5;

// STEP 1: at least 5 orders, each an object with name/width/height/depth/filament/priority.
const orders = [
  { name: "Ava's bracket", width: 40, height: 20, depth: 15, filament: "PLA", priority: 2 },
  { name: "Ben's phone stand", width: 80, height: 60, depth: 40, filament: "PETG", priority: 1 },
  { name: "Cleo's gear", width: 25, height: 25, depth: 10, filament: "PLA", priority: 3 },
  { name: "Drew's enclosure", width: 120, height: 80, depth: 60, filament: "ABS", priority: 1 },
  { name: "Emi's keychain", width: 15, height: 15, depth: 5, filament: "PLA", priority: 4 },
];

// STEP 2: estimated print time from the order's volume.
function estimateHours(order) {
  const volume = order.width * order.height * order.depth;
  return volume * HOURS_PER_CUBIC_MM;
}

// STEP 3: price = filament grams * cost/gram, plus machine time.
function priceOf(order) {
  const volume = order.width * order.height * order.depth;
  const grams = volume * GRAMS_PER_CUBIC_MM;
  const costPerGram = FILAMENT_COST_PER_GRAM[order.filament] || FILAMENT_COST_PER_GRAM.PLA;
  const materialCost = grams * costPerGram;
  const machineCost = estimateHours(order) * MACHINE_COST_PER_HOUR;
  return materialCost + machineCost;
}

// STEP 4: does the order fit inside the printer's build volume?
function fitsInVolume(order, maxW, maxH, maxD) {
  return order.width <= maxW && order.height <= maxH && order.depth <= maxD;
}

// STEP 5: most urgent (lowest priority number) first. Does not mutate the original.
function sortByPriority(list) {
  const copy = [...list];
  copy.sort((a, b) => a.priority - b.priority);
  return copy;
}

// STEP 6: persist the queue between reloads.
function saveQueue() {
  localStorage.setItem("printQueue", JSON.stringify(orders));
}

function loadQueue() {
  const raw = localStorage.getItem("printQueue");
  return raw ? JSON.parse(raw): [];
}

// STEP 7: main program: everything above is definitions, this is what runs.
saveQueue();
const loadedOrders = loadQueue();
const sortedQueue = sortByPriority(loadedOrders);

let totalMade = 0;
let totalHours = 0;
for (let i = 0; i < sortedQueue.length; i++) {
  totalMade += priceOf(sortedQueue[i]);
  totalHours += estimateHours(sortedQueue[i]);
}

console.log("You made $" + totalMade.toFixed(2) + "; queue is " + totalHours.toFixed(1) + " hours");

// STEP 8: three manual tests, one of them an edge case.
const testCube = { name: "Test cube", width: 10, height: 10, depth: 10, filament: "PLA", priority: 1 };
const expectedHours = (10 * 10 * 10) * HOURS_PER_CUBIC_MM;
console.log(estimateHours(testCube) === expectedHours ? "PASS": "FAIL");

const sortedSample = sortByPriority([
  { name: "Low urgency", priority: 5 },
  { name: "High urgency", priority: 1 },
]);
console.log(sortedSample[0].priority === 1 ? "PASS": "FAIL");

// Edge case: an order too big for the printer's build volume should not fit.
const oversizedOrder = { name: "Oversized", width: 500, height: 500, depth: 500, filament: "PLA", priority: 1 };
console.log(fitsInVolume(oversizedOrder, 200, 200, 200) === false ? "PASS": "FAIL");
