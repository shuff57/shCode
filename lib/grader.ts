import type { Requirement } from './types';

export interface GradeResult {
  id: string;
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

// ---- Regex checker (existing behavior) ----
function checkRegex(req: Requirement, files: Record<string, string>): boolean {
  const content = files[req.file || ''] || '';
  const regex = new RegExp(req.pattern || '', req.flags || 'i');
  return regex.test(content);
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
      status: passed ? ('passed' as const) : ('failed' as const),
      messages: passed ? [] : [req.description],
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
