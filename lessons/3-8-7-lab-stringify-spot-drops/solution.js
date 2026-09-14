const counter = {
  count: 5,
  describe: function () {
    return "I am a counter.";
  },
  note: undefined
};

const json = JSON.stringify(counter);

console.log(json);
