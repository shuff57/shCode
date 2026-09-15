// 3.1.9 Terms and Conditions Loop

function terms() {
  console.log("Do you accept the terms and conditions?");
  const answer = prompt("Enter Y or N:");
  if (answer === "Y") {
    console.log("Thank you for accepting.");
  } else {
    console.log("Have a good day.");
  }
}

const numUsers = Number(prompt("How many users?"));
for (let i = 0; i < numUsers; i++) {
  terms();
}
