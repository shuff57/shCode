import type { Requirement } from './types';

export interface GradeResult {
  id: string;
  title: string;
  status: 'passed' | 'failed';
  messages: string[];
  pointsEarned: number;
  pointsPossible: number;
}

export interface GradeReport {
  results: GradeResult[];
  totalScore: number;
  totalPossible: number;
  passed: boolean;
  passingScore: number;
}

// ---- Code preprocessing ----

// Strip JS // and /* */ comments so a commented-out answer can't pass a
// regex requirement. Respects strings so tokens inside "// not a comment"
// survive. Naive: no template-literal or regex-literal handling, which
// is fine for student moSHion code.
function stripJsComments(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  let inStr: string | null = null;
  while (i < n) {
    const c = src[i];
    const nx = src[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\' && i + 1 < n) { out += src[i + 1]; i += 2; continue; }
      if (c === inStr) inStr = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; out += c; i++; continue; }
    if (c === '/' && nx === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && nx === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Return the body of `function <name>(...) { ... }` by balancing braces,
// or null if the function isn't found. Lets requirements scope a pattern
// to e.g. draw()'s body instead of the whole file.
function extractFunctionBody(src: string, name: string): string | null {
  const re = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`);
  const m = src.match(re);
  if (!m || m.index === undefined) return null;
  let depth = 1;
  let i = m.index + m[0].length;
  const bodyStart = i;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(bodyStart, i);
    }
    i++;
  }
  return null;
}

// ---- Checkers ----

// Default flags is '' (case-sensitive). Set req.flags = 'i' explicitly if
// you want case-insensitive. moSHion identifiers (Canvas, Sprite, kb,
// world) are case-sensitive so strict is the right default.
function checkRegex(req: Requirement, files: Record<string, string>): boolean {
  const raw = files[req.file || ''] || '';
  const content = req.stripComments === false ? raw : stripJsComments(raw);
  const regex = new RegExp(req.pattern || '', req.flags ?? '');
  return regex.test(content);
}

function checkInFunction(req: Requirement, files: Record<string, string>): boolean {
  const raw = files[req.file || ''] || '';
  const content = stripJsComments(raw);
  const names = Array.isArray(req.function)
    ? req.function
    : [req.function || 'draw'];
  const bodies = names
    .map((n) => extractFunctionBody(content, n))
    .filter((b): b is string => b !== null);
  if (bodies.length === 0) return false;
  const combined = bodies.join('\n');
  const regex = new RegExp(req.pattern || '', req.flags ?? '');
  return regex.test(combined);
}

// ---- Main grader ----
export function grade(
  requirements: Requirement[],
  files: Record<string, string>,
  passingScore: number = 0
): GradeReport {
  const results: GradeResult[] = requirements.map((req) => {
    const type = req.type || 'regex';
    let passed = false;

    switch (type) {
      case 'regex':
        passed = checkRegex(req, files);
        break;
      case 'inFunction':
        passed = checkInFunction(req, files);
        break;
      case 'output':
      case 'function':
        // These require sandboxed execution via Web Worker (client-side only)
        passed = false;
        break;
      case 'custom':
        passed = false;
        break;
    }

    const points = req.points || 0;
    return {
      id: req.id,
      title: req.title,
      status: passed ? ('passed' as const) : ('failed' as const),
      messages: [],
      pointsEarned: passed ? points : 0,
      pointsPossible: points,
    };
  });

  const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.pointsPossible, 0);

  return {
    results,
    totalScore,
    totalPossible,
    passed: totalScore >= passingScore,
    passingScore,
  };
}
