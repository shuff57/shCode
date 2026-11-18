'use client';

// "Publish game" in the moSHion sandbox toolbar (the Games library, migration
// 0042). Publishing saves the sketch's code as a game in the student's
// Library; shared with their class, classmates can play it on /play?game=<id>
// and remix it into their own sandbox. Publishing again updates the same game
// (lib/games-client.ts keeps which one in shCode:sandbox-game). The code only
// ever runs inside the sandboxed moSHion iframe, like any sketch.
//
// A game stores only its code: the student's own saved pictures (textures) and
// sounds it loads by name reach a classmate only when they are shared with the
// class (GET /api/games/[id]/assets serves the shared ones on /play). So the
// panel lists the ones this code uses, says which are shared, and offers to
// share the rest. It never blocks publishing.
//
// Sharing choices (lib/share-choice.ts): the panel asks who may do what with
// the game (ShareChoicePicker), defaulting to the student's last choice. A
// remix shows where it came from ("Remixed from Plane by Sam W.") and, when the
// original asked that remixes stay open, the choice is locked to that.
//
// A game deleted since (by the student elsewhere, or by a teacher) answers 404:
// the panel forgets it and offers "Publish as a new game" rather than quietly
// making a new one.
//
// Versions (migration 0048, lib/game-flow-core.ts): Update game asks "What did you change?" and saves
// a version with that note (GitHub's commit message). The published line links to History. When the
// game has a newer version than the sandbox code is based on (the student accepted a classmate's change),
// the panel says so and offers to bring it in before Update would replace it (GitHub's rejected push).

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gamepad2 } from 'lucide-react';
import {
  GAMES_CHANGED,
  getGame,
  playHref,
  publishGame,
  readSandboxGame,
  setGameFeedback,
  setGameShared,
  writeSandboxGame,
} from '../lib/games-client';
import { GAME_TITLE_MAX, checkCode, cleanTitle, declaredMode, modeLabel, usedItems } from '../lib/games-core';
import { LIBRARY_SHARES_CHANGED, LIBRARY_SYNC_STATUS, accountItems, setShared } from '../lib/library-sync';
import { LIBRARY_UPDATED, localLibraryItems, type LibraryKind } from '../lib/moshion-storage';
import { builtinTextureNames, listWords } from '../lib/game-assets';
import { CHOICE_TEXT, type Provenance, type ShareChoice } from '../lib/share-choice';
import ShareChoicePicker, { RemixCreditLine, lockedChoice, useLastChoice } from './ShareChoicePicker';
import AudiencePicker from './AudiencePicker';
import {
   initialPick, pickProblem, pickToSpec, pickerMatters, samePick,
  type AudienceOptions, type AudiencePick, type AudienceSpec, type ItemAudience, type PulledInfo,
} from '../lib/audience';
import { fetchAudiences } from '../lib/audience-client';
import { GITHUB_WORD, MESSAGE_MAX, cleanMessage } from '../lib/game-flow-core';
import { bringInOwnNewest, gameChangesHref, startFromOwnNewest, type SyncResult } from '../lib/game-flow-client';
import { GitHubWord } from './game-flow-ui';

const chip: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--c-comment)',
  border: '1px solid var(--c-line)',
  cursor: 'pointer',
  fontSize: 13,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};
const primary: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: 'var(--c-green)', color: 'var(--c-deep)',
};
const quiet: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
  background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
};

interface Published { id: string; title: string; shared: boolean; choice: ShareChoice; version?: number; audience?: ItemAudience | null; pulled?: PulledInfo | null }

const GONE_TEXT = 'That game was deleted. Publish it again as a new game?';

/** One of the student's own items the code uses. `local` = only in this browser, not in the account yet. */
interface UsedItem { kind: LibraryKind; name: string; state: 'shared' | 'not-shared' | 'local' }

/** The student's own pictures, sounds and fonts `code` uses, account copy first, then this browser's. */
async function findUsedItems(code: string): Promise<UsedItem[]> {
  const builtins = await builtinTextureNames();
  const byKey = new Map<string, UsedItem>();
  for (const a of accountItems()) byKey.set(`${a.kind}:${a.name}`, { kind: a.kind, name: a.name, state: a.shared ? 'shared' : 'not-shared' });
  for (const l of localLibraryItems()) {
    const k = `${l.kind}:${l.name}`;
    if (!byKey.has(k)) byKey.set(k, { kind: l.kind, name: l.name, state: 'local' });
  }
  return usedItems(code, [...byKey.values()], builtins)
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : KIND_ORDER[a.kind] - KIND_ORDER[b.kind]));
}

const KIND_ORDER: Record<LibraryKind, number> = { texture: 0, sound: 1, font: 2 };

/** "Your game uses your pictures: hero and coin, and your sound: jump." */
function usesSentence(used: UsedItem[]): string {
  const pics = used.filter((u) => u.kind === 'texture').map((u) => u.name);
  const snds = used.filter((u) => u.kind === 'sound').map((u) => u.name);
  const fnts = used.filter((u) => u.kind === 'font').map((u) => u.name);
  const parts: string[] = [];
  if (pics.length) parts.push(`your ${pics.length === 1 ? 'picture' : 'pictures'}: ${listWords(pics)}`);
  if (snds.length) parts.push(`your ${snds.length === 1 ? 'sound' : 'sounds'}: ${listWords(snds)}`);
  if (fnts.length) parts.push(`your ${fnts.length === 1 ? 'font' : 'fonts'}: ${listWords(fnts)}`);
  return `Your game uses ${parts.join(', and ')}.`;
}

export default function PublishGameButton({ getCode }: { getCode: () => string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [share, setShare] = useState(true);
  // The game's "Let classmates give feedback" switch (migration 0051): what is wanted, and what the server holds.
  const [feedbackOn, setFeedbackOn] = useState(true);
  const [feedbackSaved, setFeedbackSaved] = useState(true);
  const [published, setPublished] = useState<Published | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [declared, setDeclared] = useState('1 player');
  const [used, setUsed] = useState<UsedItem[]>([]);
  const [sharingItems, setSharingItems] = useState(false);
  // "Also share the pictures and sounds it uses" (#129): ticked by default, so publishing to the class brings the art.
  const [shareArt, setShareArt] = useState(true);
  const [itemsNote, setItemsNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [lastChoice, rememberChoice] = useLastChoice('game');
  const [choice, setChoice] = useState<ShareChoice>(lastChoice);
  // Which classes it goes to (migration 0057): what the server offers and the pick. Null options = not asked yet or
  // it failed, and a share goes to every class as it always did.
  const [audOptions, setAudOptions] = useState<AudienceOptions | null>(null);
  const [audPick, setAudPick] = useState<AudiencePick | null>(null);
  /** Where the sandbox code was remixed from (lib/games-client.ts SandboxGame.from). */
  const [from, setFrom] = useState<Provenance | null>(null);
  /** The game the sandbox was published as is gone (deleted, or a 404 on Update). */
  const [gone, setGone] = useState(false);
  /** "What did you change?" for an Update (a version's note). */
  const [message, setMessage] = useState('');
  /** The game is at a newer version than the sandbox code is based on. */
  const [ahead, setAhead] = useState<{ from: number; newest: number } | null>(null);
  const [aheadRes, setAheadRes] = useState<SyncResult | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null); // the panel is portalled to <body>, outside wrapRef

  // What the sandbox draft is published as, checked against the server (a
  // deleted game, or another account on this browser, reads as unpublished).
  const refresh = useCallback(async () => {
    const rec = readSandboxGame();
    setFrom(rec.from ?? null);
    setTitle((t) => t || rec.title);
    if (!rec.id) { setPublished(null); setTitle(rec.title); return; }
    const r = await getGame(rec.id);
    if (r.ok && r.value.game.mine) {
      const g = r.value.game;
      setPublished({ id: rec.id, title: g.title, shared: !!g.shared, choice: g.choice, version: g.version, audience: g.audience ?? null, pulled: g.pulled ?? null });
      setAhead(rec.version && g.version && g.version > rec.version ? { from: rec.version, newest: g.version } : null);
      setShare(!!g.shared);
      setFeedbackOn(g.feedbackOn !== false);
      setFeedbackSaved(g.feedbackOn !== false);
      setChoice(lockedChoice(g.remixedFrom ?? rec.from, g.choice));
      setTitle(rec.title || g.title);
      setGone(false);
    } else if (!r.ok && r.status === 404) {
      writeSandboxGame({ id: null, title: rec.title, from: rec.from ?? null });
      setPublished(null);
      setGone(true);
    }
  }, []);
  // The classes to offer, asked when the panel opens; the pick starts from what the game already has.
  const publishedAudience = published?.audience ?? null;
  useEffect(() => {
    if (!open) return;
    let live = true;
    void fetchAudiences().then((o) => {
      if (!live) return;
      setAudOptions(o);
      setAudPick(o ? initialPick(o, publishedAudience) : null);
    });
    return () => { live = false; };
  }, [open, publishedAudience]);
  useEffect(() => {
    void refresh();
    const on = () => { setTitle(''); void refresh(); };
    window.addEventListener(GAMES_CHANGED, on);
    return () => window.removeEventListener(GAMES_CHANGED, on);
  }, [refresh]);

  // Not published yet: the student's last choice (or the one a remix is held to).
  useEffect(() => {
    if (!published) setChoice(lockedChoice(from, lastChoice));
  }, [published, from, lastChoice]);

  useEffect(() => {
    if (!open) return;
    const d = declaredMode(getCode());
    setDeclared(modeLabel(d.mode, d.players));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(t) && !dialogRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [open, getCode]);

  // Which of the student's own pictures and sounds the code uses, kept fresh
  // while the panel is open (a sync finishing or a share changing moves them).
  useEffect(() => {
    if (!open) { setUsed([]); setItemsNote(null); return; }
    let live = true;
    const recompute = () => { void findUsedItems(getCode()).then((u) => { if (live) setUsed(u); }); };
    recompute();
    for (const ev of [LIBRARY_SYNC_STATUS, LIBRARY_SHARES_CHANGED, LIBRARY_UPDATED]) window.addEventListener(ev, recompute);
    return () => {
      live = false;
      for (const ev of [LIBRARY_SYNC_STATUS, LIBRARY_SHARES_CHANGED, LIBRARY_UPDATED]) window.removeEventListener(ev, recompute);
    };
  }, [open, getCode]);

  /** Share every used item not shared yet; `audience` = the game's own, when Publish does it, so the art goes where the game goes. */
  async function shareUsed(audience?: AudienceSpec) {
    // Read again rather than trust the panel's list: a sync may have finished since it was drawn.
    const todo = (await findUsedItems(getCode())).filter((u) => u.state === 'not-shared');
    if (!todo.length) return;
    setSharingItems(true);
    setItemsNote(null);
    const errors: string[] = [];
    const done: string[] = [];
    for (const u of todo) {
      const err = await setShared(u.kind, u.name, true, undefined, audience);
      if (err) errors.push(err);
      else done.push(u.name);
    }
    setSharingItems(false);
    setUsed(await findUsedItems(getCode()));
    if (errors.length) {
      setItemsNote({ text: (done.length ? `Shared ${listWords(done)}. ` : '') + [...new Set(errors)].join(' '), bad: true });
    } else {
      setItemsNote({ text: `Shared ${listWords(done)} with your class.`, bad: false });
    }
  }

  async function go(asNew: boolean) {
    setNote(null);
    const t = cleanTitle(title);
    if ('error' in t) { setNote({ text: t.error, bad: true }); return; }
    const c = checkCode(getCode());
    if ('error' in c) { setNote({ text: c.error, bad: true }); return; }
    const updating = asNew ? null : published?.id ?? null;
    let msg: string | undefined;
    if (updating) {
      const m = cleanMessage(message, 'version');
      if ('error' in m) { setNote({ text: m.error, bad: true }); return; }
      msg = m.message;
    }
    setBusy(true);
    const r = await publishGame(t.title, c.code, updating, { choice, remixedFrom: from?.id ?? null, fromVersion: readSandboxGame().fromVersion ?? null, retryAsNew: false, message: msg });
    if (!r.ok) {
      setBusy(false);
      if (r.status === 404 && updating) {
        // Deleted since this panel last looked (by you elsewhere, or by a teacher).
        writeSandboxGame({ id: null, title: t.title, from });
        setPublished(null);
        setGone(true);
        setNote({ text: GONE_TEXT, bad: true });
        return;
      }
      setNote({ text: r.error, bad: true });
      return;
    }
    const id = r.value.game.id;
    const stored = r.value.game.choice ?? choice;
    writeSandboxGame({ id, title: t.title, from, version: r.value.game.version ?? null });
    setAhead(null);
    rememberChoice(stored);
    setGone(false);
    let shared = published && published.id === id ? published.shared : false;
    let shareNote = '';
    // Sent when sharing turns on, and again when it stays on but the classes changed (migration 0057).
    const askAudience = pickerMatters(audOptions) && audPick !== null;
    const audienceChanged = share && shared && askAudience && audPick !== null
      && !samePick(audPick, published && published.id === id ? published.audience : null);
    let audienceNow: ItemAudience | null = published && published.id === id ? published.audience ?? null : null;
    if (share !== shared || audienceChanged) {
      const s = await setGameShared(id, share, stored, share && askAudience && audPick ? pickToSpec(audPick) : undefined);
      if (s.ok) { shared = s.value.shared; audienceNow = shared ? s.value.audience ?? null : null; }
      else shareNote = ` It is not shared yet: ${s.error}`;
    }
    // A new game starts with feedback on; send the switch only when it differs from what the game has.
    const savedNow = r.value.created ? true : feedbackSaved;
    if (feedbackOn !== savedNow) {
      const f = await setGameFeedback(id, feedbackOn);
      if (f.ok) setFeedbackSaved(feedbackOn);
      else shareNote += ` Feedback was not changed: ${f.error}`;
    } else {
      setFeedbackSaved(feedbackOn);
    }
    // Publishing to the class shares the pictures and sounds the game uses too, unless the box was unticked (#129).
    if (shared && shareArt) await shareUsed(askAudience && audPick ? pickToSpec(audPick) : undefined);
    setBusy(false);
    setPublished({ id, title: t.title, shared, choice: stored, version: r.value.game.version, audience: audienceNow, pulled: published?.pulled ?? null });
    setTitle(t.title);
    setMessage('');
    setNote({
      text: (r.value.created ? `Published "${t.title}".` : `Updated "${t.title}": version ${r.value.game.version ?? ''} saved.`)
        + (!shared ? ' Only you can see it until you share it with your class.'
          : stored === 'play' ? ' Your class can play it from Library → Games.'
          : ' Your class can play and remix it from Library → Games.')
        + shareNote,
      bad: !!shareNote,
    });
  }

  const label = published ? 'Published ✓' : 'Publish game';
  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        style={published ? { ...chip, color: 'var(--c-green)', borderColor: 'color-mix(in srgb, var(--c-green) 53%, transparent)' } : chip}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={published ? `Published as "${published.title}". Click to update it.` : 'Publish this sketch so your class can play and remix it.'}
        onClick={() => { setOpen((o) => !o); setNote(null); }}
      >
        <Gamepad2 size={12} />
        {label}
      </button>
      {open && createPortal(
        <div
          ref={dialogRef}
          data-publish-game-panel=""
          role="dialog"
          aria-label="Publish game"
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 'min(820px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box',
            background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6, padding: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)', color: 'var(--c-fg)', fontSize: 13, lineHeight: 1.5,
          }}
        >
          <h2 style={{ fontSize: 14, margin: '0 0 6px' }}>{published ? 'Update your game' : 'Publish this sketch as a game'}</h2>
          <p style={{ margin: '0 0 8px', color: 'var(--c-dim)' }}>
            Publishing saves this code as a game in your Library. Shared with your class, classmates
            can <strong style={{ color: 'var(--c-fg)' }}>play</strong> it on its own page, and you choose
            whether they can also <strong style={{ color: 'var(--c-fg)' }}>remix</strong> it (copy the code into their own sandbox to change it).
            {published ? ' Publishing again replaces the code they get.' : ''}
          </p>
          <RemixCreditLine from={from} style={{ fontSize: 12, margin: '0 0 8px' }} />
          {gone && !published && (!note || note.text !== GONE_TEXT) && (
            <p style={{ margin: '0 0 8px', color: 'var(--c-orange)' }}>{GONE_TEXT}</p>
          )}
          {published && (
            <p style={{ margin: '0 0 8px' }}>
              Published as <strong>&ldquo;{published.title}&rdquo;</strong>
              {' · '}
              <span style={{ color: published.shared ? 'var(--c-green)' : 'var(--c-dim)' }}>
                {published.shared ? `shared with your class (${CHOICE_TEXT.game[published.choice].short})` : 'not shared'}
              </span>
              {' · '}
              <a href={playHref(published.id)} style={{ color: 'var(--c-cyan)' }}>Play page</a>
              {published.version ? <>{' · '}<a href={gameChangesHref(published.id, 'history')} style={{ color: 'var(--c-cyan)' }}>History (version {published.version})</a></> : null}
            </p>
          )}
          {published && ahead && aheadRes?.kind !== 'conflict' && (
            <div style={{ margin: '0 0 8px', padding: '8px 10px', border: '1px solid color-mix(in srgb, var(--c-orange) 55%, transparent)', borderRadius: 4 }}>
              Your game is at version {ahead.newest}, but your sandbox code is version {ahead.from}
              {' '}(you accepted a change, or updated from another computer). Bring it in first, or Update replaces it.
              <div style={{ marginTop: 6 }}>
                <button type="button" style={{ ...quiet, fontSize: 12, padding: '4px 10px' }} disabled={busy} onClick={() => {
                  setBusy(true);
                  void bringInOwnNewest().then((r) => {
                    setBusy(false);
                    setAheadRes(r);
                    if (r.kind === 'merged') { setAhead(null); setAheadRes(null); setNote({ text: `Brought in version ${r.version}. Your code from before is in History. Run it, then Update.`, bad: false }); }
                    else if (r.kind === 'error') setNote({ text: r.text, bad: true });
                  });
                }}>Bring in version {ahead.newest}</button>
              </div>
            </div>
          )}
          {published && aheadRes?.kind === 'conflict' && (
            <div style={{ margin: '0 0 8px', padding: '8px 10px', border: '1px solid color-mix(in srgb, var(--c-orange) 55%, transparent)', borderRadius: 4 }}>
              <div style={{ color: 'var(--c-orange)' }}>{aheadRes.text}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <button type="button" style={{ ...quiet, fontSize: 12, padding: '4px 10px' }} onClick={() => { setAheadRes(null); setAhead(null); }}>Keep my sandbox code</button>
                <button type="button" style={{ ...quiet, fontSize: 12, padding: '4px 10px' }} onClick={() => {
                  startFromOwnNewest(aheadRes.newestCode, aheadRes.version, published.title);
                  setAheadRes(null); setAhead(null);
                  setNote({ text: `Your sandbox has version ${aheadRes.version} now. Your old code is in History.`, bad: false });
                }}>Take version {aheadRes.version}</button>
              </div>
            </div>
          )}
          {published && (
            <>
              <label style={{ display: 'block', margin: '0 0 4px' }} htmlFor="publish-game-message">What did you change?</label>
              <input
                id="publish-game-message"
                value={message}
                maxLength={MESSAGE_MAX}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void go(false); }}
                placeholder="Added a second level"
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 4, fontSize: 13,
                  background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
                }}
              />
              <div style={{ margin: '0 0 8px' }}><GitHubWord>{GITHUB_WORD.version}</GitHubWord></div>
            </>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0 16px', alignItems: 'start' }}>
          <div>
          <label style={{ display: 'block', margin: '0 0 4px' }} htmlFor="publish-game-title">Title</label>
          <input
            id="publish-game-title"
            value={title}
            maxLength={GAME_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void go(false); }}
            placeholder="Pong Duel"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 4, fontSize: 13,
              background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
            }}
          />
          <div style={{ color: 'var(--c-dim)', fontSize: 12, margin: '4px 0 8px' }}>
            This sketch says: {declared}.
            {declared === '1 player' && <> Add <code>multiplayer(&apos;versus&apos;, 2)</code> in <code>setup()</code> to play a classmate online.</>}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 10px' }}>
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            Share with my class
          </label>
          {share && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 10px' }}
              title="Classmates can write comments and pick suggestions under your game. You can change this later on its play page.">
              <input type="checkbox" checked={feedbackOn} onChange={(e) => setFeedbackOn(e.target.checked)} />
              Let classmates give feedback
            </label>
          )}
          </div>
          {share && (
            <div>
              {audPick && <AudiencePicker options={audOptions} value={audPick} onChange={setAudPick} idPrefix="publish-game-audience" pulled={published?.pulled} />}
              <ShareChoicePicker thing="game" value={choice} onChange={setChoice} from={from} idPrefix="publish-game" />
            </div>
          )}
          </div>
          {used.length > 0 && (
            <div style={{ margin: '0 0 10px', padding: '8px 10px', border: '1px solid var(--c-line)', borderRadius: 4 }}>
              <p style={{ margin: '0 0 4px' }}>{usesSentence(used)}</p>
              <ul style={{ margin: '0 0 6px', padding: 0, listStyle: 'none', fontSize: 12 }}>
                {used.map((u) => (
                  <li key={`${u.kind}:${u.name}`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ overflowWrap: 'anywhere' }}>{u.name}</span>
                    <span style={{ color: 'var(--c-dim)' }}>({u.kind === 'texture' ? 'picture' : 'sound'})</span>
                    <span style={{ color: u.state === 'shared' ? 'var(--c-green)' : u.state === 'not-shared' ? 'var(--c-orange)' : 'var(--c-dim)' }}>
                      {u.state === 'shared' ? 'Shared ✓' : u.state === 'not-shared' ? 'Not shared with your class' : 'Not saved to your account yet'}
                    </span>
                  </li>
                ))}
              </ul>
              {used.some((u) => u.state !== 'shared') && (
                <p style={{ margin: '0 0 6px', color: 'var(--c-dim)', fontSize: 12 }}>
                  Classmates only see pictures and sounds you share with your class.
                  {used.some((u) => u.state === 'local') && ' One that is not saved to your account yet cannot be shared: it saves there by itself in a moment, then you can share it.'}
                </p>
              )}
              {share && used.some((u) => u.state === 'not-shared') && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 6px', fontSize: 12 }}>
                  <input type="checkbox" checked={shareArt} onChange={(e) => setShareArt(e.target.checked)} />
                  Also share them with my class when I publish
                </label>
              )}
              {used.some((u) => u.state === 'not-shared') && (
                <button
                  type="button"
                  style={{ ...quiet, fontSize: 12, padding: '4px 10px', opacity: sharingItems ? 0.6 : 1 }}
                  disabled={sharingItems}
                  onClick={() => void shareUsed()}
                >
                  {sharingItems ? 'Sharing…' : 'Share them with my class'}
                </button>
              )}
              {itemsNote && (
                <div role="status" aria-live="polite" style={{ marginTop: 6, fontSize: 12, color: itemsNote.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
                  {itemsNote.text}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={{ ...primary, opacity: busy || (!!published && !message.trim()) ? 0.6 : 1 }}
              disabled={busy || (!!published && !message.trim()) || (share && pickerMatters(audOptions) && !!audPick && !!pickProblem(audPick))}
              title={published && !message.trim() ? 'Say what you changed first' : undefined}
              onClick={() => void go(gone && !published)}>
              {busy ? 'Publishing…' : published ? 'Update game' : gone ? 'Publish as a new game' : 'Publish'}
            </button>
            {published && (
              <button type="button" style={quiet} disabled={busy} onClick={() => void go(true)} title="Keep the old game and publish this as another one">
                Publish as a new game
              </button>
            )}
            <button type="button" style={quiet} onClick={() => setOpen(false)}>Close</button>
          </div>
          {note && (
            <div role="status" aria-live="polite" style={{ marginTop: 8, color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
              {note.text}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
