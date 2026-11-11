import { EditorSelection, StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
import type { LabTaskScenario } from './lab-task-scenario';

/** What the folded comment shows. `quiet` is used when the "Your task" panel is on screen
 *  beside the editor: it already shows the same scenario, so the fold is a short quiet label
 *  ("⋯ 5 comment lines (task notes)") that says what is hidden and that it opens, rather than a
 *  second copy of the words "Task card" or a bare "⋯" beside skipped line numbers. The document
 *  is the same either way. `lines` is how many comment lines the fold hides. */
export function taskFoldMarker(quiet: boolean, lines = 0): { text: string; label: string } {
  const count = lines > 0 ? `${lines} comment ${lines === 1 ? 'line' : 'lines'}` : 'comment lines';
  return quiet
    ? { text: `⋯ ${count} (task notes)`, label: `${count[0].toUpperCase()}${count.slice(1)} folded: the task notes, the same task as in Your task. Click or press Enter to show them.` }
    : { text: '// ▸ Task card (click to show)', label: 'Task shown in the task card. Click or press Enter to show the original comment.' };
}

/** How many lines of comment a fold hides (blank lines inside it are not counted). */
export function foldedLineCount(text: string): number {
  return text.split('\n').filter((line) => line.trim() !== '').length;
}

/** Presentation only: no document changes, history entries, or save callbacks. */
export function taskCommentFold(task: LabTaskScenario | null, opts: { quiet?: boolean } = {}): Extension {
  const range = task?.fold;
  if (!range) return [];
  const reveal = StateEffect.define<null>();
  const marker = taskFoldMarker(!!opts.quiet, foldedLineCount(range.text));

  class TaskWidget extends WidgetType {
    toDOM(view: EditorView) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = opts.quiet ? 'cm-taskCommentFold is-quiet' : 'cm-taskCommentFold';
      button.textContent = marker.text;
      button.setAttribute('aria-expanded', 'false');
      button.title = marker.label;
      if (opts.quiet) button.setAttribute('aria-label', marker.label);
      const show = () => {
        const folded = view.state.field(field).iter();
        if (!folded.value) return;
        view.dispatch({ effects: reveal.of(null), selection: EditorSelection.cursor(folded.from) });
        view.focus();
      };
      button.addEventListener('click', show);
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          show();
        }
      });
      return button;
    }
  }

  const field = StateField.define<DecorationSet>({
    create(state) {
      // Saved answers with an edited scenario must remain fully visible.
      return state.doc.sliceString(0, range.to) === range.prefix + range.text
        ? Decoration.set([Decoration.replace({ widget: new TaskWidget() }).range(range.from, range.to)])
        : Decoration.none;
    },
    update(folded, transaction) {
      if (!folded.size) return folded; // Never auto-refold after revealing/editing.
      if (transaction.effects.some((effect) => effect.is(reveal))) return Decoration.none;
      const { to } = folded.iter();
      let touched = false;
      transaction.changes.iterChangedRanges((start) => {
        // A preceding edit could put the comment inside a string or code.
        if (start <= to) touched = true;
      });
      if (touched) return Decoration.none;
      const mapped = folded.map(transaction.changes);
      const next = mapped.iter();
      // Keyboard navigation or a console jump into the comment reveals it too.
      if (transaction.selection && transaction.newSelection.ranges.some(
        (selection) => selection.from < next.to && selection.to > next.from,
      )) return Decoration.none;
      return mapped;
    },
    provide: (field) => EditorView.decorations.from(field),
  });
  return field;
}
