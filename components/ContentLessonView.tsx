'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Lesson } from '../lib/types';
import { badgeFor } from '../lib/lesson-badges';
import CompletionPanel from './CompletionPanel';
import WrittenGrader from './WrittenGrader';
import DiagramAssignmentView from './DiagramAssignmentView';
import QuizView from './QuizView';
import MarkdownWithLiveBlocks from './MarkdownWithLiveBlocks';
import HeaderLessonNav from './HeaderLessonNav';
import { withInlineCode } from './InlineCode';
import TabbedRightDrawer, { type DrawerTab } from './TabbedRightDrawer';
import DocsDrawer from './DocsDrawer';

interface Props {
  lesson: Lesson;
}

function findContent(lesson: Lesson): string {
  const node = lesson.files.find((f) => f.type === 'file' && f.name === 'content.md') as any;
  return node?.content ?? '';
}

// youtube-nocookie, not youtube.com, for two reasons that both matter in a
// school: it holds off on tracking cookies until a student presses play, and it
// is the same host bookSHelf frames from — so a network allowlist has one
// YouTube domain to name instead of two. The video id is identical either way.
function toEmbedUrl(url: string): string {
  // `youtube(-nocookie)?\.com` so a teacher pasting an already-nocookie link
  // still gets normalized rather than falling through unmatched.
  const yt = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  return url;
}

// A self-hosted video file, as opposed to a YouTube/Vimeo page to be framed.
// Cache-busting query strings (`?v=20260816`) are routine on these, so test the
// path only — matching against the whole URL misses every versioned file.
function isMediaFile(url: string): boolean {
  return /\.(mp4|webm|ogv|mov|m4v)$/i.test(url.split(/[?#]/)[0]);
}

export default function ContentLessonView({ lesson }: Props) {
  const preview = lesson.preview as string;
  const badge = badgeFor(preview);
  const contentMd = findContent(lesson);
  const meta = lesson as any;

  // A lesson can name a deck that hasn't been authored yet. Embedding that URL
  // blind puts a raw 404 page inside the lesson, which is a worse first
  // impression than saying plainly that the deck isn't ready — so check it
  // exists before framing it. Self-healing: publish the deck and the lesson
  // starts showing it with no edit to lesson.json.
  const slidesUrl: string | undefined = preview === 'slides' ? meta.slidesUrl : undefined;
  const [deckReady, setDeckReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!slidesUrl) return;
    let cancelled = false;
    fetch(slidesUrl, { method: 'HEAD' })
      .then((r) => !cancelled && setDeckReady(r.ok))
      .catch(() => !cancelled && setDeckReady(false));
    return () => {
      cancelled = true;
    };
  }, [slidesUrl]);

  // Did the deck actually render? Decks are vendored under /slides/ (see
  // scripts/sync-decks.mjs), so the frame is same-origin and we can look inside
  // it: once it has loaded, an empty body, about:blank, or an error/404 page
  // means the student is looking at nothing and gets a pointer to the new-tab
  // button. A working deck never shows the note. A deck that renders late gets
  // one more look before we say anything.
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [deckBlank, setDeckBlank] = useState(false);
  const showFrame = !!slidesUrl && deckReady === true;

  const checkFrame = (final: boolean) => {
    const f = frameRef.current;
    if (!f) return;
    let bad = false;
    try {
      const doc = f.contentDocument;
      if (!doc) bad = true;
      else if (doc.readyState !== 'complete') return;
      else {
        const text = (doc.body?.innerText ?? '').trim();
        bad =
          doc.location.href === 'about:blank' ||
          text.length < 20 ||
          /^(404|not found|error)\b/i.test(doc.title.trim());
      }
    } catch {
      bad = true; // cross-origin or otherwise unreadable: not the vendored deck
    }
    if (!bad) setDeckBlank(false);
    else if (final) setDeckBlank(true);
    else window.setTimeout(() => checkFrame(true), 1500);
  };

  useEffect(() => {
    setDeckBlank(false);
  }, [slidesUrl]);


  return (
    <>
      <TabbedRightDrawer
        storageKey="shCode:content-drawer"
        tabs={[
          {
            key: 'docs',
            label: 'Docs',
            color: '#bd93f9',
            content: <DocsDrawer defaultSetId="js" storageKey="shCode:lesson-docs" />,
          },
        ]}
      />
      <main style={{ maxWidth: 960, width: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '24px 20px 80px', color: '#f8f8f2' }}>
      <nav style={{ marginBottom: 12, fontSize: 13, color: '#888' }}>
        <Link href="/" style={{ color: '#8be9fd' }}>Home</Link>
        {lesson.unit ? (
          <>
            <span style={{ margin: '0 8px' }}>›</span>
            <Link href={`/module/${lesson.unit.split(' ')[0]}`} prefetch={false} style={{ color: '#8be9fd' }}>
              {lesson.unit}
            </Link>
          </>
        ) : null}
        <span style={{ margin: '0 8px' }}>›</span>
        <span>{lesson.title}</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: badge.color + '22',
            color: badge.color,
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            border: '1px solid ' + badge.color + '55',
          }}
        >
          <badge.Icon size={13} strokeWidth={2.25} />
          {badge.label}
        </span>
        <span style={{ color: '#888', fontSize: 13 }}>~{lesson.estimateMins ?? '?'} min</span>
      </div>

      <h1 style={{ margin: '4px 0 6px' }}>{lesson.title}</h1>
      {lesson.description ? (
        <p style={{ color: '#888', marginTop: 0 }}>{withInlineCode(lesson.description)}</p>
      ) : null}

      {preview === 'video' ? (
        meta.videoUrl && meta.videoUrl.trim() ? (
          <div style={{ aspectRatio: '16 / 9', marginTop: 16, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
            {/* A YouTube link still gets an iframe. A direct file gets a real
                <video>, because an mp4 dropped into an iframe renders the
                browser's bare player and shows NO captions — a soft mov_text
                track inside the container is ignored there, so the iframe path
                would silently discard the CC. `captionsUrl` names a .vtt beside
                the video; without one the player just has no caption track. */}
            {isMediaFile(meta.videoUrl) ? (
              <video
                src={meta.videoUrl}
                controls
                playsInline
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', display: 'block' }}
              >
                {meta.captionsUrl ? (
                  <track
                    kind="captions"
                    src={meta.captionsUrl}
                    srcLang="en"
                    label="English"
                    default
                  />
                ) : null}
              </video>
            ) : (
              <iframe
                src={toEmbedUrl(meta.videoUrl)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            )}
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: 20, background: '#282a36', borderRadius: 8, border: '1px dashed #555', color: '#aaa' }}>
            <strong style={{ color: '#ff79c6' }}>No video URL set yet.</strong>
            <p style={{ margin: '8px 0 0', fontSize: 14 }}>
              {meta.videoFallback ?? "Teacher will paste a YouTube URL into this lesson's lesson.json (videoUrl field) when ready."}
            </p>
          </div>
        )
      ) : null}

      {preview === 'slides' ? (
        slidesUrl && deckReady === true ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <a
                href={slidesUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#50fa7b',
                  color: '#282a36',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '10px 18px',
                  borderRadius: 8,
                  textDecoration: 'none',
                }}
              >
                Open in new tab →
              </a>
              <span style={{ color: '#8393c4', fontSize: 13 }}>Full screen, editable code blocks</span>
            </div>
            {deckBlank ? (
              <p role="status" style={{ margin: '0 0 8px', color: '#f1fa8c', fontSize: 14 }}>
                Slides blank? Open them in a new tab.
              </p>
            ) : null}
            <div style={{ aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', background: '#000', border: '1px solid #44475a' }}>
              <iframe
                ref={frameRef}
                title={`Slides: ${lesson.title}`}
                onLoad={() => checkFrame(false)}
                src={slidesUrl}
                allow="autoplay; clipboard-write; fullscreen"
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </div>
        ) : slidesUrl && deckReady === null ? (
          <div style={{ marginTop: 16, padding: 20, background: '#282a36', borderRadius: 8, border: '1px solid #44475a', color: '#6272a4' }}>
            Loading slides…
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: 20, background: '#282a36', borderRadius: 8, border: '1px dashed #555', color: '#aaa' }}>
            <strong style={{ color: '#bd93f9' }}>These slides aren&apos;t published yet.</strong>
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55 }}>
              Nothing is missing on your end — your teacher hasn&apos;t built this deck yet. Everything
              you need for this unit is in the lessons that follow, so mark this complete and carry on.
            </p>
          </div>
        )
      ) : null}

      {meta.externalLink ? (
        <p style={{ margin: '16px 0' }}>
          <a href={meta.externalLink} target="_blank" rel="noopener noreferrer" style={{ color: '#50fa7b', textDecoration: 'none' }}>
            → {meta.externalLinkLabel ?? meta.externalLink}
          </a>
        </p>
      ) : null}

      {contentMd ? (
        <div style={{ marginTop: 20 }}>
          <MarkdownWithLiveBlocks src={contentMd} lessonId={lesson.id} />
        </div>
      ) : null}

      {meta.quiz ? (
        <QuizView lessonId={lesson.id} config={meta.quiz} />
      ) : meta.diagram ? (
        <DiagramAssignmentView
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          config={meta.diagram}
          fallbackPrompt={contentMd.slice(0, 2000)}
          unit={lesson.unit}
        />
      ) : meta.aiGrader ? (
        <WrittenGrader
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          // aiGrader.prompt is the grading brief -- on a summative item it
          // spells out the accepted answers, so a student reading it would be
          // reading the rubric mid-exam. The grader still gets the full text
          // server-side (functions/api/grade-written.ts reads it from
          // public/ai-graders.json, never from this prop). content.md above
          // already states the actual questions, so there is nothing lost by
          // showing nothing here. Formative items are unaffected -- their
          // prompt IS the instructions and keeps rendering as before.
          prompt={meta.aiGrader.summative ? '' : (meta.aiGrader.prompt ?? contentMd.slice(0, 2000))}
          config={meta.aiGrader}
        />
      ) : (
        <CompletionPanel lessonId={lesson.id} lessonType={preview} />
      )}

      <div style={{ marginTop: 24 }}>
        <HeaderLessonNav />
      </div>

      <style>{`
        .content-prose h1 { font-size: 1.4em; margin-top: 28px; }
        .content-prose h2 { margin-top: 24px; color: #f8f8f2; border-bottom: 1px solid #333; padding-bottom: 4px; }
        .content-prose h3 { margin-top: 18px; color: #bd93f9; }
        .content-prose table { border-collapse: collapse; margin: 12px 0; width: 100%; }
        .content-prose th, .content-prose td { border: 1px solid #444; padding: 6px 10px; vertical-align: top; }
        .content-prose th { background: #44475a; }
        .content-prose code { background: #282a36; padding: 1px 5px; border-radius: 3px; color: #ffb86c; }
        .content-prose { min-width: 0; max-width: 100%; }
        .content-prose pre { background: #282a36; padding: 12px; border-radius: 6px; overflow-x: auto; max-width: 100%; box-sizing: border-box; -webkit-overflow-scrolling: touch; }
        .content-prose pre code { background: transparent; padding: 0; color: #f8f8f2; }
        .content-prose a { color: #8be9fd; }
        .content-prose blockquote { border-left: 3px solid #bd93f9; margin: 12px 0; padding: 4px 14px; color: #ccc; background: rgba(189,147,249,0.08); }
        .content-prose hr { border: none; border-top: 1px solid #333; margin: 20px 0; }
        .content-prose ul, .content-prose ol { padding-left: 24px; }
        @media (max-width: 720px) { .content-prose table { display: block; overflow-x: auto; max-width: 100%; } }
      `}</style>
    </main>
    </>
  );
}

