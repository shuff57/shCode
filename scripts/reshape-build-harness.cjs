// Runs generated JSCAD source for real and measures what came out.
//
// Extracted so a compatibility gate can build geometry without importing
// scripts/model-codegen-assertions.cjs, whose build() is private to its run()
// and whose file is deliberately hands-off during a gauntlet. Same sandbox
// recipe: the modeling bundle, then reshape.js on top, because the generated
// code calls shCAD's bare names and genuinely does not work without them.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/** A context with the vendored bundle and the shCAD globals already in it. */
function makeSandbox() {
  const bundlePath = path.join(__dirname, '..', 'public', 'reshape', 'lib', 'jscad-modeling.min.js');
  const simplePath = path.join(__dirname, '..', 'public', 'reshape', 'reshape.js');
  for (const p of [bundlePath, simplePath]) {
    if (!fs.existsSync(p)) throw new Error(`missing ${path.relative(process.cwd(), p)}`);
  }
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(bundlePath, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(simplePath, 'utf8'), sandbox);
  return sandbox;
}

/**
 * Build generated source at its default parameter values.
 *
 * Returns { volume, bbox }. Volume is measured, not inferred from the source
 * text -- a check that only reads the emitted string cannot tell a correct
 * outline from an empty one, and an empty one is exactly what a dropped
 * sketch produces.
 */
function build(src, sandbox = makeSandbox()) {
  const M = sandbox.jscadModeling;
  const mod = { exports: {} };
  const run = vm.runInContext(
    '(function (require, module) {' + src + String.fromCharCode(10) + '})',
    sandbox
  );
  run((n) => {
    if (n !== '@jscad/modeling') throw new Error('unexpected require: ' + n);
    return M;
  }, mod);

  const params = {};
  for (const d of mod.exports.getParameterDefinitions()) params[d.name] = d.initial;
  const g = mod.exports.main(params);
  const list = Array.isArray(g) ? g : [g];
  const volume = list.reduce((n, s) => n + M.measurements.measureVolume(s), 0);
  const bbox = M.measurements.measureBoundingBox(list.length === 1 ? list[0] : M.booleans.union(list));
  return { volume, bbox, solids: list.length };
}

module.exports = { makeSandbox, build };
