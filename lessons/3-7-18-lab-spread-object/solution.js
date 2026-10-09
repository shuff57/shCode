const settings = { theme: "dark", fontSize: 14, wrap: true };

const changed = { ...settings, fontSize: 18 };
const extended = { ...settings, language: "en" };

console.log(changed);
console.log(extended);
console.log(settings);
