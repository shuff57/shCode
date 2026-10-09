function readSave(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return { error: "unreadable" };
  }
}

const settings = readSave('{"theme":"dark","fontSize":18}');
console.log(settings.theme);
console.log(readSave("corrupted!!"));
