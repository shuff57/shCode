'use client';

import { type ReactNode, memo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Lesson } from '../lib/types';
import { badgeFor } from '../lib/lesson-badges';
import CompletionPanel from './CompletionPanel';
import { useLessonState } from '../lib/progress';
import WrittenGrader from './WrittenGrader';
import DiagramAssignmentView from './DiagramAssignmentView';
import { taskSections } from '../lib/diagram-task-sections';
import { splitRubric } from '../lib/rubric-split';
import QuizView from './QuizView';
import MarkdownWithLiveBlocksContent from './MarkdownWithLiveBlocks';
import HeaderLessonNav from './HeaderLessonNav';
import { withInlineCode } from './InlineCode';
import TabbedRightDrawer, { type DrawerTab } from './TabbedRightDrawer';
import DocsDrawer from './DocsDrawer';
import { withAlpha } from '../lib/color-alpha';
import { Maximize2 } from 'lucide-react';

// Outline updates must not re-inject markdown HTML and discard heading IDs.
const MarkdownWithLiveBlocks = memo(MarkdownWithLiveBlocksContent);

function LessonPrimary({ wrap, children }: { wrap: boolean; children: ReactNode }) {
  return wrap ? <div className="lesson-primary">{children}</div> : <>{children}</>;
}

// The lesson summary. On a phone (<= 720px) a short one (about five lines at 390px) shows whole;
// a longer one is cut at a word boundary with an ellipsis and an inline "more" at the end.
const SUMMARY_FULL_MAX = 240;
const SUMMARY_CUT_AT = 180;
function cutAtWord(text: string, max: number): string {
  const head = text.slice(0, max);
  const space = head.lastIndexOf(' ');
  return (space > max * 0.6 ? head.slice(0, space) : head).replace(/[\s,;:.—-]+$/, '');
}
function LessonDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const long = phone && text.length > SUMMARY_FULL_MAX;
  // An odd number of backticks before the cut would leave a code span open; cut before it instead.
  let shown = long && !open ? cutAtWord(text, SUMMARY_CUT_AT) : text;
  if ((shown.match(/`/g)?.length ?? 0) % 2 === 1) shown = cutAtWord(shown.slice(0, shown.lastIndexOf('`')), SUMMARY_CUT_AT);
  return (
    <p className={`lesson-description${open ? ' is-open' : ''}`} style={{ color: 'var(--c-meta)', margin: '0 0 4px', fontSize: 14, lineHeight: 1.35 }}>
      {withInlineCode(shown)}
      {long && !open ? '…' : null}
      {long && (
        <button type="button" className="lesson-description-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'less' : 'more'}
        </button>
      )}
    </p>
  );
}

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
  const completionState = useLessonState();
  const mainRef = useRef<HTMLElement | null>(null);
  const [outline, setOutline] = useState<{ id: string; title: string; level: number }[]>([]);
  const preview = lesson.preview as string;
  const badge = badgeFor(preview);
  const contentMd = findContent(lesson);
  const meta = lesson as any;
  // Sans body copy is for reading and worked-example prose only (climb 2 r1, council-narrowed).
  const proseBody = !meta.quiz && !meta.diagram && !meta.aiGrader && preview !== 'video' && preview !== 'slides';
  // A writeup (the WrittenGrader branch below) draws its rubric AFTER the "What to answer"
  // box, not above it in file order. No rubric heading: everything renders as before.
  const rubricSplit = !meta.quiz && !meta.diagram && meta.aiGrader ? splitRubric(contentMd) : null;
  const writtenIntro = rubricSplit?.before.trim().split(/(?<=\.)\s+/);
  const bodyMd = writtenIntro ? writtenIntro.slice(0, 2).join(' ') : contentMd;
  const writtenGuidance = writtenIntro?.slice(2).join(' ') ?? '';
  const readingLayout = !meta.quiz && !meta.diagram;
  const focusedLayout = readingLayout && preview !== 'example';
  const hasOutline = readingLayout && !meta.videoUrl && preview !== 'slides' && outline.length >= 2;
  // "On this page" marks the section being read: the last heading above a line 30% down the window,
  // the first one at the top of the page.
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  useEffect(() => {
    if (!hasOutline) return;
    let raf = 0;
    const pick = () => {
      raf = 0;
      const line = window.innerHeight * 0.3;
      let current = outline[0]?.id ?? null;
      for (const h of outline) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= line) current = h.id;
      }
      setActiveHeading(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(pick); };
    pick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [hasOutline, outline]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    let nextId = 0;
    const syncOutline = () => {
      const headings = main.querySelectorAll<HTMLElement>('.content-prose h2, .content-prose h3');
      const next = Array.from(headings).map((heading) => {
        if (!heading.id) {
          let id: string;
          do { id = `lesson-heading-${nextId++}`; } while (document.getElementById(id));
          heading.id = id;
        }
        return { id: heading.id, title: heading.textContent ?? '', level: Number(heading.tagName.slice(1)) };
      });
      setOutline((previous) => previous.length === next.length && previous.every((heading, index) =>
        heading.id === next[index].id && heading.title === next[index].title && heading.level === next[index].level
      ) ? previous : next);
    };
    // Live blocks can mount or replace prose after the markdown first renders.
    const observer = new MutationObserver(syncOutline);
    observer.observe(main, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['id', 'class'] });
    syncOutline();
    return () => {
      observer.disconnect();
    };
  }, [bodyMd, lesson.id]);

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
  const [deckLoaded, setDeckLoaded] = useState(false);
  const showFrame = !!slidesUrl && deckReady === true;
  const [slidePosition, setSlidePosition] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (!deckLoaded || !showFrame) return;
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return;
    const sync = () => {
      const total = doc.querySelectorAll('section.slide').length;
      if (total) setSlidePosition({ current: Math.max(1, Math.min(total, parseInt(win.location.hash.slice(1), 10) || 1)), total });
    };
    sync();
    win.addEventListener('hashchange', sync);
    const observer = new MutationObserver(sync);
    observer.observe(doc.body, { childList: true, subtree: true });
    return () => { win.removeEventListener('hashchange', sync); observer.disconnect(); };
  }, [deckLoaded, showFrame]);

  const navigateSlide = (key: 'ArrowLeft' | 'ArrowRight') => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;
    frame.focus({ preventScroll: true });
    doc.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  };


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
    setDeckLoaded(false);
  }, [slidesUrl]);


  return (
    <>
      <TabbedRightDrawer
        storageKey="shCode:content-drawer"
        inlineHostId="content-tools-host"
        tabs={[
          {
            key: 'docs',
            label: 'Docs',
            color: 'var(--c-purple)',
            content: <DocsDrawer defaultSetId="js" storageKey="shCode:lesson-docs" />,
          },
        ]}
      />
      <main ref={mainRef} className="content-lesson-main page-frame" style={{ maxWidth: 1080, width: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '18px 20px 24px', color: 'var(--c-fg)' }}>
      <nav style={{ marginBottom: 5, fontSize: 13, color: 'var(--c-meta)' }}>
        <Link href="/" style={{ color: 'var(--c-cyan)' }}>Home</Link>
        {lesson.unit ? (
          <>
            <span style={{ margin: '0 8px' }}>›</span>
            <Link href={`/module/${lesson.unit.split(' ')[0]}`} prefetch={false} style={{ color: 'var(--c-cyan)' }}>
              {lesson.unit}
            </Link>
          </>
        ) : null}
        <span className="lesson-breadcrumb-current" style={{ margin: '0 8px' }}>›</span>
        <span className="lesson-breadcrumb-current">{lesson.title}</span>
      </nav>

      <div className="content-lesson-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 10px', marginBottom: 5 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>{lesson.title}</h1>
        {(preview === "video" || preview === "slides") && <span style={{ color: completionState.states[lesson.id] === "completed" ? "var(--c-green)" : "var(--c-meta)", fontSize: 12 }}>{completionState.states[lesson.id] === "completed" ? "Done ✓" : "Not done yet · Mark complete below"}</span>}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: withAlpha(badge.color, '22'),
            color: badge.color,
            padding: '2px 9px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            border: '1px solid ' + withAlpha(badge.color, '55'),
          }}
        >
          <badge.Icon size={13} strokeWidth={2.25} />
          {badge.label}
        </span>
        <span style={{ color: 'var(--c-meta)', fontSize: 13 }}>~{lesson.estimateMins ?? '?'} min</span>
        {preview === 'slides' && slidesUrl && deckReady === true ? (
          <a href={slidesUrl} target="_blank" rel="noopener noreferrer" className="slides-newtab" style={{ display: 'inline-block', background: 'transparent', color: 'var(--c-cyan)', fontWeight: 600, fontSize: 13, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--c-line)', textDecoration: 'none' }}>
            Open in new tab →
          </a>
        ) : null}
        {/* Desktop: the Docs button sits here, with the lesson's own details (TabbedRightDrawer inlineHostId). */}
        <div id="content-tools-host" className="shd-inline-host" />
      </div>
      <div className={readingLayout ? `lesson-reading-grid${focusedLayout ? ' lesson-focused-grid' : ''}${hasOutline ? ' has-outline' : ''}` : 'lesson-content-flow'}>
      {hasOutline && <aside className="lesson-overview" aria-label="Lesson overview">
        <nav aria-label="On this page">
          <h2>On this page</h2>
          <ul>{outline.map((heading) => <li key={heading.id} className={heading.level === 3 ? 'outline-subheading' : undefined}><a href={`#${heading.id}`} aria-current={activeHeading === heading.id ? 'location' : undefined}>{heading.title}</a></li>)}</ul>
        </nav>
      </aside>}
      <LessonPrimary wrap={focusedLayout}>
      {lesson.description && !meta.quiz ? (
        <LessonDescription text={lesson.description} />
      ) : null}

      {meta.videoUrl && meta.videoUrl.trim() ? (
          <div className="lesson-wide-media lesson-video-frame" style={{ aspectRatio: '16 / 9', width: 'min(100%, 680px)', margin: '16px auto 0', borderRadius: 8, overflow: 'hidden', background: 'var(--x-000000)' }}>
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
        ) : preview === 'video' ? (
          <div style={{ marginTop: 16, padding: 20, background: 'var(--c-bg)', borderRadius: 8, border: '1px dashed var(--x-555555)', color: 'var(--c-meta)' }}>
            <strong style={{ color: 'var(--c-pink)' }}>No video URL set yet.</strong>
            <p style={{ margin: '8px 0 0', fontSize: 14 }}>
              {meta.videoFallback ?? "Teacher will paste a YouTube URL into this lesson's lesson.json (videoUrl field) when ready."}
            </p>
          </div>
        ) : null}

      {preview === 'slides' ? (
        slidesUrl && deckReady === true ? (
          <div className="lesson-wide-media" style={{ marginTop: 4 }}>
            {deckBlank ? (
              <p role="status" style={{ margin: '0 0 8px', color: 'var(--c-yellow)', fontSize: 14 }}>
                Slides blank? Open them in a new tab.
              </p>
            ) : null}
            <div className="lesson-slides-frame" style={{ aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', position: 'relative', background: 'var(--c-bg)', border: '1px solid var(--c-line)' }}>
              <iframe
                ref={frameRef}
                title={`Slides: ${lesson.title}`}
                onLoad={() => { setDeckLoaded(true); checkFrame(false); }}
                src={slidesUrl}
                allow="autoplay; clipboard-write; fullscreen"
                style={{ width: '100%', height: '100%', border: 0, position: 'relative', zIndex: 1, opacity: deckLoaded ? 1 : 0 }}
              />
              {!deckLoaded && <div role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--c-meta)' }}>Loading slides…</div>}
            </div>
            <nav aria-label="Slide navigation" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
              <button className="btn-secondary btn-sm" disabled={!deckLoaded || slidePosition?.current === 1} onClick={() => navigateSlide('ArrowLeft')}>‹ Previous</button>
              <span className="slide-nav-middle">
                <span aria-live="polite" className="slide-count" style={{ color: 'var(--c-meta)', fontSize: 13 }}>{slidePosition ? `Slide ${slidePosition.current} of ${slidePosition.total}` : 'Slides'}</span>
                <button
                  type="button"
                  className="btn-secondary btn-sm slide-fullscreen"
                  disabled={!deckLoaded}
                  onClick={() => { void frameRef.current?.requestFullscreen?.(); }}
                  title="Show the slides on the whole screen (Esc to leave)"
                >
                  <Maximize2 size={13} aria-hidden="true" /> Full screen
                </button>
              </span>
              <button className="btn-secondary btn-sm slide-next" disabled={!deckLoaded || (!!slidePosition && slidePosition.current >= slidePosition.total)} onClick={() => navigateSlide('ArrowRight')}>Next ›</button>
            </nav>
          </div>
        ) : slidesUrl && deckReady === null ? (
          <div style={{ marginTop: 16, padding: 20, background: 'var(--c-bg)', borderRadius: 8, border: '1px solid var(--c-line)', color: 'var(--c-meta)' }}>
            Loading slides…
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: 20, background: 'var(--c-bg)', borderRadius: 8, border: '1px dashed var(--x-555555)', color: 'var(--c-meta)' }}>
            <strong style={{ color: 'var(--c-purple)' }}>These slides aren&apos;t published yet.</strong>
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55 }}>
              Nothing is missing on your end — your teacher hasn&apos;t built this deck yet. Everything
              you need for this unit is in the lessons that follow, so mark this complete and carry on.
            </p>
          </div>
        )
      ) : null}

      {meta.externalLink ? (
        <p className="lesson-book-link" style={{ margin: '16px 0' }}>
          <a href={meta.externalLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-meta)', textDecoration: 'underline', fontSize: 14 }}>
            📖 {meta.externalLinkLabel ?? meta.externalLink}
          </a>
        </p>
      ) : null}

      {bodyMd ? (
        <div className={['lesson-reading-body', proseBody ? 'prose-copy' : '', lesson.type === 'example' ? 'compact-example' : '', preview === 'example' ? 'worked-example' : ''].filter(Boolean).join(' ') || undefined} style={{ marginTop: 12 }}>
          {meta.quiz ? <details className="quiz-intro"><summary style={{ cursor: 'pointer', color: 'var(--c-meta)', fontSize: 13 }}>Review lesson instructions</summary><MarkdownWithLiveBlocks src={bodyMd} lessonId={lesson.id} /></details> : <MarkdownWithLiveBlocks src={bodyMd} lessonId={lesson.id} />}
        </div>
      ) : null}

      </LessonPrimary>
      </div>

      {meta.quiz ? (
        <QuizView lessonId={lesson.id} config={meta.quiz} />
      ) : meta.diagram ? (
        <DiagramAssignmentView
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          config={meta.diagram}
          fallbackPrompt={contentMd.slice(0, 2000)}
          unit={lesson.unit}
          taskMd={contentMd ? taskSections(contentMd) : undefined}
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
          afterPrompt={rubricSplit ? <MarkdownWithLiveBlocks src={[writtenGuidance, rubricSplit.rubric].filter(Boolean).join('\n\n')} lessonId={lesson.id} /> : undefined}
        />
      ) : (
        <CompletionPanel lessonId={lesson.id} lessonType={preview} />
      )}

      {/* Hidden by CSS (.lesson-bottom-nav, globals.css "climb4 r5 student") once the completion panel,
          the written grader or the diagram shows its own Next; kept whenever there is none (quiz, not yet done). */}
      <div className="lesson-bottom-nav" style={{ marginTop: 24 }}>
        <HeaderLessonNav />
      </div>

      <style>{`
        .compact-example .content-prose em { font-style: normal; font-size: 12px; color: var(--c-dim); }
        .compact-example .content-prose p { margin: 8px 0; }
        .compact-example .content-prose h2 { font-size: 22px; font-weight: 700; line-height: 1.3; margin-top: 14px; margin-bottom: 8px; font-size: 19px; }
        .content-prose h1 { font-size: 1.4em; margin-top: 28px; }
        .content-prose h2 { font-size: 22px; font-weight: 700; line-height: 1.3; margin-top: 24px; color: var(--c-fg); border-bottom: 1px solid var(--x-333333); padding-bottom: 4px; }
        .content-prose h3 { font-size: 18px; font-weight: 700; line-height: 1.35; margin-top: 18px; color: var(--c-purple); }
        .content-prose table { border-collapse: collapse; margin: 12px 0; width: 100%; }
        .content-prose th, .content-prose td { border: 1px solid var(--x-444444); padding: 6px 10px; vertical-align: top; }
        .content-prose th { background: var(--c-line); }
        .content-prose code { background: var(--c-bg); padding: 1px 5px; border-radius: 3px; color: var(--c-orange); }
        .content-prose { min-width: 0; max-width: 72ch; line-height: 1.75; }
        .prose-copy .content-prose { line-height: 1.6; }
        .content-prose p { margin: 0 0 1.25em; }
        .content-prose li { margin: 0.6em 0; }
        .content-prose pre { background: var(--c-bg); padding: 12px; border-radius: 6px; overflow-x: auto; max-width: 100%; box-sizing: border-box; -webkit-overflow-scrolling: touch; }
        .content-prose pre code { background: transparent; padding: 0; color: var(--c-fg); }
        .content-prose a { color: var(--c-cyan); }
        .content-prose blockquote { border-left: 3px solid var(--c-purple); margin: 12px 0; padding: 4px 14px; color: var(--x-cccccc); background: color-mix(in srgb, var(--c-purple) 8.0%, transparent); }
        .content-prose hr { border: none; border-top: 1px solid var(--x-333333); margin: 20px 0; }
        .content-prose ul, .content-prose ol { padding-left: 24px; }
        @media (max-width: 720px) { .content-prose table { display: block; overflow-x: auto; max-width: 100%; } }
      `}</style>
    </main>
    </>
  );
}

