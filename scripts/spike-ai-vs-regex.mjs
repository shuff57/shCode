// SPIKE: weak-but-correct answers to 3.5.22, graded by the shipped regex grade() and by the real AI route.
import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-spike2-'));
const lesson = JSON.parse(readFileSync(path.join(root, 'lessons/3-5-22-lab-destructure-three/lesson.json'), 'utf8'));
const cases = {
  'A: renamed on unpack (title: t), arrow fn, template string': `const item = { title: "Pen", cost: 2, quantity: 10 };
const { title: t, cost: c, quantity: q } = item;
console.log(\`\${t} costs \${c}, \${q} left\`);
const describe = ({ title, quantity }) => \`\${title} x\${quantity}\`;
console.log(describe(item));`,
  'B: default param value, sentence built with commas': `const book = { name: "Dune", price: 9, pages: 412 }
const {name, price, pages} = book
console.log("Book:", name, "price:", price, "pages:", pages)
function describe({name, pages} = {}) {
  return ["Title", name, "has", pages, "pages"].join(" ")
}
console.log(describe(book))`,
  'C: very short, no frills': `const o={a:"x",b:1,c:2}
const {a,b,c}=o
console.log(a,b,c)
const f=({a,b})=>a+b
console.log(f(o))`,
};
try {
  execFileSync(process.execPath, [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), 'lib/grader.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'], { cwd: root, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const { grade } = createRequire(import.meta.url)(path.join(out, 'grader.js'));
  const regexReqs = lesson.requirements.filter((r) => r.type === 'regex');
  for (const [name, code] of Object.entries(cases)) {
    const rep = grade(regexReqs, { 'script.js': code }, 0, {});
    console.log(`\n${name}\n  deterministic (regex r1-r3):`, rep.results ? rep.results.map((x) => `${x.id}=${x.status}`).join(' ') : JSON.stringify(rep).slice(0, 300));
  }
} finally { rmSync(out, { recursive: true, force: true }); }
