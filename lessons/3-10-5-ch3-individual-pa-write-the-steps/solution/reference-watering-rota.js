// Chapter 3 Test, Part 5 of 5: Write the Steps.
// Problem: Watering Rota
// Partners: N/A
// Date: 2026-11-04

// The rota as an array of record objects.
const ROTA = [
  { name: "Fern", ml: 120, watered: false },
  { name: "Aloe", ml: 60, watered: false },
  { name: "Basil", ml: 90, watered: false }
];
const canMl = 250;

// One function: the total (loop + accumulator, 3.3.9).
function totalWater(plants) {
  let total = 0;
  for (const plant of plants) {
    total = total + plant.ml;
  }
  return total;
}

// One function: the label (map + arrow, 3.7.2 + 3.4.6).
const label = (plant) => {
  return plant.name + " — " + plant.ml + " ml";
};

// One function: the non-mutating copy (spread, 3.7.15).
function waterOne(plants, name) {
  return plants.map((plant) =>
    plant.name === name ? { ...plant, watered: true } : plant
  );
}

// The main section: calls in order.
console.log("Labels:");
console.log(ROTA.map(label).join("\n"));
console.log("Total water needed: " + totalWater(ROTA) + " ml");

const after = waterOne(ROTA, "Fern");
console.log("After watering Fern: " + after[0].name + " watered = " + after[0].watered);
console.log("Original untouched: " + ROTA[0].watered);

// The round trip (3.8.15).
localStorage.setItem("rota", JSON.stringify(after));
const loaded = JSON.parse(localStorage.getItem("rota"));
console.log("Reloaded " + loaded.length + " plants; typeof ml: " + typeof loaded[0].ml);
