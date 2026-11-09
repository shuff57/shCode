import { EditorSelection, StateEffect, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
import type { LabTaskScenario } from './lab-task-scenario';

/** Presentation only: no document changes, history entries, or save callbacks. */
export function taskCommentFold(task: LabTaskScenario | null): Extension {
  const range = task?.fold;
  if (!range) return [];
  const reveal = StateEffect.define<null>();

  class TaskWidget extends WidgetType {
    toDOM(view: EditorView) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cm-taskCommentFold';
      button.textContent = '// ▸ Task card (click to show)';
      button.setAttribute('aria-expanded', 'false');
      button.title = 'Task shown in the task card. Click or press Enter to show the original comment.';
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
