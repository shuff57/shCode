export interface LabTaskScenario {
  scenario: string;
  /** Only a leading, standalone comment is eligible for editor folding. */
  fold: { from: number; to: number; text: string; prefix: string } | null;
}

/** The task card and editor must agree on which authored scenario is repeated. */
export function extractLabTaskScenario(starter: string): LabTaskScenario | null {
  const match = /^\/\/[ \t]*STEP[ \t]+\d+:[^\n]*(?:\n\/\/[^\n]+)*/im.exec(starter);
  if (!match) return null;
  const scenario = match[0]
    .replace(/^\/\/\s*/gm, '')
    .replace(/^STEP\s+\d+:\s*/i, '')
    .split(/Choose from:/i)[0]
    .replace(/\s+/g, ' ').trim();
  if (!scenario) return null;
  // Fold only a real scenario block (3+ comment lines, one STEP marker): a lone one-line
  // STEP comment is already short, and hiding it would hide the step marker itself.
  const blockLines = match[0].split('\n').length;
  const stepMarkers = (match[0].match(/STEP[ \t]+\d+:/gi) || []).length;
  const foldable = blockLines >= 3 && stepMarkers === 1;
  // A title comment and blank lines may precede the scenario, but never code.
  const leading = starter.slice(0, match.index).split('\n')
    .every((line) => /^\s*(?:\/\/.*)?$/.test(line));
  return {
    scenario,
    fold: leading && foldable ? { from: match.index, to: match.index + match[0].length, text: match[0], prefix: starter.slice(0, match.index) } : null,
  };
}
