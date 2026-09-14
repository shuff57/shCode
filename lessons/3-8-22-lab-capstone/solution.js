const defaults = { score: 0, level: 1 };

function saveState(state) {
  localStorage.setItem("state", JSON.stringify(state));
}

function loadState() {
  const text = localStorage.getItem("state");
  if (text === null) {
    return defaults;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    return defaults;
  }
}

saveState({ score: 75, level: 5 });

const restored = loadState();
console.log(restored.score);
