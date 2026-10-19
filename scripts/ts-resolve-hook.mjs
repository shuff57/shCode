import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SUFFIXES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const missing = err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT';
    if (!missing || !context.parentURL || !/^\.{1,2}\//.test(specifier)) throw err;
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    for (const suffix of SUFFIXES) {
      const file = base + suffix;
      if (existsSync(file) && statSync(file).isFile()) {
        return nextResolve(pathToFileURL(file).href, context);
      }
    }
    throw err;
  }
}

// Node strips .ts types itself but has no JSX, so .tsx goes through TypeScript's
// own transpiler (already a dev dependency), automatic runtime like Next/Bun.
let ts;
export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:') || !url.endsWith('.tsx')) return nextLoad(url, context);
  ts ??= (await import('typescript')).default;
  const { source } = await nextLoad(url, { ...context, format: 'module' });
  const text = typeof source === 'string' ? source : Buffer.from(source).toString('utf8');
  const out = ts.transpileModule(text, {
    fileName: fileURLToPath(url),
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return { format: 'module', source: out.outputText, shortCircuit: true };
}
