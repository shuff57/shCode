// 2.5.26 A2.5.1 -- Loop with try/catch
// Three sensor readings arrive as text. Each is converted and validated
// inside a try, so a bad reading is reported and skipped instead of
// crashing the whole loop.

for (let i = 1; i <= 3; i++) {
  let raw;
  if (i === 1) {
    raw = "12";
  } else if (i === 2) {
    raw = "abc";
  } else {
    raw = "-4";
  }

  try {
    const value = Number(raw);
    if (Number.isNaN(value)) {
      throw new Error("Reading " + i + " is not a number: " + raw);
    }
    if (value <= 0) {
      throw new Error("Reading " + i + " must be positive, got " + raw);
    }
    console.log("Reading " + i + ": " + value);
  } catch (err) {
    console.log("Skipped reading " + i + ": " + err.message);
  }
}
