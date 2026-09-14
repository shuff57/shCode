const prices = [];
prices.push(10);
prices.push(20);
prices.push(30);
prices.push(40);
prices.push(50);

const withTax = prices.map((price) => price * 1.08);
const middle = withTax.slice(1, 4);

const extra = [99];
const joined = middle.concat(extra);

const settings = { theme: "dark", fontSize: 14 };
const bigger = { ...settings, fontSize: 18 };

console.log(withTax);
console.log(middle);
console.log(joined);
console.log(bigger);
console.log(settings);
console.log(prices);
