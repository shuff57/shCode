// Web Worker for sandboxed student code execution
// SECURITY: This runs in a Web Worker (separate thread, no DOM access).
// Student code is intentionally evaluated here as part of the grading system.
// The Worker sandbox isolates execution from the main page.
//
// Receives: { type: 'output'|'function', code: string, testFn?: string, expected?: string }
// Returns:  { passed: boolean }

self.onmessage = function (e) {
  var data = e.data;
  var type = data.type;
  var code = data.code;
  var testFn = data.testFn;
  var expected = data.expected;
  var passed = false;

  try {
    if (type === 'output') {
      var logs = [];
      var mockConsole = {
        log: function () {
          logs.push(Array.from(arguments).join(' '));
        },
        warn: function () {},
        error: function () {},
        info: function () {},
      };
      // Intentional: evaluating student code for grading in isolated Worker
      var fn = new Function('console', code); // eslint-disable-line no-new-func
      fn(mockConsole);
      var output = logs.join('\n');
      passed = new RegExp(expected || '', 'i').test(output);
    } else if (type === 'function') {
      // Intentional: evaluating student code + teacher test for grading
      var fn2 = new Function(code + '\n' + testFn + '\nreturn test();'); // eslint-disable-line no-new-func
      passed = fn2() === true;
    }
  } catch (err) {
    passed = false;
  }

  self.postMessage({ passed: passed });
};
