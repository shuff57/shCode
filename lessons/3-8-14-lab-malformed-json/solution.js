function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return { error: "unreadable" };
  }
}

const settings = safeParse('{"theme":"dark","fontSize":18}');
console.log(settings.theme);
console.log(safeParse("corrupted!!"));
