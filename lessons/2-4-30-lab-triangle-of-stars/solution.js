// 2.4.30 Triangle of Stars
//
// Print:
//   *
//   **
//   ***
//   ****
//   *****

for (let row = 1; row <= 5; row++) {
  let line = "";
  for (let star = 1; star <= row; star++) {
    line = line + "*";
  }
  console.log(line);
}
