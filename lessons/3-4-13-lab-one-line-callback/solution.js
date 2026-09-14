function transform(value, fn) {
  return fn(value);
}

console.log(transform(6, (n) => n + 4));
