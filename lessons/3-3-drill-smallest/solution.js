function smallest(numbers) {
  let best = numbers[0];
  for (let n of numbers) {
    if (n < best) {
      best = n;
    }
  }
  return best;
}

console.log(smallest([4, 2, 9]));   // 2
