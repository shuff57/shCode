function countMatching(numbers, test) {
  let count = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (test(numbers[i])) {
      count = count + 1;
    }
  }
  return count;
}

const readings = [4, -2, 7, 0, -9, 3];

console.log(countMatching(readings, (n) => n > 0));
console.log(countMatching(readings, (n) => n % 2 === 0));
