function describeBox(options) {
  return options.color + " box, " + options.width + "x" + options.height + "x" + options.depth;
}

console.log(describeBox({ width: 10, height: 4, depth: 6, color: "red" }));
console.log(describeBox({ color: "blue", depth: 6, height: 4, width: 10 }));
