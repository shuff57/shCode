## Plain English to Pseudocode: Reassignment vs. Mutation Trace

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Telling two writes to the same name apart: one mutates, one reassigns
- Saying what the caller sees after each write
- Reading a flow chart and matching each box to a step

### The plan, in plain English

A trace is a picture of a program running, step by step. This one follows a function that does the two kinds of write you met in this module to the same array, one after the other, so the difference is impossible to blur. The caller has `scores = [10, 20, 30]` and calls `process(scores)`. Inside, `nums` is a second name for that same array: **two names, one array**.

1. Set item 0 of `nums` to 0.
2. Ask: did the caller see that? Yes, because `nums` and `scores` are the same array.
3. Point `nums` at a brand new array, `[9, 9]`.
4. Ask: did the caller see that? No, only the local name moved.
5. Back in the caller, `scores` prints as `[0, 20, 30]`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
function process(nums) {
  nums[0] = 0;
  nums = [9, 9];
}

let scores = [10, 20, 30];
process(scores);
console.log(scores);
```

Before you write anything, predict the output. Then run it in your head line by line.

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `SET item 0 OF nums TO 0` | the **mutation**: writes into the one shared array |
| `ASK did the caller see this? YES ...` | the question after the write, and its answer |
| `SET nums TO a NEW array [9, 9]` | the **reassignment**: points `nums` somewhere else |
| `OUTPUT scores` | what the caller prints |

### The two writes to keep apart

1. **`nums[0] = 0`** reaches into the one array and changes an element. The caller's `scores` points at that same array, so the caller sees it.

2. **`nums = [9, 9]`** points the function's own name at a brand-new array. Only the local name moved. The caller's `scores` still points where it did, so the caller sees nothing.

The two questions take **different** answers. That is the whole point of the lab.

### Before you submit

Press **Grade** above the editor, then run the code and check that your last step matches what really prints. If you wrote `[9, 9]` there, the trace went wrong at the reassignment: that new array lives and dies inside the function.
