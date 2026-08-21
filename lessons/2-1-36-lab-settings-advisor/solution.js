// 2.1.37 Print Settings Advisor

const filamentType = "PLA";
const layerHeight = 0.2;

if (filamentType === "PLA") {
  console.log(200);
} else if (filamentType === "PETG") {
  console.log(235);
} else if (filamentType === "ABS") {
  console.log(250);
} else {
  console.log("Unknown filament type");
}

if (layerHeight < 0.1 || layerHeight > 0.4) {
  console.log("Warning: layer height is outside the safe range.");
}
