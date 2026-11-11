import { EditorSelection, StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
import type { LabTaskScenario } from './lab-task-scenario';

/** What the folded comment shows. `quiet` is used when the "Your task" panel is on screen
 *  beside the editor: it already shows the same scenario, so the fold is a bare marker
 *  rather than a second copy of the words "Task card". The document is the same either way. */
export function taskFoldMarker(quiet: boolean): { text: string; label: string } {
  return quiet
    ? { text: '⋯', label: 'Task comment folded (the same task is in Your task). Press Enter to show it.' }
    : { text: '// ▸ Task card (click to show)', label: 'Task shown in the task card. Click or press Enter to show the original comment.' };
}

/** Presentation only: no document changes, history entries, or save callbacks. */
export function taskCommentFold(task: LabTaskScenario | null, opts: { quiet?: boolean } = {}): Extension {
  const range = task?.fold;
  if (!range) return [];
  const reveal = StateEffect.define<null>();
  const marker = taskFoldMarker(!!opts.quiet);

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
