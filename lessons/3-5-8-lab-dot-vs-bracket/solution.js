const laptop = { brand: "Framework", ram: 16, "screen size": 13 };
const wanted = "ram";

console.log(laptop["screen size"]);
console.log(laptop[wanted]);

for (const key of Object.keys(laptop)) {
  console.log(key + ": " + laptop[key]);
}
