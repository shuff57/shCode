'use client';

// The sandbox's project switcher (lib/sandbox-projects.ts). The button names the
// open project and its type; the popup lists every project, makes a new one
// (a name and a type), and renames, copies or deletes one from its More menu.
// It replaces the four program-type tabs: a type is now chosen once, when the
// project is made.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, ChevronDown, Gamepad2, Plus, Terminal, Workflow } from 'lucide-react';
import { RowMenu } from './RowMenu';
import { useLessonStore } from '../lib/store';
import { loadProgress, normalizeEol } from '../lib/version-control';
import { fetchWorkspace } from '../lib/lesson-sync';
import { SANDBOX_MODES, getMode, type SandboxModeId } from '../lib/sandbox-modes';
import { MAX_NAME_CHARS, MAX_PROJECTS, copyName, defaultName, projectLessonId } from '../lib/sandbox-projects-core';
import {
  createProject,
  deleteProject,
  openProject,
  renameProject,
  type ProjectsState,
  type SandboxProject,
} from '../lib/sandbox-projects';

const ICONS: Record<SandboxModeId, typeof Box> = { js: Terminal, moshion: Gamepad2, reshape: Box, flow: Workflow };

const chip: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  background: 'var(--x-343746)',
  color: 'var(--c-fg)',
  border: '1px solid var(--c-line)',
  cursor: 'pointer',
  fontSize: 13,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  maxWidth: 260,
};

const typeTag: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--c-meta)',
  border: '1px solid var(--c-line)',
  borderRadius: 999,
  padding: '1px 7px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--c-bg)',
  color: 'var(--c-fg)',
  border: '1px solid var(--c-line)',
  borderRadius: 4,
  padding: '7px 9px',
  fontSize: 14,
};

/** The project's code now: the editor if it is open, else this browser's draft, else the account's saved copy, else the starter. */
async function filesOf(p: SandboxProject, current: SandboxProject | null, signedIn: boolean): Promise<Record<string, string>> {
  const lessonId = projectLessonId(p);
  const store = useLessonStore.getState();
  if (current?.id === p.id && store.lesson?.id === lessonId) return { ...store.fileContents };
  const draft = loadProgress(lessonId)?.fileContents;
  if (draft && Object.keys(draft).length) return { ...draft };
  if (signedIn) {
    const remote = await fetchWorkspace(lessonId);
    if (remote?.files) return { ...remote.files };
  }
  const mode = getMode(p.mode);
  return { [mode.file]: normalizeEol(mode.starter) };
}

export default function SandboxProjectPicker({
  state,
  locked = false,
  lockedTitle,
  startOpen = false,
}: {
  state: ProjectsState;
  /** Code together is on: switching would swap everyone's program. */
  locked?: boolean;
  lockedTitle?: string;
  /** Open with the New project form showing (the student has no projects left). */
  startOpen?: boolean;
}) {
  const { projects, current, signedIn } = state;
  const [open, setOpen] = useState(startOpen);
  const [making, setMaking] = useState(startOpen);
  const [newType, setNewType] = useState<SandboxModeId>('moshion');
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const full = projects.length >= MAX_PROJECTS;
  const suggested = useMemo(() => defaultName(newType, getMode(newType).label, projects), [newType, projects]);

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(380, window.innerWidth - 16);
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) });
  }

  useEffect(() => {
    if (!open) return;
    place();
    const away = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) close();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); btnRef.current?.focus(); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => { if (startOpen) { setOpen(true); setMaking(true); } }, [startOpen]);

  function close() {
    setOpen(false);
    setMaking(false);
    setRenaming(null);
    setError(null);
  }

  async function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, then?: () => void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    then?.();
  }

  const make = () => act(
    () => createProject(newType, newName.trim() || suggested),
    () => { setNewName(''); close(); },
  );

  const copy = (p: SandboxProject) => act(async () => {
    const files = await filesOf(p, current, signedIn);
    return createProject(p.mode, copyName(p.name, projects), files);
  }, close);

  const remove = (p: SandboxProject) => {
    const where = signedIn ? 'on every computer' : 'on this computer';
    if (!window.confirm(`Delete "${p.name}"?\n\nIts code and its History are deleted ${where}. This cannot be undone.`)) return;
    void act(() => deleteProject(p));
  };

  const rename = (p: SandboxProject) => act(() => renameProject(p, renameText), () => setRenaming(null));

  const CurIcon = current ? ICONS[current.mode] : Plus;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        style={locked ? { ...chip, opacity: 0.45, cursor: 'not-allowed' } : chip}
        disabled={locked}
        title={locked ? lockedTitle : 'Switch project, or make a new one'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        data-testid="sandbox-projects-button"
      >
        <CurIcon size={13} aria-hidden="true" />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {current ? current.name : 'Projects'}
        </span>
        {current && <span style={typeTag}>{getMode(current.mode).label}</span>}
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open && pos && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Your projects"
          data-testid="sandbox-projects"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: 'min(380px, calc(100vw - 16px))',
            maxHeight: `calc(100vh - ${pos.top + 12}px)`,
            overflowY: 'auto',
            zIndex: 1400,
            background: 'var(--c-deep)',
            border: '1px solid var(--c-line)',
            borderRadius: 8,
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.45)',
            color: 'var(--c-fg)',
            fontSize: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--c-line)' }}>
            <strong style={{ fontSize: 15 }}>Your projects</strong>
            <span style={{ color: 'var(--c-meta)', fontSize: 12 }}>{projects.length} of {MAX_PROJECTS}</span>
            {!making && (
              <button
                type="button"
                className="btn-run"
                style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => { setMaking(true); setError(null); }}
                disabled={full}
                title={full ? `You can keep ${MAX_PROJECTS} projects. Delete one to make room.` : undefined}
              >
                <Plus size={13} aria-hidden="true" /> New project
              </button>
            )}
          </div>

          {making && (
            <form
              onSubmit={(e) => { e.preventDefault(); void make(); }}
              style={{ padding: 12, borderBottom: '1px solid var(--c-line)', display: 'grid', gap: 10 }}
            >
              <div role="radiogroup" aria-label="Type of project" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {SANDBOX_MODES.map((m) => {
                  const Icon = ICONS[m.id];
                  const on = newType === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setNewType(m.id)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: on ? 'color-mix(in srgb, var(--c-purple) 28%, var(--c-bg))' : 'var(--c-bg)',
                        border: `1px solid ${on ? 'var(--c-purple)' : 'var(--c-line)'}`,
                        color: 'var(--c-fg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <Icon size={15} aria-hidden="true" /> {m.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ color: 'var(--c-meta)', fontSize: 12, marginTop: -4 }}>{getMode(newType).blurb}</div>
              <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                Name
                <input
                  style={input}
                  value={newName}
                  maxLength={MAX_NAME_CHARS}
                  placeholder={suggested}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {projects.length > 0 && (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => { setMaking(false); setError(null); }}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-run" style={{ padding: '5px 12px', fontSize: 13 }} disabled={busy || full}>
                  {busy ? 'Making…' : 'Make project'}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div role="alert" style={{ color: 'var(--c-red)', fontSize: 13, padding: '8px 12px', borderBottom: '1px solid var(--c-line)' }}>
              {error}
            </div>
          )}

          {projects.length === 0 && !making && (
            <div style={{ padding: 14, color: 'var(--c-meta)', fontSize: 13 }}>No projects yet. Make one to start coding.</div>
          )}

          <ul style={{ listStyle: 'none', margin: 0, padding: 4 }}>
            {projects.map((p) => {
              const Icon = ICONS[p.mode];
              const isOpen = current?.id === p.id;
              if (renaming === p.id) {
                return (
                  <li key={p.id} style={{ padding: '6px 8px' }}>
                    <form onSubmit={(e) => { e.preventDefault(); void rename(p); }} style={{ display: 'flex', gap: 6 }}>
                      <input
                        style={input}
                        value={renameText}
                        maxLength={MAX_NAME_CHARS}
                        aria-label={`New name for ${p.name}`}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setRenaming(null); } }}
                        autoFocus
                      />
                      <button type="submit" className="btn-run" style={{ padding: '5px 10px', fontSize: 13 }} disabled={busy}>Rename</button>
                    </form>
                  </li>
                );
              }
              return (
                <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px' }}>
                  <button
                    type="button"
                    onClick={() => { if (!isOpen && !locked) openProject(p); close(); }}
                    disabled={locked && !isOpen}
                    aria-current={isOpen ? 'true' : undefined}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'left',
                      padding: '8px 8px',
                      borderRadius: 6,
                      border: 'none',
                      borderLeft: `3px solid ${isOpen ? 'var(--c-purple)' : 'transparent'}`,
                      background: isOpen ? 'var(--c-line)' : 'transparent',
                      color: 'var(--c-fg)',
                      cursor: locked && !isOpen ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                    }}
                    onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--x-2f3142)'; }}
                    onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon size={15} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--c-meta)' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isOpen ? 600 : 400 }}>{p.name}</span>
                    <span style={{ ...typeTag, marginLeft: 'auto' }}>{getMode(p.mode).label}</span>
                  </button>
                  <RowMenu
                    label={`More for ${p.name}`}
                    buttonText="More"
                    disabled={busy}
                    items={[
                      { label: 'Rename', onSelect: () => { setRenaming(p.id); setRenameText(p.name); setError(null); } },
                      { label: 'Make a copy', onSelect: () => void copy(p), disabled: full, title: full ? `You can keep ${MAX_PROJECTS} projects.` : undefined },
                      { label: 'Delete…', onSelect: () => remove(p), danger: true, disabled: locked && isOpen },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
