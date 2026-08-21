// 2.5.20 What Happens After a throw?
// Prediction: "start" prints, then the throw abandons the rest of the try
// block, so "after the throw" never prints. The catch prints the message.
// A throw abandons the rest of the block, exactly like a runtime error.

try {
  console.log("start");
  throw new Error("stop right here");
  console.log("after the throw");
} catch (err) {
  console.log("caught: " + err.message);
}
