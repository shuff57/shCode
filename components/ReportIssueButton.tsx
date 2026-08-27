'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createIssueReport, IssueKind } from '../lib/issue-reports-api';
import { uploadImage, UploadError } from '../lib/uploads';
import { useLessonStore } from '../lib/store';
import { getCurrentUser } from '../lib/auth';

// ---------------------------------------------------------------------------
// Floating "Report an issue" button, mounted once in app/layout.tsx so it is
// available on every page. Files a report into D1 (issue_reports) with
// auto-captured context: where the student is, what lesson, their browser,
// and their current code for the open file — so a bug report can be
// reproduced without asking the student anything.
// ---------------------------------------------------------------------------

const KINDS: { value: IssueKind; label: string; hint: string }[] = [
  { value: 'bug', label: 'Bug', hint: "doesn't work" },
  { value: 'quirk', label: 'Quirky', hint: 'works, but picky' },
  { value: 'enhancement', label: 'Enhance', hint: 'wish it had' },
];

const KIND_COLOR: Record<IssueKind, string> = {
  bug: '#f87171',
  quirk: '#fbbf24',
  enhancement: '#22c55e',
};

// Single attachment, same limits as student image uploads (MAX_UPLOAD_BYTES
// in functions/_shared/uploads.ts); the server re-checks everything and is
// authoritative — these numbers only keep the obvious rejects client-side.
const MAX_SCREENSHOT_MB = 2;

export default function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<IssueKind>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Screenshot attachment: picked via file input or pasted from the
  // clipboard. Upload fires as soon as one is chosen — the POST
  // /api/issue-reports call then sends only the returned id, so a large
  // image never has to ride along with the JSON report and a slow upload
  // doesn't block the send button on two round-trips at once.
  const [screenshotId, setScreenshotId] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBusy, setScreenshotBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setSignedIn(!!u));
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
      setTimeout(() => textareaRef.current?.focus(), 0);
    } else {
      dialog.close();
    }
  }, [open]);

  // object URLs are process-global; drop the last one before making a new one
  // and on unmount, or every attached screenshot leaks until reload.
  useEffect(() => {
    return () => {
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    };
  }, [screenshotPreview]);

  function clearScreenshot() {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
    setScreenshotId(null);
  }

  async function acceptScreenshot(file: File) {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Screenshots must be images (PNG, JPEG, GIF, or WebP).');
      return;
    }
    if (file.size > MAX_SCREENSHOT_MB * 1024 * 1024) {
      setError(`That image is over ${MAX_SCREENSHOT_MB} MB. Try a smaller screenshot.`);
      return;
    }
    setScreenshotBusy(true);
    const preview = URL.createObjectURL(file);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(preview);
    try {
      const item = await uploadImage(file);
      setScreenshotId(item.id);
    } catch (err) {
      // Preview off, error up: the report can still be sent without it.
      URL.revokeObjectURL(preview);
      setScreenshotPreview(null);
      setScreenshotId(null);
      setError(
        err instanceof UploadError && err.message
          ? `Screenshot not attached: ${err.message}`
          : 'Screenshot could not be attached. You can still send the report.',
      );
    } finally {
      setScreenshotBusy(false);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      void acceptScreenshot(file);
    }
  }

  function close() {
    setOpen(false);
    setDone(false);
    setError(null);
    setKind('bug');
    setMessage('');
    clearScreenshot();
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

    const lesson = useLessonStore.getState().lesson;
    if (lesson) {
      ctx.lessonId = lesson.id;
      ctx.lessonTitle = lesson.title;
      const currentFile = useLessonStore.getState().currentFile;
      if (currentFile) {
        ctx.currentFile = currentFile;
        const content = useLessonStore.getState().fileContents[currentFile];
        // Cap the snapshot — a runaway generator shouldn't blow the
        // 16 KB context cap server-side and silently drop the rest.
        ctx.currentFileContent =
          typeof content === 'string' && content.length <= 8000 ? content : undefined;
        ctx.currentFileContentTruncated =
          typeof content === 'string' && content.length > 8000;
      }
    }
    return ctx;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || screenshotBusy) return;
    setSending(true);
    setError(null);
    try {
      await createIssueReport(kind, message.trim(), captureContext(), screenshotId);
      setDone(true);
      setTimeout(() => close(), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  if (signedIn === false) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Report a bug, quirk, or idea"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          background: 'var(--card)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          transition: 'border-color 120ms, color 120ms',
        }}
      >
        Report an issue
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
          <div style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ color: '#22c55e', fontWeight: 700, margin: 0 }}>Reported — thank you!</p>
          </div>
        ) : (
          <form onSubmit={submit} className="issue-form">
            <h3 style={{ marginTop: 0 }}>Report an issue</h3>
            <p style={{ color: 'var(--text)', opacity: 0.7, fontSize: 13, marginTop: 0 }}>
              Your page, lesson, and current code are attached automatically —
              just tell us what happened. A screenshot helps: paste one
              (Ctrl+V) or attach a file.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 6,
                    border: `2px solid ${kind === k.value ? KIND_COLOR[k.value] : 'var(--border)'}`,
                    background: kind === k.value ? 'rgba(91, 170, 253, 0.08)' : 'transparent',
                    color: kind === k.value ? KIND_COLOR[k.value] : 'var(--text)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{k.label}</div>
                  <div style={{ fontSize: 11 }}>{k.hint}</div>
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                kind === 'bug'
                  ? 'What did you try to do, and what went wrong?'
                  : kind === 'quirk'
                    ? 'What feels off or picky about how this works?'
                    : 'What would you like to be able to do?'
              }
              required
              minLength={3}
              maxLength={4000}
              rows={5}
              style={{
                width: '100%',
                padding: 8,
                marginBottom: 12,
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              {screenshotPreview ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <img
                    src={screenshotPreview}
                    alt="Screenshot attachment preview"
                    style={{
                      height: 44,
                      maxWidth: 90,
                      objectFit: 'cover',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      display: 'block',
                    }}
                  />
                  <span style={{ fontSize: 12, flex: 1, opacity: 0.7 }}>
                    {screenshotId
                      ? 'Screenshot attached'
                      : screenshotBusy
                        ? 'Attaching…'
                        : 'Not attached'}
                  </span>
                  <button
                    type="button"
                    onClick={clearScreenshot}
                    disabled={screenshotBusy}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      padding: '3px 10px',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: screenshotBusy ? 'wait' : 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={screenshotBusy}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontSize: 13,
                      cursor: screenshotBusy ? 'wait' : 'pointer',
                    }}
                  >
                    {screenshotBusy ? 'Attaching…' : 'Attach screenshot'}
                  </button>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>
                    optional · paste works too · max {MAX_SCREENSHOT_MB} MB
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void acceptScreenshot(file);
                  // Reset so picking the same file again still fires change.
                  e.target.value = '';
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: 8,
                  marginBottom: 12,
                  background: 'rgba(220, 38, 38, 0.12)',
                  color: '#f87171',
                  border: '1px solid #dc2626',
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={close}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  padding: '6px 14px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || screenshotBusy || message.trim().length < 3}
                style={{
                  background: KIND_COLOR[kind],
                  color: '#1a1a1a',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: sending ? 'wait' : 'pointer',
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Sending…' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </dialog>
      <style>{`
        .issue-dialog {
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--card);
          color: var(--text);
          width: min(440px, 92vw);
        }
        .issue-dialog::backdrop { background: rgba(0,0,0,0.5); }
        .issue-form { padding: 20px; }
      `}</style>
    </>
  );
}