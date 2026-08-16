## Two ditches, one road

Make names **descriptive but concise**. There is a ditch on each side of that.

**Ditch one: too vague.** `data`, `value`, `info`, `thing`, `stuff`, `temp`, `result`. These are real words, which makes them feel like real names, and they say nothing about what is actually in there. Every variable holds data. Every variable holds a value. Naming one `data` is like labelling a box "box".

Use them only when the surrounding code makes the meaning completely obvious — and that is rarer than it feels while you are writing it.

**Ditch two: too long.** `theCurrentlyLoggedInUsersShoppingCartTotalPriceInDollars` is descriptive and nobody will read it. Long names get skimmed, mistyped, and abbreviated by the next person anyway. `cartTotal` is better, and it is better *because* it is shorter.

The road between them: **as short as it can be while still being unambiguous in context.** Inside code that is clearly about a shopping cart, `total` may be plenty. In a file that handles three kinds of total, it is not.

| Too vague | Just right | Too long |
|---|---|---|
| `data` | `studentScores` | `arrayOfAllStudentScoreValues` |
| `value` | `unitPrice` | `priceOfASingleUnitInDollars` |
| `temp` | `bodyTemperature` | `patientsCurrentBodyTemperatureReading` |

**What you'll learn from it:**
- `data`, `value` and `info` are too vague to help a reader.
- Names can also be too long — those get skimmed and mistyped.
- Aim for the shortest name that is still unambiguous *in context*.
- Context decides: `total` is fine in some files and hopeless in others.

**Try it:**

```js live plain
// Too vague — three names, no information
let data = 88;
let value = "Maya";
let result = value + " got " + data;
console.log(result);

// Descriptive and concise
let examScore = 88;
let studentName = "Maya";
let report = studentName + " got " + examScore;
console.log(report);
```

`result` in the first version is the trap worth naming. It feels descriptive — it *is* the result — but every calculation produces a result, so the word adds nothing. `report` says what kind of result it is.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **vague name** | A real word that carries no information — `data`, `value`, `stuff` |
| **concise** | As short as it can be while staying unambiguous |
| **unambiguous** | Only one sensible reading, given the code around it |
| **context** | The surrounding code, which decides how much a name has to say |
