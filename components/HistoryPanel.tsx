'use client';

// Version history, in the shape students already know from Google Docs:
//   a full-height panel, a date-grouped timeline on the left (time + author +
//   what happened), and one preview on the right with a "Show changes" toggle
//   and "Restore this version" at the bottom.
//
// The two sources stay separate because they mean different things:
//   This device — localStorage snapshots (lib/local-history.ts), only here.
//   Cloud       — saves in D1 (lesson_sync_history), reachable anywhere.
// Selecting a version previews it. Restoring on This device changes only this
// browser; restoring on Cloud also makes it the saved copy every device loads.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { diffLines } from 'diff';
import { useLessonStore } from '../lib/store';
import { getCurrentUser } from '../lib/auth';
import { restoreVersionToCloud } from '../lib/lesson-sync';
import { listLocalHistory, type LocalSnapshot } from '../lib/local-history';
import type { FileMap } from '../lib/lesson-sync-merge';
import { Cloud, HardDrive, RotateCcw, X } from 'lucide-react';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  /** Called after a restore lands. The sandbox remounts its studio, which only
   *  hydrates from the file at mount; a lesson leaves it unset. */
  onRestore?: () => void;
}

type Tab = 'device' | 'cloud';

interface CloudMeta {
  id: string;
  revision: number;
  updatedAt: number;
}

interface CloudSave extends CloudMeta {
  files: FileMap;
}

const MUTED = '#8393c4';
const BORDER = '#44475a';
const TEXT = '#f8f8f2';
const ACCENT = '#bd93f9';
const ADD = 'rgba(80,250,123,0.16)';
const DEL = 'rgba(255,85,85,0.16)';
const MONO = "'Fira Code', 'Consolas', 'Courier New', monospace";

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function fmtFull(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDay<T extends { timestamp: number }>(items: T[]): { label: string; items: T[] }[] {
  const out: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.timestamp);
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(item);
    else out.push({ label, items: [item] });
  }
  return out;
}

type ChangeRow = { kind: 'add' | 'del' | 'context'; text: string };

function changeRows(original: string, modified: string): ChangeRow[] {
  const rows: ChangeRow[] = [];
  for (const change of diffLines(original, modified)) {
    const kind: ChangeRow['kind'] = change.added ? 'add' : change.removed ? 'del' : 'context';
    const lines = change.value.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    for (const text of lines) rows.push({ kind, text });
  }
  return rows;
}

function rowStyle(kind: ChangeRow['kind']): React.CSSProperties {
  if (kind === 'add') return { background: ADD, borderLeft: '3px solid #50fa7b' };
  if (kind === 'del') return { background: DEL, borderLeft: '3px solid #ff5555' };
  return { borderLeft: '3px solid transparent' };
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: active ? ACCENT : 'transparent',
  color: active ? '#282a36' : MUTED,
  border: 'none',
  borderRadius: 999,
  padding: '6px 14px',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});

const rowStyleBase = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  textAlign: 'left',
  background: active ? '#44475a' : 'transparent',
  border: 'none',
  borderLeft: `3px solid ${active ? ACCENT : 'transparent'}`,
  borderRadius: 0,
  padding: '9px 12px',
  cursor: 'pointer',
  color: TEXT,
});

const avatarStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: '#6272a4',
  color: TEXT,
  display: 'grid',
  placeItems: 'center',
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  color: MUTED,
  fontSize: 11,
  fontWeight: 500,
};

export default function HistoryPanel({ isOpen, onClose, lessonId, onRestore }: HistoryPanelProps) {
  const [tab, setTab] = useState<Tab>('device');
  const [device, setDevice] = useState<LocalSnapshot[]>([]);
  const [deviceSel, setDeviceSel] = useState<LocalSnapshot | null>(null);
  const [cloud, setCloud] = useState<CloudMeta[] | null>(null);
  const [cloudErr, setCloudErr] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudSel, setCloudSel] = useState<CloudSave | null>(null);
  const [cloudOpening, setCloudOpening] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  // Off by default: a beginner opening a version should see their code exactly
  // as it was, not a red/green diff they have to decode. Highlighting is opt-in.
  const [showChanges, setShowChanges] = useState(false);
  const [initial, setInitial] = useState('Y');
  const [restoring, setRestoring] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  // Under 700px the two columns stack: timeline on top, preview underneath.
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 700px)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const currentFile = useLessonStore((s) => s.currentFile);
  const fileContents = useLessonStore((s) => s.fileContents);

  useEffect(() => {
    let live = true;
    getCurrentUser()
      .then((u) => {
        const first = u?.email?.trim()?.[0];
        if (live && first) setInitial(first.toUpperCase());
      })
      .catch(() => { /* the avatar can stay "Y" */ });
    return () => {
      live = false;
    };
  }, []);

  // ---- This device -------------------------------------------------------
  useEffect(() => {
    if (!isOpen || tab !== 'device') return;
    const list = listLocalHistory(lessonId);
    setDevice(list);
    setDeviceSel((prev) => (prev && list.some((s) => s.id === prev.id) ? prev : list[0] ?? null));
  }, [isOpen, tab, lessonId]);

  // ---- Cloud -------------------------------------------------------------
  useEffect(() => {
    if (!isOpen || tab !== 'cloud') return;
    let live = true;
    setCloudLoading(true);
    setCloudErr(null);
    fetch(`/api/lesson-sync-history?lessonId=${encodeURIComponent(lessonId)}`, {
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? 'Sign in to see cloud saves.'
              : `Could not load cloud saves (${res.status}).`,
          );
        }
        const data = (await res.json()) as { saves?: CloudMeta[] };
        if (live) setCloud(data.saves ?? []);
      })
      .catch((err) => {
        if (live) setCloudErr(err instanceof Error ? err.message : 'Could not load cloud saves.');
      })
      .finally(() => {
        if (live) setCloudLoading(false);
      });
    return () => {
      live = false;
    };
  }, [isOpen, tab, lessonId]);

  const pickCloud = useCallback(async (meta: CloudMeta) => {
    setCloudSel(null);
    setCloudOpening(true);
    setCloudErr(null);
    setRestoreNote(null);
    try {
      const res = await fetch(`/api/lesson-sync-history?id=${encodeURIComponent(meta.id)}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('Could not open that save.');
      const data = (await res.json()) as { save: CloudSave };
      setCloudSel(data.save);
    } catch (err) {
      setCloudErr(err instanceof Error ? err.message : 'Could not open that save.');
    } finally {
      setCloudOpening(false);
    }
  }, []);

  // Like Google Docs, open the newest version as soon as the list arrives. The
  // ref makes it one attempt per newest id, so a failed fetch does not loop.
  const autoOpened = useRef<string | null>(null);
  useEffect(() => {
    if (tab !== 'cloud' || !cloud || cloud.length === 0) return;
    const newestId = cloud[0].id;
    if (autoOpened.current === newestId) return;
    autoOpened.current = newestId;
    void pickCloud(cloud[0]);
  }, [tab, cloud, pickCloud]);

  // ---- The version on screen --------------------------------------------
  const snapshot: FileMap | null = tab === 'device' ? deviceSel?.files ?? null : cloudSel?.files ?? null;
  const snapshotTime = tab === 'device' ? deviceSel?.timestamp ?? null : cloudSel?.updatedAt ?? null;
  const snapshotTitle =
    tab === 'device' ? deviceSel?.message ?? null : cloudSel ? 'Saved to cloud' : null;

  const filesInSnapshot = useMemo(
    () => (snapshot ? Object.keys(snapshot).sort() : []),
    [snapshot],
  );

  useEffect(() => {
    if (filesInSnapshot.length === 0) {
      setPreviewFile(null);
      return;
    }
    setPreviewFile((prev) => {
      if (prev && filesInSnapshot.includes(prev)) return prev;
      if (currentFile && filesInSnapshot.includes(currentFile)) return currentFile;
      return filesInSnapshot[0];
    });
  }, [filesInSnapshot, currentFile]);

  const rows = useMemo<ChangeRow[]>(() => {
    if (!snapshot || !previewFile) return [];
    const saved = snapshot[previewFile] ?? '';
    if (!showChanges) {
      const lines = saved.split('\n');
      return lines.map((text) => ({ kind: 'context', text }));
    }
    return changeRows(fileContents[previewFile] ?? '', saved);
  }, [snapshot, previewFile, showChanges, fileContents]);

  const deviceItems = useMemo(
    () => device.map((s) => ({ ...s, timestamp: s.timestamp })),
    [device],
  );
  const cloudItems = useMemo(
    () => (cloud ?? []).map((s) => ({ ...s, timestamp: s.updatedAt, title: 'Saved to cloud' })),
    [cloud],
  );

  if (!isOpen) return null;

  const restore = async () => {
    if (!snapshot || restoring) return;
    const toCloud = tab === 'cloud';
    const question = toCloud
      ? 'Restore this version for every device? It becomes the saved copy other devices load.'
      : 'Restore this version on this device? Anything unsaved here will be replaced.';
    if (!window.confirm(question)) return;

    setRestoreNote(null);
    useLessonStore.setState({ fileContents: { ...snapshot } });

    // This device only: the editor change is the whole action.
    if (!toCloud) {
      onRestore?.();
      onClose();
      return;
    }

    // Cloud: also write it back, so another device loading this lesson gets it.
    setRestoring(true);
    const result = await restoreVersionToCloud(lessonId, snapshot);
    setRestoring(false);
    if (result === 'error') {
      setRestoreNote('Restored on this device, but could not save it for other devices. Press Save to try again.');
      onRestore?.();
      return;
    }
    onRestore?.();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Version history"
        style={{
          background: '#1e1f29',
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          width: 'min(96vw, 1160px)',
          height: 'min(92vh, 880px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: TEXT,
          boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: narrow ? '12px 48px 12px 16px' : '14px 18px',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex',
            alignItems: narrow ? 'flex-start' : 'center',
            flexWrap: 'wrap',
            rowGap: 8,
            gap: 12,
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>Version history</div>
          <div style={{ display: 'flex', gap: 4, marginLeft: narrow ? 0 : 8 }}>
            <button style={tabStyle(tab === 'device')} onClick={() => { setTab('device'); setCloudSel(null); setRestoreNote(null); }}>
              <HardDrive size={14} /> This device
            </button>
            <button style={tabStyle(tab === 'cloud')} onClick={() => { setTab('cloud'); setDeviceSel(null); setRestoreNote(null); }}>
              <Cloud size={14} /> Cloud
            </button>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              marginLeft: narrow ? 0 : 'auto',
              position: narrow ? 'absolute' : undefined,
              right: narrow ? 12 : undefined,
              top: narrow ? 12 : undefined,
              background: 'none',
              border: 'none',
              color: MUTED,
              cursor: 'pointer',
              padding: 4,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: narrow ? 'column' : 'row', minHeight: 0 }}>
          {/* Timeline */}
          <div
            style={{
              width: narrow ? '100%' : 310,
              maxHeight: narrow ? '40%' : undefined,
              borderRight: narrow ? 'none' : `1px solid ${BORDER}`,
              borderBottom: narrow ? `1px solid ${BORDER}` : 'none',
              overflowY: 'auto',
              flexShrink: 0,
              paddingBottom: 12,
            }}
          >
            {tab === 'device' ? (
              device.length === 0 ? (
                <Empty text="No versions on this device yet." hint="Press Save to keep one." />
              ) : (
                groupByDay(deviceItems).map((group) => (
                  <div key={group.label}>
                    <GroupLabel label={group.label} />
                    {group.items.map((s) => (
                      <button
                        key={s.id}
                        style={rowStyleBase(deviceSel?.id === s.id)}
                        onClick={() => { setDeviceSel(s); setCloudSel(null); setRestoreNote(null); }}
                      >
                        <span style={avatarStyle}>{initial}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{fmtTime(s.timestamp)}</span>
                            <span style={badgeStyle}><HardDrive size={11} /> This device</span>
                          </span>
                          <span style={{ display: 'block', color: MUTED, fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.message}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )
            ) : cloudLoading ? (
              <Empty text="Loading cloud saves…" />
            ) : cloudErr ? (
              <Empty text={cloudErr} tone="error" />
            ) : cloud === null || cloud.length === 0 ? (
              <Empty text="No cloud saves yet." hint="Press Save to create one." />
            ) : (
              groupByDay(cloudItems).map((group) => (
                <div key={group.label}>
                  <GroupLabel label={group.label} />
                  {group.items.map((s) => (
                    <button
                      key={s.id}
                      style={rowStyleBase(cloudSel?.id === s.id)}
                      onClick={() => void pickCloud(s)}
                    >
                      <span style={avatarStyle}>{initial}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{fmtTime(s.timestamp)}</span>
                          <span style={badgeStyle}><Cloud size={11} /> Cloud</span>
                        </span>
                        <span style={{ display: 'block', color: MUTED, fontSize: 12, marginTop: 2 }}>
                          {s.title}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Preview */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {!snapshot ? (
              <div style={{ margin: 'auto', color: MUTED, fontSize: 13, padding: 24, textAlign: 'center' }}>
                {tab === 'cloud' && cloudOpening ? 'Opening…' : 'Select a version to preview it.'}
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: '10px 16px',
                    borderBottom: `1px solid ${BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    rowGap: 8,
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <span style={avatarStyle}>{initial}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      You
                      {snapshotTime !== null && (
                        <span style={{ color: MUTED, fontWeight: 400 }}> · {fmtFull(snapshotTime)}</span>
                      )}
                    </div>
                    <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{snapshotTitle}</div>
                  </div>
                  <select
                    aria-label="File"
                    value={previewFile ?? ''}
                    onChange={(e) => setPreviewFile(e.target.value)}
                    style={{
                      background: '#282a36',
                      color: TEXT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 12,
                      maxWidth: narrow ? '100%' : 220,
                    }}
                  >
                    {filesInSnapshot.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                {/* The version, or the version with changes marked */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    background: '#282a36',
                    fontFamily: MONO,
                    fontSize: 13,
                    lineHeight: 1.6,
                    padding: '10px 0',
                  }}
                >
                  {rows.map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        whiteSpace: 'pre',
                        minWidth: 'max-content',
                        ...rowStyle(row.kind),
                      }}
                    >
                      <span
                        style={{
                          width: 46,
                          flexShrink: 0,
                          textAlign: 'right',
                          paddingRight: 10,
                          color: MUTED,
                          userSelect: 'none',
                        }}
                      >
                        {showChanges
                          ? row.kind === 'add' ? '+' : row.kind === 'del' ? '−' : ''
                          : i + 1}
                      </span>
                      <span style={{ flex: 1, paddingRight: 16 }}>{row.text || ' '}</span>
                    </div>
                  ))}
                </div>

                {/* Footer: the Google-Docs pair of controls */}
                <div
                  style={{
                    padding: '10px 16px',
                    borderTop: `1px solid ${BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    rowGap: 8,
                    gap: 12,
                    flexShrink: 0,
                  }}
                >
                  <label
                    title="Mark lines that differ from what is in the editor now."
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MUTED, fontSize: 13, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={showChanges}
                      onChange={(e) => setShowChanges(e.target.checked)}
                      style={{ accentColor: ACCENT }}
                    />
                    Highlight changes
                  </label>
                  {restoreNote && (
                    <span style={{ color: '#ff5555', fontSize: 12, flex: '1 1 100%' }}>
                      {restoreNote}
                    </span>
                  )}
                  <button
                    onClick={() => void restore()}
                    disabled={restoring}
                    title={
                      tab === 'cloud'
                        ? 'Restore this version and save it for every device'
                        : 'Restore this version on this device only'
                    }
                    style={{
                      marginLeft: narrow ? 0 : 'auto',
                      width: narrow ? '100%' : undefined,
                      justifyContent: 'center',
                      background: '#50fa7b',
                      color: '#282a36',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 16px',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: restoring ? 'default' : 'pointer',
                      opacity: restoring ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <RotateCcw size={14} /> {restoring ? 'Restoring…' : 'Restore this version'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '14px 14px 6px',
        color: MUTED,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}

function Empty({ text, hint, tone }: { text: string; hint?: string; tone?: 'error' }) {
  return (
    <div style={{ padding: '18px 14px' }}>
      <div style={{ color: tone === 'error' ? '#ff5555' : MUTED, fontSize: 13 }}>{text}</div>
      {hint && <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
