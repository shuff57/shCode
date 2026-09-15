function bigger(numbers) {
  let result = [];
  for (let n of numbers) {
    result.push(n * 2);
  }
  return result;
}

let sample = [1, 2, 3];
let output = bigger(sample);

console.log(output);   // [2, 4, 6]
console.log(sample);   // [1, 2, 3] -- untouched
