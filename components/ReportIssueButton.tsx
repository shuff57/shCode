'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Flag } from 'lucide-react';
import { createIssueReport, IssueKind } from '../lib/issue-reports-api';
import { uploadImage, deleteUpload, UploadError } from '../lib/uploads';
import { useLessonStore } from '../lib/store';
import { getCurrentUser } from '../lib/auth';

// ---------------------------------------------------------------------------
// Floating "Report an issue" button, mounted once in app/layout.tsx so it is
// available on every page. Files a report into D1 (issue_reports) with
// auto-captured context: where the student is, what lesson, their browser,
// and their current code for the open file — so a bug report can be
// reproduced without asking the student anything.
//
// Kind, title, description, send. That is the whole form on purpose: every
// control here is one a student has to read before they can report anything,
// and a student annoyed enough to file a bug will abandon a long form. The
// auto-captured context gets one line of mention and is never shown — curating
// it is not their job.
//
// Layout lives in the <style> block rather than in style={{}} props. This file
// used to be ~440 lines, most of it inline style objects on elements that
// exist once; the CSS is shorter and it is what lets globals.css reposition
// the pill on pages that have a fixed footer.
// ---------------------------------------------------------------------------

// The hint under each label is doing real work: "quirk" and "enhancement" are
// our words, not a 14-year-old's, and without the gloss everything lands in
// Bug. Kept from the original form for exactly that reason.
const KINDS: { value: IssueKind; label: string; hint: string }[] = [
  { value: 'bug', label: 'Bug', hint: "doesn't work" },
  { value: 'quirk', label: 'Quirk', hint: 'works, but picky' },
  // The stored value stays 'enhancement': it is inside a CHECK constraint on
  // issue_reports (migration 0018), and renaming it would cost a migration to
  // buy a synonym. Only the label a student reads says "Improve".
  { value: 'enhancement', label: 'Improve', hint: 'wish it had' },
];

const KIND_COLOR: Record<IssueKind, string> = {
  bug: '#f87171',
  quirk: '#fbbf24',
  enhancement: '#22c55e',
};

const PLACEHOLDER: Record<IssueKind, { title: string; body: string }> = {
  bug: {
    title: 'Run button does nothing on 2.4',
    body: 'What did you try, and what happened instead?',
  },
  quirk: {
    title: 'Grader wants exactly two spaces',
    body: 'What feels off or picky about how this works?',
  },
  enhancement: {
    title: 'Let me rename my files',
    body: 'What would you like to be able to do?',
  },
};

const MAX_TITLE = 120;
// Same limit as student image uploads (MAX_UPLOAD_BYTES in
// functions/_shared/uploads.ts); the server re-checks and is authoritative.
const MAX_SCREENSHOT_MB = 2;
/** Code snapshot cap. The server DROPS a context over 16 KB rather than
 *  truncating it, so staying well under keeps the rest of the report. */
const MAX_SNAPSHOT_CHARS = 8000;

export default function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<IssueKind>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  // Screenshot: picked or pasted. The upload fires as soon as one is chosen,
  // so the report POST carries only the returned id and never the bytes.
  const [shotId, setShotId] = useState<string | null>(null);
  const [shotPreview, setShotPreview] = useState<string | null>(null);
  const [shotBusy, setShotBusy] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // An uploaded-but-unsent screenshot is a real file inside the student's
  // 20 MB / 40 file quota. These two refs are what let us hand it back on
  // cancel: state reads stale inside an unmount cleanup, and `committed` is
  // how we know the report now owns the image and must NOT delete it.
  const shotIdRef = useRef<string | null>(null);
  const committedRef = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    getCurrentUser().then((u) => setSignedIn(!!u));
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
      setTimeout(() => titleRef.current?.focus(), 0);
    } else {
      dialog.close();
    }
  }, [open]);

  // Unmount: hand back an attachment nobody is going to use. Navigating away
  // mid-report is the common case, and without this every abandoned screenshot
  // sits in the student's quota forever with nothing in any UI pointing at it.
  useEffect(() => {
    return () => {
      const id = shotIdRef.current;
      if (id && !committedRef.current) void deleteUpload(id).catch(() => {});
    };
  }, []);

  function setShot(id: string | null, preview: string | null) {
    shotIdRef.current = id;
    setShotId(id);
    setShotPreview(preview);
  }

  /** Drop the attachment locally AND server-side, unless a report claimed it. */
  function discardShot() {
    const id = shotIdRef.current;
    if (shotPreview) URL.revokeObjectURL(shotPreview);
    if (id && !committedRef.current) void deleteUpload(id).catch(() => {});
    setShot(null, null);
  }

  async function acceptShot(file: File) {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Screenshots must be images (PNG, JPEG, GIF, or WebP).');
      return;
    }
    if (file.size > MAX_SCREENSHOT_MB * 1024 * 1024) {
      setError(`That image is over ${MAX_SCREENSHOT_MB} MB. Try a smaller screenshot.`);
      return;
    }
    // Replacing one? The old upload is already stored — give it back first.
    discardShot();
    setShotBusy(true);
    const preview = URL.createObjectURL(file);
    setShot(null, preview);
    try {
      const item = await uploadImage(file);
      setShot(item.id, preview);
    } catch (err) {
      // Preview off, error up: the report can still be sent without it.
      URL.revokeObjectURL(preview);
      setShot(null, null);
      setError(
        err instanceof UploadError && err.message
          ? `Screenshot not attached: ${err.message}`
          : 'Screenshot could not be attached. You can still send the report.',
      );
    } finally {
      setShotBusy(false);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      void acceptShot(file);
    }
  }

  function close() {
    discardShot();
    committedRef.current = false;
    setOpen(false);
    setDone(false);
    setError(null);
    setKind('bug');
    setTitle('');
    setMessage('');
  }

  /**
   * Everything the server should know that the student shouldn't have to type.
   * Snapshot of the *current file only* — the full workspace is already in the
   * student's commit history, and 30 KB of unrelated files in every report
   * makes the queue unreadable.
   */
  function captureContext(): Record<string, unknown> {
    const ctx: Record<string, unknown> = {
      path: pathname,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      screen: typeof window !== 'undefined'
        ? { w: window.innerWidth, h: window.innerHeight }
        : undefined,
    };

    const store = useLessonStore.getState();
    const lesson = store.lesson;
    if (lesson) {
      ctx.lessonId = lesson.id;
      ctx.lessonTitle = lesson.title;
      const currentFile = store.currentFile;
      if (currentFile) {
        ctx.currentFile = currentFile;
        const content = store.fileContents[currentFile];
        const short = typeof content === 'string' && content.length <= MAX_SNAPSHOT_CHARS;
        ctx.currentFileContent = short ? content : undefined;
        ctx.currentFileContentTruncated = typeof content === 'string' && !short;
      }
    }
    return ctx;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || shotBusy) return;
    setSending(true);
    setError(null);
    try {
      await createIssueReport(kind, title.trim(), message.trim(), captureContext(), shotId);
      // The report owns the screenshot now. This must be set BEFORE the
      // auto-close below, or close() deletes the image out from under it.
      committedRef.current = true;
      setDone(true);
      setTimeout(() => close(), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  if (signedIn === false) return null;

  const ready = title.trim().length >= 3 && message.trim().length >= 3;

  return (
    <>
      <button
        type="button"
        className="issue-fab"
        onClick={() => setOpen(true)}
        title="Report an issue: a bug, quirk, or idea"
        aria-label="Report an issue"
      >
        <Flag size={16} aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        className="issue-dialog"
        onClose={close}
        onPaste={onPaste}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {done ? (
          <p className="issue-done">Reported — thank you!</p>
        ) : (
          <form onSubmit={submit} className="issue-form">
            <h3>Report an issue</h3>

            <div className="issue-kinds">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  aria-pressed={kind === k.value}
                  className="issue-kind"
                  style={
                    kind === k.value
                      ? { borderColor: KIND_COLOR[k.value], color: KIND_COLOR[k.value] }
                      : undefined
                  }
                >
                  <span className="issue-kind-label">{k.label}</span>
                  <span className="issue-kind-hint">{k.hint}</span>
                </button>
              ))}
            </div>

            <label className="issue-label" htmlFor="issue-title">
              Title
            </label>
            <input
              id="issue-title"
              ref={titleRef}
              className="issue-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={PLACEHOLDER[kind].title}
              required
              minLength={3}
              maxLength={MAX_TITLE}
            />

            <label className="issue-label" htmlFor="issue-body">
              Description
            </label>
            <textarea
              id="issue-body"
              className="issue-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={PLACEHOLDER[kind].body}
              required
              minLength={3}
              maxLength={4000}
              rows={4}
            />

            <div className="issue-shot">
              {shotPreview ? (
                <>
                  <img src={shotPreview} alt="Screenshot attachment preview" />
                  <span>
                    {shotId ? 'Screenshot attached' : shotBusy ? 'Attaching...' : 'Not attached'}
                  </span>
                  <button type="button" onClick={discardShot} disabled={shotBusy}>
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={shotBusy}>
                    {shotBusy ? 'Attaching...' : 'Attach screenshot'}
                  </button>
                  <span>or paste one — optional, max {MAX_SCREENSHOT_MB} MB</span>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void acceptShot(file);
                  // Reset so picking the same file again still fires change.
                  e.target.value = '';
                }}
              />
            </div>

            {error && <div className="issue-error">{error}</div>}

            <p className="issue-note">
              Your page, lesson, and current code are attached automatically.
            </p>

            <div className="issue-actions">
              <button type="button" onClick={close}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || shotBusy || !ready}
                className="issue-send"
                style={{ background: KIND_COLOR[kind] }}
              >
                {sending ? 'Sending...' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </dialog>

      <style>{`
        .issue-fab {
          position: fixed;
          bottom: 20px;
          right: 20px;
          /* Below TabbedRightDrawer (900) on purpose: a floating pill sitting
             on top of an open drawer covers the drawer's own content. Above
             everything else, which is why clearing the fixed lesson footer is
             a globals.css rule rather than a bigger z-index here. */
          z-index: 899;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          /* An icon, not a labelled pill. The pill was ~140px wide and sat
             permanently over whatever lived in that corner -- reported twice
             (#8, #11) with screenshots. The label lives in title/aria-label
             instead, which costs a hover but frees the corner. */
          border-radius: 50%;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          padding: 0;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
          transition: border-color 120ms, color 120ms, bottom 220ms ease;
        }
        .issue-fab:hover { border-color: var(--brand); color: var(--brand); }

        .issue-dialog {
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--card);
          color: var(--text);
          width: min(420px, 92vw);
        }
        .issue-dialog::backdrop { background: rgba(0,0,0,0.5); }
        .issue-form { padding: 18px; }
        .issue-form h3 { margin: 0 0 12px; font-size: 16px; }
        .issue-done {
          padding: 24px; margin: 0; text-align: center;
          font-weight: 700; color: #22c55e;
        }

        .issue-kinds { display: flex; gap: 6px; margin-bottom: 14px; }
        .issue-kind {
          flex: 1;
          padding: 6px 4px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: transparent;
          color: var(--text);
          font-family: inherit;
          cursor: pointer;
          /* Border grows to 2px on select; the padding shrinks by the same
             1px so the row does not jog when you change your mind. */
        }
        .issue-kind[aria-pressed="true"] { border-width: 2px; padding: 5px 3px; }
        .issue-kind-label { display: block; font-size: 14px; font-weight: 700; }
        .issue-kind-hint { display: block; font-size: 11px; opacity: 0.75; }

        .issue-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.7;
          margin-bottom: 4px;
        }
        .issue-input {
          width: 100%;
          box-sizing: border-box;
          padding: 7px 8px;
          margin-bottom: 12px;
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }

        .issue-shot { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .issue-shot img {
          height: 40px; max-width: 80px; object-fit: cover;
          border: 1px solid var(--border); border-radius: 4px; display: block;
        }
        .issue-shot span { flex: 1; min-width: 0; font-size: 12px; opacity: 0.6; }
        .issue-shot button {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
        }
        .issue-shot button:disabled { cursor: wait; }

        .issue-error {
          padding: 8px; margin-bottom: 10px; font-size: 13px;
          background: rgba(220,38,38,0.12); color: #f87171;
          border: 1px solid #dc2626; border-radius: 4px;
        }
        .issue-note { margin: 0 0 14px; font-size: 11px; opacity: 0.5; }

        .issue-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .issue-actions button {
          padding: 7px 14px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
        }
        .issue-send { border: none; color: #1a1a1a; }
        .issue-send:disabled { opacity: 0.45; cursor: not-allowed; }
      `}</style>
    </>
  );
}
