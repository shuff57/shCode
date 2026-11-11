'use client';

// "Propose change" in the moSHion sandbox toolbar, beside Publish game. Shown only while the sandbox code
// is a remix of a classmate's game (lib/games-client.ts SandboxGame.from). It is GitHub's pull request
// and "sync fork" for beginners (lib/game-flow-core.ts):
//   - Bring in the newest version: when the original has a newer version than the one the remix started
//     from, merge it into the sandbox code (lib/game-merge.ts). The old code goes to History first. When
//     both changed the same lines nothing is merged: the student keeps theirs for now, or starts from the
//     newest (theirs goes to History). No conflict markers, ever.
//   - Propose this change: "What did you change?" plus an optional first comment; See my changes first.
//     Sending again while one is open updates it. The maker sees it in their Library.

import { useCallback, useEffect, useRef, useState } from 'react';
import { GitPullRequest } from 'lucide-react';
import DiffViewer from './DiffViewer';
import { GAMES_CHANGED, readSandboxGame, type SandboxGame } from '../lib/games-client';
import {
  CHANGES_CHANGED, bringInNewest, changeHref, checkForNewer, getVersion, listGameChanges, proposeChange, startFromNewest,
  type SyncCheck, type SyncResult,
} from '../lib/game-flow-client';
import { COMMENT_MAX, FLOW_DOCS, GITHUB_WORD, MESSAGE_MAX, cleanComment, cleanMessage } from '../lib/game-flow-core';
import { GitHubWord, flowBtn, flowInput, flowPrimary } from './game-flow-ui';

const chip: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 4, background: 'transparent', color: 'var(--c-comment)',
  border: '1px solid var(--c-line)', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5,
};

type Compare = { left: string; right: string; leftLabel: string; rightLabel: string } | null;

export default function ProposeChangeButton({ getCode }: { getCode: () => string }) {
  const [rec, setRec] = useState<SandboxGame>({ id: null, title: '' });
  const [open, setOpen] = useState(false);
  const [sync, setSync] = useState<SyncCheck | null>(null);
  const [syncRes, setSyncRes] = useState<SyncResult | null>(null);
  const [mineOpen, setMineOpen] = useState<{ id: string; title: string } | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean; link?: string } | null>(null);
  const [compare, setCompare] = useState<Compare>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshRec = useCallback(() => setRec(readSandboxGame()), []);
  useEffect(() => {
    refreshRec();
    window.addEventListener(GAMES_CHANGED, refreshRec);
    window.addEventListener(CHANGES_CHANGED, refreshRec);
    return () => { window.removeEventListener(GAMES_CHANGED, refreshRec); window.removeEventListener(CHANGES_CHANGED, refreshRec); };
  }, [refreshRec]);

  const from = rec.from ?? null;
  const fromId = from?.id ?? null;

  // Once per sandbox load (and after a remix): is there a newer version? Drives the dot on the button.
  useEffect(() => {
    if (!fromId) { setSync(null); return; }
    let live = true;
    void checkForNewer().then((s) => { if (live) setSync(s); });
    return () => { live = false; };
  }, [fromId, rec.fromVersion]);

  // Opening the panel: my open proposal for this game, if any.
  useEffect(() => {
    if (!open || !fromId) return;
    let live = true;
    void listGameChanges(fromId).then((r) => {
      if (!live || !r.ok) return;
      const m = r.value.changes.find((c) => c.mine && c.status === 'open');
      setMineOpen(m ? { id: m.id, title: m.title } : null);
      if (m) setTitle((t) => t || m.title);
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !compare) setOpen(false); };
    const onDown = (e: MouseEvent) => { if (!compare && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { live = false; window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [open, fromId, compare]);

  if (!from || sync?.kind === 'none') return null;

  const behind = sync?.kind === 'behind' ? sync : null;

  async function seeMine() {
    if (!fromId) return;
    setMsg(null);
    const base = await getVersion(fromId, rec.fromVersion ?? 1);
    if (!base.ok) { setMsg({ text: 'The version you started from is too old to compare with (only the newest 20 are kept). Your proposal will be compared with the game as it is now.', bad: true }); return; }
    setCompare({ left: base.value.version.code, right: getCode(), leftLabel: `${from!.title}, version ${base.value.version.version} (where you started)`, rightLabel: 'Your code now' });
  }

  async function doSync() {
    setBusy(true);
    setMsg(null);
    const r = await bringInNewest();
    setBusy(false);
    setSyncRes(r);
    if (r.kind === 'merged') {
      setMsg({ text: r.same ? `Your code already had everything in version ${r.version}.` : `Brought in version ${r.version}. Your code from before is in the sandbox's History. Press Run to check it still works.`, bad: false });
      setSyncRes(null);
      setSync(await checkForNewer());
    } else if (r.kind === 'error') setMsg({ text: r.text, bad: true });
  }

  async function send() {
    if (!fromId) return;
    setMsg(null);
    const t = cleanMessage(title, 'proposal');
    if ('error' in t) { setMsg({ text: t.error, bad: true }); return; }
    if (note.trim()) {
      const n = cleanComment(note);
      if ('error' in n) { setMsg({ text: n.error, bad: true }); return; }
    }
    setBusy(true);
    const r = await proposeChange(fromId, { title: t.message, code: getCode(), baseVersion: rec.fromVersion ?? null, note: note.trim() || undefined });
    setBusy(false);
    if (!r.ok) { setMsg({ text: r.error, bad: true }); return; }
    setMineOpen({ id: r.value.id, title: t.message });
    setNote('');
    setMsg({
      text: r.value.created
        ? `Sent to ${from!.author}. They will see it in their Library, and classmates can join the conversation.`
        : `Updated your proposal. ${from!.author} sees the new code now.`,
      bad: false, link: changeHref(r.value.id),
    });
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" style={mineOpen ? { ...chip, color: 'var(--c-purple)' } : chip} aria-expanded={open} aria-haspopup="dialog"
        title={`Your code is a remix of "${from.title}" by ${from.author}. Propose your change back to them.`}
        onClick={() => { setOpen((o) => !o); setMsg(null); }}>
        <GitPullRequest size={12} aria-hidden="true" />
        Propose change
        {behind && <span aria-label="a newer version is out" title={`"${behind.title}" has a newer version`} style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--c-orange)', display: 'inline-block' }} />}
      </button>
      {open && (
        <div role="dialog" aria-label="Propose this change" style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, width: 'min(380px, calc(100vw - 32px))',
          background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6, padding: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)', color: 'var(--c-fg)', fontSize: 13, lineHeight: 1.5,
        }}>
          <h2 style={{ fontSize: 14, margin: '0 0 6px' }}>Propose this change to {from.author}</h2>
          <p style={{ margin: '0 0 8px', color: 'var(--c-dim)' }}>
            Your code is a remix of <strong style={{ color: 'var(--c-fg)' }}>{from.title}</strong>. Send your change back: {from.author} can
            see what you changed, try it, talk it over with you, and accept it into their game with your name on it.
          </p>

          {sync?.kind === 'gone' && (
            <p style={{ margin: '0 0 8px', color: 'var(--c-orange)' }}>
              &ldquo;{from.title}&rdquo; is not shared with you any more (it was deleted, taken out of your class, or made &ldquo;just play&rdquo;), so you cannot propose to it.
            </p>
          )}

          {behind && syncRes?.kind !== 'conflict' && (
            <div style={{ margin: '0 0 10px', padding: '8px 10px', border: '1px solid color-mix(in srgb, var(--c-orange) 55%, transparent)', borderRadius: 4 }}>
              <div>&ldquo;{behind.title}&rdquo; has a newer version: {behind.newest} (you started from {behind.from}). Bring it in first, so your change fits the newest game.</div>
              <button type="button" style={{ ...flowBtn, marginTop: 6 }} disabled={busy} onClick={() => void doSync()}>Bring in the newest version</button>
              <GitHubWord>{GITHUB_WORD.sync}</GitHubWord>
            </div>
          )}

          {syncRes?.kind === 'conflict' && (
            <div style={{ margin: '0 0 10px', padding: '8px 10px', border: '1px solid color-mix(in srgb, var(--c-orange) 55%, transparent)', borderRadius: 4 }}>
              <div style={{ color: 'var(--c-orange)' }}>{syncRes.text}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <button type="button" style={flowBtn} onClick={() => setCompare({ left: syncRes.mine, right: syncRes.newestCode, leftLabel: 'Your code', rightLabel: `${from.title}, version ${syncRes.version}` })}>See both</button>
                <button type="button" style={flowBtn} onClick={() => { setSyncRes(null); setMsg({ text: 'Kept your code. Nothing changed.', bad: false }); }}>Keep mine for now</button>
                <button type="button" style={flowBtn} onClick={() => {
                  if (!window.confirm(`Start from version ${syncRes.version} of "${from.title}"?\n\nYour code now is saved in the sandbox's History first, so you can open it there and copy your change back in.`)) return;
                  startFromNewest(syncRes.newestCode, syncRes.version, from.title);
                  setSyncRes(null);
                  setMsg({ text: `Your sandbox has version ${syncRes.version} now. Your old code is in History: copy your change back in, Run it, then propose.`, bad: false });
                  void checkForNewer().then(setSync);
                }}>Start from the newest version</button>
              </div>
            </div>
          )}

          {sync?.kind !== 'gone' && (
            <>
              {mineOpen && (
                <p style={{ margin: '0 0 8px' }}>
                  You already proposed <a href={changeHref(mineOpen.id)} style={{ color: 'var(--c-cyan)' }}>&ldquo;{mineOpen.title}&rdquo;</a>. Sending again updates it with the code you have now.
                </p>
              )}
              <label htmlFor="propose-title" style={{ display: 'block', margin: '0 0 4px' }}>What did you change?</label>
              <input id="propose-title" value={title} maxLength={MESSAGE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Added a second level" style={flowInput} />
              <label htmlFor="propose-note" style={{ display: 'block', margin: '8px 0 4px' }}>
                Why, or anything they should know? <span style={{ color: 'var(--c-dim)' }}>(optional, starts the conversation)</span>
              </label>
              <textarea id="propose-note" value={note} maxLength={COMMENT_MAX} rows={3} onChange={(e) => setNote(e.target.value)}
                placeholder="The first level was over fast, so I added a harder one after it." style={flowInput} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <button type="button" style={flowBtn} onClick={() => void seeMine()}>See my changes</button>
                <button type="button" style={{ ...flowPrimary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => void send()}>
                  {busy ? 'Sending…' : mineOpen ? 'Update my proposal' : 'Propose this change'}
                </button>
                <button type="button" style={flowBtn} onClick={() => setOpen(false)}>Close</button>
              </div>
              <GitHubWord>{GITHUB_WORD.propose} <a href={FLOW_DOCS.propose} target="_blank" rel="noreferrer" style={{ color: 'var(--c-cyan)' }}>How this works</a></GitHubWord>
            </>
          )}

          {msg && (
            <div role="status" aria-live="polite" style={{ marginTop: 8, color: msg.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
              {msg.text}{msg.link && <> <a href={msg.link} style={{ color: 'var(--c-cyan)' }}>Open the conversation</a></>}
            </div>
          )}
        </div>
      )}

      {compare && (
        <div role="dialog" aria-modal="true" aria-label="Compare code" onKeyDown={(e) => { if (e.key === 'Escape') setCompare(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setCompare(null); }}>
          <div style={{ width: 'min(1100px, 100%)', height: 'min(720px, 100%)', background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6, display: 'flex', flexDirection: 'column', padding: 12, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13 }}>
              <span>Left: <strong>{compare.leftLabel}</strong>. Right: <strong>{compare.rightLabel}</strong>.</span>
              <button type="button" style={{ ...flowBtn, marginLeft: 'auto' }} autoFocus onClick={() => setCompare(null)}>Close</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
              <DiffViewer original={compare.left} modified={compare.right} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
