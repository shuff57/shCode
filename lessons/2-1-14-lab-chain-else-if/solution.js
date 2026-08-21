// 2.1.8 Chain Three Branches

const batteryPercent = 65;

if (batteryPercent < 20) {
  console.log("Low battery");
} else if (batteryPercent < 50) {
  console.log("Battery ok");
} else if (batteryPercent < 90) {
  console.log("Battery good");
} else {
  console.log("Battery full");
}
