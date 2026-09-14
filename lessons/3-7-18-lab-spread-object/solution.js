const settings = { theme: "dark", fontSize: 14, wrap: true };

const bigger = { ...settings, fontSize: 18 };
const localized = { ...settings, language: "en" };

console.log(bigger);
console.log(localized);
console.log(settings);
