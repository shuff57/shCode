function countWords(text) {
  const words = text.split(" ");
  return words.length;
}

console.log(countWords("one two three"));   // 3
