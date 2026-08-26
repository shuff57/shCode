// 2.5.24 Guard Only What's Inside
// firstMissing is inside the try, so its error is caught. secondMissing
// sits outside the try...catch, so the same kind of mistake crashes the
// program: a try only catches errors thrown inside it.

try {
  console.log(firstMissing);
} catch (err) {
  console.log("Caught the first one.");
}

console.log(secondMissing);
