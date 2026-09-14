const defaults = { score: 0, level: 1 };

localStorage.setItem("state", JSON.stringify({ score: 90, level: 4 }));

const text = localStorage.getItem("state");

let restored;
if (text === null) {
  restored = defaults;
} else {
  try {
    restored = JSON.parse(text);
  } catch (err) {
    restored = defaults;
  }
}

console.log(restored.score);
