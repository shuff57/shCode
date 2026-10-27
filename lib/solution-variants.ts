// A lesson's reference answer can carry one alternative write-up per problem the
// Chapter 3 group PA offers. They live INSIDE the usual solution directory:
//
//   lessons/<id>/solution/script.js                 the default answer
//   lessons/<id>/solution/variants/lap-times/script.js
//   lessons/<id>/solution/variants/seed-tray/script.js
//
// That placement is deliberate: /api/lesson-solution already returns every file
// under solution/ keyed by its path, so a variant arrives as
// `variants/lap-times/script.js` with no server change at all. This module turns
// that flat map back into the groups the Solution panel offers, and strips the
// `variants/<problem>/` prefix so an insert puts `script.js` at `script.js`
// rather than at a path the editor does not have.
//
// The default answer is the one problem the variants do NOT cover, which is how
// the panel can label it "Snack Shack" without a second manifest to keep in
// step. A lesson with no variants gets one unlabelled group, exactly as before.

export interface SolutionGroup {
  /** `default`, or the problem directory name. */
  id: string;
  /** A menu label: "Snack Shack", "Lap Times", ... */
  label: string;
  /** Files with the variant prefix already stripped. */
  files: Record<string, string>;
}

// The four problems, in the order the lessons list them. This also decides the
// order of the menu, so it does not jump around between lessons.
const PROBLEM_ORDER = ['snack-shack', 'lap-times', 'seed-tray', 'library-cart'];

const LABELS: Record<string, string> = {
  'snack-shack': 'Snack Shack',
  'lap-times': 'Lap Times',
  'seed-tray': 'Seed Tray',
  'library-cart': 'Library Cart',
};

const VARIANT_PATH = /^variants\/([^/]+)\/(.+)$/;

export function solutionVariantLabel(id: string): string {
  return (
    LABELS[id] ??
    id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function problemRank(id: string): number {
  const i = PROBLEM_ORDER.indexOf(id);
  return i === -1 ? PROBLEM_ORDER.length : i;
}

/**
 * Split the flat `files` map from /api/lesson-solution into the default answer
 * and one group per problem. `files` is empty or absent -> [].
 */
export function groupSolutionFiles(
  files: Record<string, string> | null | undefined,
): SolutionGroup[] {
  if (!files) return [];

  const base: Record<string, string> = {};
  const variants = new Map<string, Record<string, string>>();

  for (const [path, text] of Object.entries(files)) {
    const m = VARIANT_PATH.exec(path);
    if (!m) {
      base[path] = text;
      continue;
    }
    const [, id, relative] = m;
    let group = variants.get(id);
    if (!group) {
      group = {};
      variants.set(id, group);
    }
    group[relative] = text;
  }

  const groups: SolutionGroup[] = [];

  if (Object.keys(base).length > 0) {
    // No variants at all: the label is never shown (no picker), so keep it
    // generic rather than claiming a problem.
    const uncovered =
      variants.size === 0 ? null : PROBLEM_ORDER.find((id) => !variants.has(id));
    groups.push({
      id: 'default',
      label: uncovered ? LABELS[uncovered] : 'Reference answer',
      files: base,
    });
  }

  const ids = [...variants.keys()].sort(
    (a, b) => problemRank(a) - problemRank(b) || a.localeCompare(b),
  );
  for (const id of ids) {
    groups.push({ id, label: solutionVariantLabel(id), files: variants.get(id)! });
  }

  return groups;
}
