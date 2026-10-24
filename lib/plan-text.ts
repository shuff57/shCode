// A saved plan from a part that is WRITTEN pseudocode (3.9.1) rather than a
// drawn chart. Plain text, as written-grader-store keeps it. The panel that
// opens the next part uses this to tell the two draft kinds apart and to turn
// the text into the `//` comment lines that seed the student's editor.

/** True when `raw` is a saved DiagramDoc (the old chart drafts). */
export function isDiagramDraft(raw: string): boolean {
  try {
    const doc = JSON.parse(raw);
    return Array.isArray(doc?.nodes) && Array.isArray(doc?.edges);
  } catch {
    return false;
  }
}

/**
 * Each non-blank line of the plan as a `//` comment line, indentation kept
 * (so a loop body stays under its loop). Tabs become four spaces; a line the
 * student already started with `//` is not doubled.
 */
export function planTextToComments(raw: string): string[] {
  return raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\t/g, '    ').replace(/\s+$/, ''))
    .filter((l) => l.trim() !== '')
    .map((l) => {
      const indent = l.match(/^\s*/)![0];
      const body = l.slice(indent.length).replace(/^\/\/\s?/, '');
      return '// ' + indent + body;
    });
}
