// 2.1.11 Nest a Check

const isLoggedIn = true;
const isAdmin = true;

if (isLoggedIn) {
  if (isAdmin) {
    console.log("Welcome, admin.");
  } else {
    console.log("Welcome, user.");
  }
} else {
  console.log("Please log in.");
}
