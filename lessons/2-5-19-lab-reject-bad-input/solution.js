// 2.5.19 Reject the Bad Input
// A short password is rejected with a thrown error, and the catch reports
// the message. Change password to a longer value to see "Password accepted".

const password = "abc";

try {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  console.log("Password accepted");
} catch (err) {
  console.log(err.message);
}
