**Goal:** Watch a single function change its output every time a different argument is handed to its one parameter.

## Step 1: A function with no parameter, called twice

Start with the fixed version. It says one sentence no matter what, and calling it twice proves it.

```js live plain
function greet() {
  console.log("Hello, Marisol!");
}

greet();
greet();
```

Two calls, the same output twice. The function has no way to know about anybody else.

## Step 2: Add one parameter

Now write a blank inside the parentheses and use it in the body. `name` is a parameter: it holds whatever value the call supplies.

```js live plain
function greet(name) {
  console.log("Hello, " + name + "!");
}

greet("Marisol");
greet("Dev");
greet("Priya");
```

One definition, three results. The `name` parameter took `"Marisol"`, then `"Dev"`, then `"Priya"`, one per call.

## Step 3: The parameter is a local variable for the call

Inside the body, `name` behaves like a normal variable for the length of that one call. You can use it in any expression, not just a print.

```js live plain
function greetingFor(name) {
  const message = "Welcome back, " + name + "!";
  console.log(message);
  console.log("Your name has " + name.length + " letters.");
}

greetingFor("Marisol");
greetingFor("Dev");
```

The second line uses `name.length`, so the function does arithmetic on the value it was handed. The parameter is not just a string to print; it is a variable the body can work with.

## Step 4: Change the argument, keep the code

Call the same function with a value of your own. Notice you change the *call*, never the definition.

```js live plain
function greet(name) {
  console.log("Hello, " + name + "!");
}

greet("your own name here");
```

That is the whole idea of a parameter: the function is written once, and the caller decides what it works on.

## Key takeaways

- A parameter is a name inside the parentheses that acts as a variable in the body.
- The value it holds is chosen at the call, one value per call.
- The same definition produces a different result for each argument.
- Inside the body the parameter can be printed, combined, measured, or used like any variable.
