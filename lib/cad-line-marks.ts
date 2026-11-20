// Lines of the code-first CAD workspace marked in the editor: a refused step's line, or the line a script error
// stopped at. Each mark carries its sentence as the line's tooltip. The marks are made once per Run and follow the
// text as the student edits (a line typed above a mark moves it down); a mark whose line is deleted goes with it.
import { StateField, type Extension, type Range } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';

export interface LineMark { line: number; text: string }

const theme = EditorView.baseTheme({
  '.cm-cad-refused': { backgroundColor: 'color-mix(in srgb, var(--c-red, #ff5555) 16%, transparent)', boxShadow: 'inset 3px 0 0 var(--c-red, #ff5555)' },
});

/** An extension marking these lines (1-based) of the document it is put into; lines past the end are left out. */
export function cadLineMarks(marks: LineMark[]): Extension {
  if (!marks.length) return [];
  const field = StateField.define<DecorationSet>({
    create(state) {
      const byLine = new Map<number, string[]>();
      for (const m of marks) if (Number.isInteger(m.line) && m.line >= 1 && m.line <= state.doc.lines) byLine.set(m.line, [...(byLine.get(m.line) ?? []), m.text]);
      const ranges: Range<Decoration>[] = [...byLine].sort((a, b) => a[0] - b[0])
        .map(([line, texts]) => Decoration.line({ class: 'cm-cad-refused', attributes: { title: texts.join('\n') } }).range(state.doc.line(line).from));
      return Decoration.set(ranges);
    },
    update(value, tr) { return tr.docChanged ? value.map(tr.changes) : value; },
    provide: f => EditorView.decorations.from(f),
  });
  return [field, theme];
}
