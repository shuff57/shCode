// Chapter 3 Test, Part 5 of 5: Write the Steps.
// Problem: Watering Rota
// Partners: N/A
// Date: 2026-11-04

// The rota as an array of record objects.
const rota = [
  { name: "Fern", ml: 120 },
  { name: "Aloe", ml: 60 },
  { name: "Basil", ml: 90 }
];
// The limit: the can holds 250 ml.
const canMl = 250;

// One function: the total (loop + accumulator, 3.3.12).
function totalWater(plants) {
  let total = 0;
  for (const plant of plants) {
    total = total + plant.ml;
  }
  return total;
}

// One function: the label (map + arrow, 3.7.2 + 3.4.6).
const label = (plant) => {
  return plant.name + ": " + plant.ml + " ml";
};

// One function: the non-mutating copy (spread, 3.7.15).
function topUp(plants, name, extraMl) {
  return plants.map((plant) =>
    plant.name === name ? { ...plant, ml: plant.ml + extraMl } : plant
  );
}

// The main section: calls in order.
console.log("Labels:");
for (const plant of rota) {
  console.log(label(plant));
}
console.log("Total water needed: " + totalWater(rota) + " ml");

const after = topUp(rota, "Fern", 30);
console.log("After topping up Fern: " + after[0].name + " needs " + after[0].ml + " ml");
console.log("Original untouched: " + rota[0].ml + " ml");
console.log(totalWater(rota) <= canMl ? "One fill is enough" : "One fill is not enough");

// The round trip (3.8.15).
localStorage.setItem("rota", JSON.stringify(after));
const loaded = JSON.parse(localStorage.getItem("rota"));
console.log("Reloaded " + loaded.length + " plants; typeof ml: " + typeof loaded[0].ml);
