// Host-owned file labels for composed project scripts. No source is evaluated.
export function sourceLocation(line, locations = []) {
  if (!Number.isInteger(line) || line < 1) return null;
  const section = locations.find(s => typeof s.file === 'string' && line >= s.start && line <= s.end);
  return section ? { file: section.file, line: line - section.start + 1 } : null;
}
