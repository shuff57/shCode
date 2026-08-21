// 2.4.33 Challenges — Optional Stretch
//
// CHALLENGE 1: Hollow square — border rows/cols get "#", inside is space.
for (let row = 1; row <= 6; row++) {
  let line = "";
  for (let col = 1; col <= 6; col++) {
    if (row === 1 || row === 6 || col === 1 || col === 6) {
      line = line + "#";
    } else {
      line = line + " ";
    }
  }
  console.log(line);
}

// CHALLENGE 2: Sum every third number (1 to 50).
let total = 0;
for (let i = 1; i <= 50; i++) {
  if (i % 3 !== 0) {
    continue;
  }
  total = total + i;
}
console.log(total);

// CHALLENGE 3: Multiplication table, skip rows whose outer number is
// a multiple of 5.
for (let outer = 1; outer <= 12; outer++) {
  if (outer % 5 === 0) {
    continue;
  }
  let row = "";
  for (let inner = 1; inner <= 12; inner++) {
    row = row + (outer * inner) + " ";
  }
  console.log(row);
}
