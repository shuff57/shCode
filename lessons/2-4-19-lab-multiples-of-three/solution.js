// 2.4.19 Multiples of 3 with continue
//
// Loop 1 to 20 and print only the multiples of 3.
for (let i = 1; i <= 20; i++) {
  if (i % 3 !== 0) {
    continue;
  }
  console.log(i);
}
