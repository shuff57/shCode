// Shared by the handler tests: compile a Pages Function (and its real imports) to CJS, and a D1
// facade over node:sqlite with every migration applied, so SQL (ON CONFLICT, MAX) runs for real.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function compileHandler(entry, outDir) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const tsc = spawnSync('node', [
    join(root, 'node_modules/typescript/bin/tsc'), join(root, 'functions', entry),
    '--outDir', outDir, '--rootDir', join(root, 'functions'), '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop', '--types', '@cloudflare/workers-types',
  ], { cwd: root, encoding: 'utf8' });
  writeFileSync(join(outDir, 'package.json'), '{"type":"commonjs"}');
  const js = join(outDir, entry.replace(/\.ts$/, '.js'));
  if (!existsSync(js)) throw new Error(`tsc did not emit ${entry}\n${tsc.stdout}${tsc.stderr}`);
  return require(js);
}

export function makeD1() {
  const sqlite = new DatabaseSync(':memory:');
  for (const f of readdirSync(join(root, 'migrations')).filter((n) => n.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
  }
  const db = {
    sqlite,
    prepare(sql) {
      const st = sqlite.prepare(sql);
      let args = [];
      const stmt = {
        bind: (...a) => { args = a; return stmt; },
        first: async () => st.get(...args) ?? null,
        all: async () => ({ results: st.all(...args) }),
        run: async () => { st.run(...args); return { success: true }; },
      };
      return stmt;
    },
  };
  return db;
}
