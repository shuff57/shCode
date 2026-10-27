'use client';

// A small word-processor for a written answer (aiGrader.formatting): headings, bold, italic,
// bullets, numbers, tables, undo/redo and a text-size control. It is what-you-see-is-what-you-get
// for the student, but the value it hands back is plain Markdown, so the grader, the draft store
// and the solution panel keep working on text exactly as before.
//
// Loaded with next/dynamic from WrittenGrader, so the editor engine (Tiptap / ProseMirror) is
// downloaded only on the parts that ask for it.

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { TableKit } from '@tiptap/extension-table';
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Table2,
  Undo2,
} from 'lucide-react';

interface Props {
  /** The answer as Markdown. */
  value: string;
  onChange: (markdown: string) => void;
  /** Editor text size in px (the page's A- / A+ control). */
  textSize: number;
  placeholder?: string;
  disabled?: boolean;
}

const BORDER = '#44475a';
const INK = '#f8f8f2';
const ACCENT = '#bd93f9';
const MUTED = '#8393c4';

function Btn({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      // Keep the selection in the editor: a click on a toolbar button must not blur it first.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rae-btn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        minWidth: 32,
        height: 30,
        padding: '0 8px',
        borderRadius: 6,
        border: `1px solid ${active ? ACCENT : BORDER}`,
        background: active ? ACCENT : '#282a36',
        color: active ? '#282a36' : disabled ? '#6272a4' : INK,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

export default function RichAnswerEditor({ value, onChange, textSize, placeholder, disabled }: Props) {
  // The last Markdown this editor produced. A `value` that differs from it came from outside (a
  // saved draft arriving, the Solution panel inserting text) and has to be loaded into the editor.
  const lastEmitted = useRef(value);

  const editor = useEditor({
    extensions: [StarterKit, Markdown, TableKit.configure({ table: { resizable: false } })],
    content: value,
    contentType: 'markdown',
    editable: !disabled,
    // Next renders this page statically; the editor must wait for the browser.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Your response',
        class: 'rae-doc',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const md = ed.getMarkdown();
      lastEmitted.current = md;
      onChange(md);
    },
  });

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(value, { contentType: 'markdown' });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // The toolbar's pressed states follow the cursor.
  const s = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      heading: !!ed?.isActive('heading'),
      bold: !!ed?.isActive('bold'),
      italic: !!ed?.isActive('italic'),
      bullets: !!ed?.isActive('bulletList'),
      numbers: !!ed?.isActive('orderedList'),
      inTable: !!ed?.isActive('table'),
      canUndo: !!ed?.can().undo(),
      canRedo: !!ed?.can().redo(),
      empty: !!ed?.isEmpty,
    }),
  });

  if (!editor) {
    return <div style={{ minHeight: 260, background: '#282a36', border: `1px solid ${BORDER}`, borderRadius: 8 }} />;
  }
  const run = () => editor.chain().focus();

  return (
    <div className="rae" style={{ border: `1px solid ${BORDER}`, borderRadius: 8, background: '#282a36', overflow: 'hidden' }}>
      <div
        role="toolbar"
        aria-label="Formatting"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: 8, borderBottom: `1px solid ${BORDER}`, background: '#21222c' }}
      >
        <Btn label="Heading" active={s?.heading} disabled={disabled} onClick={() => run().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={16} strokeWidth={2} />
        </Btn>
        <Btn label="Bold" active={s?.bold} disabled={disabled} onClick={() => run().toggleBold().run()}>
          <Bold size={16} strokeWidth={2} />
        </Btn>
        <Btn label="Italic" active={s?.italic} disabled={disabled} onClick={() => run().toggleItalic().run()}>
          <Italic size={16} strokeWidth={2} />
        </Btn>
        <Btn label="Bulleted list" active={s?.bullets} disabled={disabled} onClick={() => run().toggleBulletList().run()}>
          <List size={16} strokeWidth={2} />
        </Btn>
        <Btn label="Numbered list" active={s?.numbers} disabled={disabled} onClick={() => run().toggleOrderedList().run()}>
          <ListOrdered size={16} strokeWidth={2} />
        </Btn>
        <Btn
          label="Insert a table"
          disabled={disabled || s?.inTable}
          onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <Table2 size={16} strokeWidth={2} />
        </Btn>
        {s?.inTable ? (
          <>
            <Btn label="Add a row below" disabled={disabled} onClick={() => run().addRowAfter().run()}>+ Row</Btn>
            <Btn label="Add a column to the right" disabled={disabled} onClick={() => run().addColumnAfter().run()}>+ Column</Btn>
            <Btn label="Delete this row" disabled={disabled} onClick={() => run().deleteRow().run()}>- Row</Btn>
            <Btn label="Delete this column" disabled={disabled} onClick={() => run().deleteColumn().run()}>- Column</Btn>
            <Btn label="Delete the table" disabled={disabled} onClick={() => run().deleteTable().run()}>Remove table</Btn>
          </>
        ) : null}
        <span aria-hidden style={{ width: 1, height: 20, background: BORDER, margin: '0 2px' }} />
        <Btn label="Undo" disabled={disabled || !s?.canUndo} onClick={() => run().undo().run()}>
          <Undo2 size={16} strokeWidth={2} />
        </Btn>
        <Btn label="Redo" disabled={disabled || !s?.canRedo} onClick={() => run().redo().run()}>
          <Redo2 size={16} strokeWidth={2} />
        </Btn>
      </div>

      <div style={{ position: 'relative', fontSize: textSize }}>
        {s?.empty && placeholder ? (
          <div aria-hidden style={{ position: 'absolute', top: 12, left: 14, color: MUTED, pointerEvents: 'none' }}>{placeholder}</div>
        ) : null}
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .rae-btn:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
        .rae-btn:not(:disabled):hover { border-color: ${ACCENT}; }
        .rae .rae-doc {
          min-height: 260px;
          padding: 12px 14px;
          color: ${INK};
          line-height: 1.55;
          outline: none;
          font-family: system-ui, sans-serif;
        }
        .rae .rae-doc:focus-visible { box-shadow: inset 0 0 0 2px ${ACCENT}; }
        .rae .rae-doc p { margin: 0 0 8px; }
        .rae .rae-doc h1, .rae .rae-doc h2, .rae .rae-doc h3 { color: ${ACCENT}; font-weight: 600; margin: 14px 0 6px; line-height: 1.3; }
        .rae .rae-doc h1 { font-size: 1.35em; }
        .rae .rae-doc h2 { font-size: 1.2em; }
        .rae .rae-doc h3 { font-size: 1.05em; }
        .rae .rae-doc ul, .rae .rae-doc ol { margin: 0 0 8px; padding-left: 24px; }
        .rae .rae-doc ul { list-style: disc; }
        .rae .rae-doc ol { list-style: decimal; }
        .rae .rae-doc ul ul { list-style: circle; }
        .rae .rae-doc li p { margin: 0; }
        .rae .rae-doc strong { font-weight: 700; }
        .rae .rae-doc em { color: #f1fa8c; }
        .rae .rae-doc code { background: #1e1f29; color: #50fa7b; padding: 1px 4px; border-radius: 3px; font-family: 'Fira Code', Consolas, monospace; font-size: 0.9em; }
        .rae .rae-doc table { border-collapse: collapse; margin: 6px 0 12px; width: 100%; table-layout: fixed; }
        .rae .rae-doc th, .rae .rae-doc td { border: 1px solid ${BORDER}; padding: 6px 10px; vertical-align: top; text-align: left; min-width: 3em; }
        .rae .rae-doc th { background: #21222c; color: ${ACCENT}; font-weight: 600; }
        .rae .rae-doc td p, .rae .rae-doc th p { margin: 0; }
        .rae .rae-doc .selectedCell { background: rgba(189, 147, 249, 0.2); }
      `}</style>
    </div>
  );
}
