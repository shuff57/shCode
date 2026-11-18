'use client';
// The CAD project's files: open one, add a file or a class, rename or delete.
// The entry file (script.js) runs and cannot be renamed or deleted.
import { useState } from 'react';
import styles from './solidcraft-sandbox.module.css';
import { classFileName, classTemplate, validClassName, validFilePath } from '../lib/solidcraft-code';

type Form = { kind: 'file' | 'class' | 'rename'; value: string } | null;

export default function CadFiles(props: {
  files: string[]; active: string; entry: string; disabled?: boolean;
  onOpen(path: string): void;
  onCreate(path: string, text: string): void;
  onRename(from: string, to: string): void;
  /** Returns a message when the file was kept. */
  onRemove(path: string): string | null;
}) {
  const [form, setForm] = useState<Form>(null);
  const [problem, setProblem] = useState('');
  const taken = (path: string) => props.files.includes(path);
  function submit() {
    if (!form) return;
    const value = form.value.trim();
    if (form.kind === 'class') {
      if (!validClassName(value)) return setProblem('A class name starts with a capital letter and has only letters and digits, like Tray or BoltPlate.');
      const path = classFileName(value);
      if (taken(path)) return setProblem(`${path} is already a file of this project.`);
      props.onCreate(path, classTemplate(value));
    } else {
      const path = value.endsWith('.js') ? value : `${value}.js`;
      if (!validFilePath(path)) return setProblem('Use letters, digits, - and _ in a file name, like parts.js. Folders are written like parts/tray.js.');
      if (taken(path)) return setProblem(`${path} is already a file of this project.`);
      if (form.kind === 'file') props.onCreate(path, `// ${path}\n// Share code with export, and use it from another file with import.\n`);
      else props.onRename(props.active, path);
    }
    setForm(null); setProblem('');
  }
  const open = (kind: 'file' | 'class' | 'rename') => { setProblem(''); setForm({ kind, value: kind === 'rename' ? props.active : '' }); };
  const fixed = props.active === props.entry;
  return <div className={styles.cadFiles}>
    <div className={styles.fileList} role="tablist" aria-label="Files">
      {props.files.map(f => <button key={f} role="tab" aria-selected={f === props.active} className={styles.fileTab} onClick={() => props.onOpen(f)} title={f === props.entry ? `${f} runs; the other files are used through import` : f}>{f}</button>)}
    </div>
    <div className={styles.fileActions}>
      <button disabled={props.disabled} onClick={() => open('file')}>New file</button>
      <button disabled={props.disabled} onClick={() => open('class')}>New class</button>
      <button disabled={props.disabled || fixed} onClick={() => open('rename')} title={fixed ? `${props.entry} is the file that runs` : undefined}>Rename</button>
      <button disabled={props.disabled || fixed} onClick={() => { if (!window.confirm(`Delete ${props.active}? A copy is kept in History.`)) return; const kept = props.onRemove(props.active); setProblem(kept ?? ''); }} title={fixed ? `${props.entry} is the file that runs` : undefined}>Delete</button>
    </div>
    {form && <form className={styles.fileForm} onSubmit={e => { e.preventDefault(); submit(); }}>
      <label>{form.kind === 'class' ? 'Class name' : form.kind === 'rename' ? `Rename ${props.active} to` : 'File name'}
        <input autoFocus value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.kind === 'class' ? 'Tray' : 'parts.js'} spellCheck={false} />
      </label>
      <button type="submit">{form.kind === 'rename' ? 'Rename' : 'Add'}</button>
      <button type="button" onClick={() => { setForm(null); setProblem(''); }}>Cancel</button>
    </form>}
    {problem && <p role="alert" className={styles.notice}>{problem}</p>}
  </div>;
}
