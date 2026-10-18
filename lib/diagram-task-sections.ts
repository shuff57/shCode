// The part of a flowchart lesson's content.md worth keeping open beside the
// canvas in full screen: what to draw, the rules that decide it, and the
// pre-submit checklist. Headings differ lesson to lesson, so this matches the
// ones the 41 diagram lessons actually use. A lesson with none of them gets
// the whole text, which is long but never empty.

const TASK_HEADING = /^(what to draw|your job|rules for your chart|before you submit|the (three )?arrows .*(right|matter)|the (three )?things .*right)/i;

export function taskSections(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const parts: { heading: string; body: string[] }[] = [{ heading: '', body: [] }];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h = !inFence && /^#{2,3}\s+(.*)$/.exec(line);
    if (h) parts.push({ heading: h[1].trim(), body: [line] });
    else parts[parts.length - 1].body.push(line);
  }
  const keep = parts.filter((p) => p.heading && TASK_HEADING.test(p.heading));
  if (keep.length === 0) return md.trim();
  return keep.map((p) => p.body.join('\n').trim()).join('\n\n');
}
