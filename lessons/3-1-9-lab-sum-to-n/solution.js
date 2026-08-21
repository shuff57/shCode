function sumToN(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) {
    total = total + i;
  }
  return total;
}

console.log(sumToN(5));
console.log(sumToN(10));
