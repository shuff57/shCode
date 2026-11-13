'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, CircleX, Circle, Loader2, Lightbulb, Sparkles, Save } from 'lucide-react';
import { bypassesLessonLock, recordLessonCompleted, useLessonState } from '../lib/progress';
import { isPassingGrade, criteriaScore } from '../lib/grade-pass';
import { NextLessonButton } from './LessonOutcome';
import { ranWhen, writtenAnswerStatus } from '../lib/outcome-words';
import LessonNumberLinks, { useSourceHrefs } from './LessonNumberLinks';
import {
  recordSubmission,
  fetchSubmissions,
  streamGrade,
  type SubmissionRecord,
} from '../lib/written-grader-store';
import { countAttempts } from '../lib/attempt-cap';
import { GRADE_STAGE_LABELS, type GradeStage } from '../lib/grade-written-core';
import { classifyGradeFailure, gradeFailureMessage } from '../lib/grade-error';
import GraderPicker, { hasGraderChoice, useGraderChoice } from './GraderPicker';
import SolutionPanel from './SolutionPanel';
import GradeQuotaNote from './GradeQuotaNote';
import { AttemptBanner, PseudocodePanel } from './AttemptCap';
import { useRepairLoop } from '../lib/use-attempt-cap';
import CodeMirrorPane from './CodeMirrorPane';
import dynamic from 'next/dynamic';
import { withAlpha } from '../lib/color-alpha';
import { loadWrittenRecord, saveWrittenRecord, type WrittenRecord } from '../lib/work-records';
import { arriveText, askDraft, handInText, noteTextSaved, saveTextNow, textToken } from '../lib/draft-sync';
import DraftVersions from './DraftVersions';
import { UploadChip, useUploadStatus } from './UploadStatus';
import { OWNER_MISMATCH_HANDIN_TEXT } from '../lib/owner-fetch';

// The editor engine is a few hundred kB; only the parts that set `formatting` download it.
const RichAnswerEditor = dynamic(() => import('./RichAnswerEditor'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 260, background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 8 }} />,
});

interface AiRubricItem {
  id: string;
  title: string;
  description?: string;
  points: number;
}

interface AiGraderConfig {
  /** Test mode -- one submission, no rubric feedback. See lib/types.ts. */
  summative?: boolean;
  /** With `summative`: the student may revise after feedback. See lib/types.ts. */
  revisable?: boolean;
  /** Graded attempts allowed. See lib/types.ts and lib/attempt-cap.ts. */
  maxSubmissions?: number;
  /** 'code' draws the JavaScript editor in place of the prose textarea. See lib/types.ts. */
  input?: 'text' | 'code';
  /** Markdown toolbar, Preview and text size on the prose textarea. See lib/types.ts. */
  formatting?: boolean;
  rubricTitle?: string;
  model?: string;
  contextDocs?: string[];
  rubric: AiRubricItem[];
  promptSummary?: string;  // short reminder of what the student was asked
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  prompt: string;
  config: AiGraderConfig;
  /** Drawn right after the "What to answer" box: a writeup's rubric (ContentLessonView,
   *  lib/rubric-split.ts), so the questions come before how they are checked. */
  afterPrompt?: ReactNode;
}

interface CriterionResult {
  id: string;
  earned: number;
  max: number;
  verdict: 'met' | 'partial' | 'missing';
  feedback: string;
}

interface GradeResult {
  ok: true;
  totalEarned: number;
  totalPossible: number;
  criteria: CriterionResult[];
  summary: string;
  hints: string[];
}

/** The best of a student's graded tries (a rubric row with criteria), for showing what they earned. */
function bestGradedTry(records: SubmissionRecord[]): GradeResult | null {
  let best: GradeResult | null = null;
  let bestScore = -1;
  for (const r of records) {
    const g = r.gradeJson as Partial<GradeResult> | null;
    if (!g || typeof g !== 'object' || !Array.isArray(g.criteria) || g.criteria.length === 0) continue;
    if ((g as { gradingFailed?: unknown }).gradingFailed === true) continue;
    const s = typeof g.totalPossible === 'number' && g.totalPossible > 0 ? Number(g.totalEarned ?? 0) : criteriaScore(g.criteria);
    // records are oldest-first, so >= keeps the LATEST of equal tries
    if (s >= bestScore) { best = g as GradeResult; bestScore = s; }
  }
  return best;
}

// This browser's copy lives under the page's owner (`w1:<owner>:written:<lessonId>`,
// lib/work-records.ts). The older unprefixed keys are set aside by lib/owned-storage.ts.
type StoredState = WrittenRecord<GradeResult>;
const loadState = (lessonId: string): StoredState => loadWrittenRecord<GradeResult>(lessonId);
function saveState(lessonId: string, state: StoredState) {
  saveWrittenRecord<GradeResult>(lessonId, state);
}

// totalPossible === 0 ⇒ pass/fail rubric (all rubric points are 0). Pass when
// a majority of criteria are met-or-partial — loose threshold for very new
// students. Otherwise fall back to the points-based 70% threshold.
//
// Lives in lib/grade-pass so the teacher side asks the same question the
// student was answered with. It used to be local to this file, and the
// consequence was that a failing submission wrote no lesson_state row while
// every teacher-side "who is struggling" check compared points that these
// rubrics never award — so nobody's failure was visible to anyone.
const isPassing = isPassingGrade;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function WrittenGrader({ lessonId, lessonTitle, prompt, config, afterPrompt }: Props) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  // What the grader is currently doing. Null while idle, or when a deploy
  // answers without the stream (the reader falls back to plain JSON) -- in
  // which case the button reverts to its old wording rather than lying about
  // a stage nobody reported.
  const [stage, setStage] = useState<GradeStage | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  // The answer text `result` graded (ux2 S4). Null when unknown (an older saved result).
  const [resultFor, setResultFor] = useState<string | null>(null);
  // The text the last "Save draft" stored, so "Draft saved" is only shown while it is still true.
  const [savedText, setSavedText] = useState<string | null>(null);
  // The result on screen was rebuilt from the server's best try (a return visit, another device),
  // not just graded, so the page says whose it is.
  const [resultIsBest, setResultIsBest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  // ux1 B3: "Draft saved 3:04 PM" stays beside the button (it used to flash "Saved ✓" for under a
  // second), and a grade that just arrived is announced beside Submit and scrolled into view.
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [gradedAt, setGradedAt] = useState<number | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (!savedAt && !gradedAt) return;
    const t = setInterval(() => setClock(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [savedAt, gradedAt]);
  useEffect(() => {
    if (!gradedAt) return;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`written-feedback-${lessonId}`);
      if (!el) return;
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [gradedAt, lessonId]);
  // The questions name the lessons to reread ("1.1.17"). The same linkifier the
  // coding criteria use, so both surfaces behave identically.
  const sourceHrefs = useSourceHrefs([prompt]);

  const progress = useLessonState();
  // Which grader marks this. Remembered per browser; see useGraderChoice.
  const { graders, grader, setGrader } = useGraderChoice();
  // The model the server will really use (Workers AI's), not the lesson file's legacy Ollama id.
  const totalPossible = config.rubric.reduce((s, r) => s + r.points, 0);
  // A test, not a practice assignment: see AiGraderConfig.summative.
  const summative = !!config.summative;
  // A revisable test is a practice assignment as far as the screen goes: no lock,
  // feedback drawn, resubmit as often as wanted. `summative` itself stays true --
  // it is what keeps the brief out of the page and completes the lesson on
  // sitting -- so only the one-shot behaviours key off this.
  const oneShot = summative && !config.revisable;
  // Attempts allowed, or null for unlimited. Only summative items set it.
  // A teacher or admin previewing the part is never refused by the server (effectiveCap), so for
  // them there is no cap to count down.
  const maxSubmissions =
    typeof config.maxSubmissions === 'number' && !bypassesLessonLock(progress.role) ? config.maxSubmissions : null;
  // The JavaScript editor in place of the prose textarea. Presentation only.
  const codeInput = config.input === 'code';
  // A word-processor style editor for the prose answer (config.formatting). It hands back plain
  // Markdown, so the grader and the draft store still deal in text.
  const formatting = config.formatting === true && !codeInput;
  const [textSize, setTextSize] = useState(15);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem('shcode:writtenTextSize'));
      if (v >= 12 && v <= 22) setTextSize(v);
    } catch { /* storage can be blocked; the default size is fine */ }
  }, []);
  const changeSize = (delta: number) => {
    const next = Math.min(22, Math.max(12, textSize + delta));
    setTextSize(next);
    try { localStorage.setItem('shcode:writtenTextSize', String(next)); } catch { /* ignore */ }
  };
  // Submitted-before is answered by the SERVER, not by this browser. Seeding it
  // from the localStorage cache alone -- which is all this did until 2026-09-02
  // -- meant clearing site data, switching browser, or picking up a second
  // device handed the student a fresh unlocked Submit on a one-shot assessment.
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  // `null` means UNKNOWN, not zero: the request failed, so there is no honest
  // count. A capped item refuses Submit while that is unknown rather than
  // assuming the student has attempts left -- the same mistake a6006dd5 fixed,
  // one level down. It costs a reload to recover, and the copy below says so.
  const [attempts, setAttempts] = useState<number | null>(null);
  // Any row at all (counted or the server's free outage marker): what a completion repair keys on.
  const [anyRow, setAnyRow] = useState(false);
  const attemptsKnown = attempts !== null;
  const capReached = maxSubmissions !== null && attemptsKnown && attempts >= maxSubmissions;
  const capUnknown = maxSubmissions !== null && !attemptsKnown;
  // The grade arrived but the completion call did not (or a grader outage left the next
  // part locked): repair it, as the other capped renderers do.
  useRepairLoop(
    lessonId,
    maxSubmissions !== null && attemptsKnown && anyRow && progress.authed && progress.states[lessonId] !== 'completed',
  );
  const locked = capUnknown || capReached || (oneShot && (!!result || alreadySubmitted));
  // Submit needs a real answer (20 characters); below that the button stays disabled with a hint beside it.
  const tooShort = response.trim().length < 20;
  // Whether the result on screen is for the text in the box, and whether "Draft saved" is still true (ux2 S4).
  const status = writtenAnswerStatus({ response, resultFor: result ? resultFor : null, savedText: savedAt ? savedText : null });
  // Where the answer is: on this computer, uploading, uploaded (lib/outbox.ts).
  const upload = useUploadStatus(lessonId, progress.authed, 'written');

  useEffect(() => {
    // Local cache is the always-available fallback; server draft is canonical
    // when signed in. Prefer server if it's newer (or exists at all).
    let cancelled = false;
    const local = loadState(lessonId);
    const token = textToken('written', lessonId);
    (async () => {
      const [serverDraft, prior] = await Promise.all([
        progress.authed ? askDraft(lessonId) : Promise.resolve(null),
        // Signed in, the server's hand-ins are read on every visit: they are the only source of a
        // result shown on return (below), as well as the one-shot lock and the try count.
        progress.authed
          ? fetchSubmissions(lessonId)
          : Promise.resolve({ records: [], loaded: true }),
      ]);
      if (cancelled) return;
      if (prior.records.length > 0) setAlreadySubmitted(true);
      // Signed out there are no server rows to count and none to be had, which is
      // an honest zero rather than an unknown.
      if (oneShot || maxSubmissions !== null) {
        setAttempts(prior.loaded ? countAttempts(prior.records) : null);
        setAnyRow(prior.loaded && prior.records.length > 0);
      }
      // Which text opens (lib/draft-sync-core.ts textArrival): the account's unless this computer
      // has changes the account does not. Changed on both: this computer's opens and the student
      // chooses (DraftVersions). Could not ask the account: this computer's, nothing recorded.
      const arrived = serverDraft ? arriveText('written', lessonId, serverDraft, undefined, token) : null;
      if (arrived && arrived.use === 'server' && serverDraft && serverDraft.ok && serverDraft.row) {
        setResponse(serverDraft.row.text);
      } else {
        // Read again NOW: when this effect runs a second time (sign-in state settling) the student
        // may have typed while the account was being asked, and the copy read before the request
        // would put the older text back over it.
        setResponse(loadState(lessonId).response);
      }
      // A result on return comes ONLY from the server's graded hand-ins for the signed-in account,
      // never from this browser's saved copy: on a shared computer that copy may be another
      // student's, and "Result: passed" would claim work this student never handed in.
      // On a capped part, once every try is spent the best try is the part's grade; before that,
      // the latest try. Elsewhere the latest graded try.
      const graded = prior.records.filter((r) => {
        const g = r.gradeJson as { criteria?: unknown; gradingFailed?: unknown } | null;
        return !!g && typeof g === 'object' && Array.isArray(g.criteria) && g.gradingFailed !== true;
      });
      const latest = graded.length ? graded[graded.length - 1] : null;
      if (maxSubmissions !== null && prior.loaded) {
        const best = bestGradedTry(prior.records);
        const spent = countAttempts(prior.records) >= maxSubmissions;
        if (best && spent) {
          setResult(best);
          setResultIsBest(true);
          const bestRow = prior.records.find((r) => r.gradeJson === (best as unknown));
          setResultFor(bestRow ? bestRow.response : null);
        } else if (latest) {
          setResult(latest.gradeJson as GradeResult);
          setResultFor(latest.response);
        }
      } else if (latest && !oneShot) {
        setResult(latest.gradeJson as GradeResult);
        setResultFor(latest.response);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, progress.authed, oneShot, maxSubmissions]);

  useEffect(() => {
    if (!loaded) return;
    saveState(lessonId, { response, lastResult: result ?? undefined, lastSubmittedAt: Date.now() });
    // Text the account does not have yet uploads by itself (lib/draft-sync.ts); never a hand-in.
    if (progress.authed) noteTextSaved('written', lessonId);
  }, [response, result, lessonId, loaded, progress.authed]);

  async function saveNow() {
    setSaveStatus('saving');
    // The same guarded send as an upload by itself: it never overwrites another computer's newer text.
    const how = progress.authed ? await saveTextNow('written', lessonId) : 'error';
    const ok = how === 'saved';
    // Two versions: the note above the box asks; this button did not fail.
    setSaveStatus(ok ? 'saved' : how === 'two-versions' ? 'idle' : 'error');
    if (ok) { setSavedAt(Date.now()); setSavedText(response); setClock(Date.now()); }
    setTimeout(() => setSaveStatus('idle'), 2000);
  }

  // When grading fails, the answer still has to reach the server. Before this,
  // recordSubmission() only ran inside the success branch, so an Ollama outage
  // left the student's work in localStorage and nowhere else — invisible to the
  // teacher, and gone if they opened the lesson on another machine.
  //
  // The row is written with score/possible NULL and a gradingFailed marker in
  // grade_json. The marker (rather than a NULL grade_json) is deliberate: the
  // teacher queue already selects `WHERE grade_json IS NOT NULL`, so these rows
  // show up there with no query change, while staying distinguishable from a
  // real grade and from the lab submissions that also live in this table.
  const lastFailedRef = useRef<string | null>(null);

  async function recordFailedAttempt(reason: string, httpStatus: number) {
    if (!progress.authed) return;
    // On a CAPPED part the server writes the marker itself, when the grader really
    // failed (functions/_shared/attempts.ts recordOutage): a marker the browser can
    // post is a free row a student can send at will, so the route refuses it. The
    // draft is still saved here, and the work is already in front of the teacher.
    // A network drop (no reply at all) writes nothing anywhere: the student retries.
    if (maxSubmissions !== null) {
      await handInText('written', lessonId, response);
      // Still unlock the next part after a grader outage (it is ours, not the
      // student's). The server only completes a capped part once a row exists, and
      // the marker it wrote is that row; with no reply at all there is none, the
      // POST is refused and the student simply tries again.
      if (progress.states[lessonId] !== 'completed') await recordLessonCompleted(lessonId);
      return;
    }
    // A student who hits Submit four times against a dead grader should not
    // land four identical rows in the teacher's queue. Same text = one row.
    if (lastFailedRef.current === response) return;
    const [recorded] = await Promise.all([
      recordSubmission({
        lessonId,
        response,
        gradeJson: {
          gradingFailed: true,
          error: reason,
          httpStatus,
          attemptedAt: Date.now(),
        },
      }),
      handInText('written', lessonId, response),
    ]);
    // Only suppress the retry once the row is actually on the server. Marking
    // it before the POST would mean a student whose network dropped never got
    // a second chance to record the attempt.
    if (recorded) lastFailedRef.current = response;

    // Unlock the next lesson. Green-to-advance gates on lesson_state, and a
    // failed grade wrote no row at all, so an Ollama outage used to stop a
    // whole class dead behind a locked door for a failure that is ours, not
    // theirs. The row goes in with NO score: the student may proceed, but
    // nothing has been graded and nothing counts as earned until the teacher
    // marks it from the review queue.
    //
    // Skipped when the lesson is already completed. The lesson_state upsert
    // does `score = excluded.score`, so writing a scoreless row over a student
    // who had already passed would erase the score they earned.
    if (recorded && progress.states[lessonId] !== 'completed') {
      await recordLessonCompleted(lessonId);
    }
  }

  // Re-read how many tries the SERVER holds. A stream that drops mid-grade, a refused request or a
  // grader outage can leave the server with a row (or without one) that this page did not see, so
  // the banner would say one try too many or too few. The server is always right; this re-reads it.
  async function refreshAttempts() {
    if (maxSubmissions === null) return;
    const prior = await fetchSubmissions(lessonId);
    if (!prior.loaded) return;
    setAttempts(countAttempts(prior.records));
    setAnyRow(prior.records.length > 0);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setOffline(false);
    try {
      const { status, data, network } = await streamGrade(
        {
          lessonId,
          lessonTitle,
          prompt,
          response,
          rubric: config.rubric,
          model: config.model,
          contextDocs: config.contextDocs,
          grader,
        },
        setStage,
      );
      const res = { status };
      if (data === null) {
        // Raw status stays in the console and in the row the teacher sees; the
        // student gets plain words (lib/grade-error.ts).
        const reason = network
          ? 'Network error: the grader could not be reached.'
          : `Grader returned a non-JSON response (HTTP ${res.status}).`;
        console.warn('[grader]', reason);
        setError(gradeFailureMessage({
          kind: classifyGradeFailure(res.status, null, network),
          status: res.status,
          keepsTries: maxSubmissions !== null,
        }));
        await recordFailedAttempt(reason, res.status);
        await refreshAttempts();
        return;
      }
      if (status === 409 && (data as { error?: string } | null)?.error === 'owner-mismatch') {
        // Someone else signed in on this computer after this page opened. Nothing was
        // handed in (functions/_middleware.ts); not a grader failure, so not recorded.
        setError(OWNER_MISMATCH_HANDIN_TEXT);
        return;
      }
      if (data && !data.ok && (data as { capReached?: boolean }).capReached === true) {
        // Every try is spent (a second tab, a stale page). That is the server
        // doing its job, not a grader outage: NOT written as a failed attempt, which
        // would put an unmarked fourth answer in front of the teacher.
        if (maxSubmissions !== null) setAttempts(maxSubmissions);
        setError(data.error || 'All your tries on this part are already used.');
        return;
      }
      if (!data || !data.ok) {
        // `detail` is the server's staff-only reason (may name the vendor): logged and
        // sent to the teacher side, never shown.
        const reason = (data as { detail?: string } | null)?.detail || data?.error || `Grading failed (HTTP ${res.status}).`;
        console.warn('[grader]', res.status, reason);
        setError(gradeFailureMessage({
          kind: classifyGradeFailure(res.status, data),
          status: res.status,
          serverMessage: data?.error,
          keepsTries: maxSubmissions !== null,
        }));
        if (data?.offline) setOffline(true);
        await recordFailedAttempt(reason, res.status);
        await refreshAttempts();
        return;
      }
      // A successful grade supersedes any failed attempt for this text.
      lastFailedRef.current = null;
      setResult(data as GradeResult);
      setResultFor(response);
      // The answer is handed in now: a "Draft saved" beside the result would say the opposite.
      setSavedAt(null);
      setResultIsBest(false);
      setGradedAt(Date.now());
      setClock(Date.now());
      // One attempt just spent. Unknown stays unknown -- we know this one happened,
      // not how many came before, and inventing a count would unlock a capped item.
      setAttempts((n) => (n === null ? null : n + 1));
      setAnyRow(true);
      lastFailedRef.current = null;
      setResult(data as GradeResult);
      const passed = isPassing(data as GradeResult);
      // On a test, sitting it is what unlocks the next part. Gating on the
      // grade would lock a student out of the rest of their own exam over an
      // answer the teacher has not even seen yet.
      if (summative || passed) {
        // BEST attempt, not last. The lesson_state upsert is `score =
        // excluded.score`, so writing this draft's mark over a better one would
        // erase it. Passing the running maximum keeps the row right whichever way
        // this draft went, and needs no extra server round trip to do it.
        // A pass/fail rubric's totalEarned is always 0, so its score is the criteria met (1 each,
        // partial half), out of the rubric's length: the same number the manifest's maxScore
        // divides by (lib/grade-pass.ts criteriaScore).
        const earned = data.totalPossible === 0 ? criteriaScore(data.criteria) : data.totalEarned;
        const prior = progress.scores[lessonId];
        const best = typeof prior === 'number' ? Math.max(prior, earned) : earned;
        await recordLessonCompleted(lessonId, best);
      }
      if (progress.authed) {
        // Persist the submission + sync the draft so a resume shows the
        // text that was graded. Fire-and-forget — local cache already has it.
        recordSubmission({
          lessonId,
          response,
          gradeJson: data,
          score: data.totalEarned,
          possible: data.totalPossible,
        });
        void handInText('written', lessonId, response);
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      console.warn('[grader]', reason);
      setError(gradeFailureMessage({ kind: 'network', keepsTries: maxSubmissions !== null }));
      // Best effort — if the network is genuinely down this fails too, and
      // recordFailedAttempt leaves the retry guard clear so the next submit
      // tries again.
      await recordFailedAttempt(reason, 0);
      await refreshAttempts();
    } finally {
      setLoading(false);
      setStage(null);
    }
  }

  if (!loaded) return null;

  return (
    <section className="written-grader" style={{ marginTop: 16, paddingTop: 14, borderTop: '2px solid var(--c-line)' }}>
      {/* The answer (label, box, Submit) and the help under it are two blocks so a wide screen can set
          them side by side (globals.css r7 S7b); a narrow one stacks them as before. */}
      <div className="written-answer">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-fg)' }}>{codeInput ? 'Your program (JavaScript)' : 'Your response'}</label>
        <SolutionPanel
          lessonId={lessonId}
          onInsert={(files) => {
            const text = files['answer.md'] ?? Object.values(files)[0] ?? '';
            setResponse(text);
          }}
        />
      </div>
      <AttemptBanner max={maxSubmissions} used={attempts} loading={!loaded} />
      <DraftVersions kind="written" lessonId={lessonId} noun="answer" enabled={progress.authed && !locked} current={response} onUse={setResponse} />
      {codeInput ? (
        // CodeMirrorPane fills its parent (height: 100%), so the parent needs a
        // height of its own. No Run button, lint or autocomplete, on purpose:
        // reading the program through is the skill this paper marks.
        <div
          role="group"
          aria-label="Your program (JavaScript)"
          style={{ height: 420, background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden' }}
        >
          <CodeMirrorPane value={response} onChange={setResponse} fileKey={lessonId} language="javascript" />
        </div>
      ) : (
        formatting ? (
          <>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 6 }}>
              <button type="button" title="Smaller text" aria-label="Smaller text" onClick={() => changeSize(-1)} disabled={textSize <= 12} style={{ padding: '2px 10px', borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-bg)', color: 'var(--c-fg)', fontSize: 12, fontWeight: 600, opacity: textSize <= 12 ? 0.5 : 1 }}>A−</button>
              <button type="button" title="Larger text" aria-label="Larger text" onClick={() => changeSize(1)} disabled={textSize >= 22} style={{ padding: '2px 10px', borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-bg)', color: 'var(--c-fg)', fontSize: 16, fontWeight: 600, opacity: textSize >= 22 ? 0.5 : 1 }}>A+</button>
            </div>
            <RichAnswerEditor
              value={response}
              onChange={setResponse}
              textSize={textSize}
              placeholder="Write your response here. Use the toolbar for headings, lists and tables."
            />
          </>
        ) : (
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Tab') return;
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const next = response.slice(0, start) + '  ' + response.slice(end);
            setResponse(next);
            requestAnimationFrame(() => {
              el.selectionStart = el.selectionEnd = start + 2;
            });
          }}
          placeholder="Write your response here. Full sentences preferred."
          rows={7}
          className="written-response-input"
          style={{
            width: '100%',
            maxWidth: 760,
            boxSizing: 'border-box',
            display: 'block',
            background: 'var(--c-deep2)',
            color: 'var(--c-fg)',
            border: '1px solid var(--c-comment)',
            borderRadius: 6,
            padding: 12,
            fontSize: formatting ? textSize : 15,
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />
        )
      )}

      <div className="written-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <button
          className="written-submit"
          onClick={submit}
          disabled={loading || locked || tooShort}
          aria-describedby={tooShort && !locked && !loading ? `written-hint-${lessonId}` : undefined}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            fontWeight: 600,
            cursor: loading ? 'wait' : tooShort ? 'not-allowed' : 'pointer',
            // Disabled reads as disabled (flat grey fill, not-allowed cursor) but its label stays
            // readable: meta on the line colour is above 4.5:1. The reason sits beside it as a hint.
            background: loading || locked || tooShort ? 'var(--c-line)' : 'var(--c-purple)',
            color: tooShort || locked ? 'var(--c-meta)' : loading ? 'var(--c-fg)' : 'var(--c-bg)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading
            ? // A reported stage always wins: it is what the server actually
              // did, where 'Grading…' is only what we assumed. Falls back to
              // the old wording when no stage arrived.
              stage
              ? `${GRADE_STAGE_LABELS[stage]}…`
              : oneShot
                ? 'Submitting…'
                : 'Grading…'
            : oneShot
              ? locked
                ? 'Submitted'
                : 'Submit my answer'
              : capReached
                ? 'No tries left'
                : maxSubmissions !== null && attemptsKnown
                ? `Grade (${Math.max(0, maxSubmissions - attempts)} left)`
                : typeof config.maxSubmissions === 'number'
                ? 'Grade'
                : result && status.resultStale
                ? 'Submit this answer'
                : result
                ? (isPassing(result) ? 'Submit again (optional)' : 'Submit again')
                : 'Submit'}
        </button>
        <button
          onClick={saveNow}
          disabled={!progress.authed || saveStatus === 'saving' || response.trim().length === 0}
          title={progress.authed ? 'Save your draft without submitting' : 'Sign in to save drafts'}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: '1px solid var(--c-line)',
            fontWeight: 600,
            cursor: !progress.authed || response.trim().length === 0 ? 'not-allowed' : saveStatus === 'saving' ? 'wait' : 'pointer',
            background: 'transparent',
            // Nothing to save yet reads as unavailable (meta text), not as a live button.
            color: !progress.authed ? 'var(--c-comment)' : response.trim().length === 0 ? 'var(--c-meta)' : 'var(--c-fg)',
            opacity: !progress.authed ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
          }}
        >
          {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Save failed' : 'Save draft'}
        </button>
        {/* What Submit and Save draft did, beside them and still there afterwards (ux1 B3). */}
        <span className="written-outcome" role="status" aria-live="polite">
          {loading ? (
            <span className="written-outcome-busy">{stage ? `${GRADE_STAGE_LABELS[stage]}…` : 'Grading…'} Your feedback will show below.</span>
          ) : result && !oneShot ? (
            <a className={`written-outcome-result${isPassing(result) ? ' is-pass' : ' is-fail'}${status.resultStale ? ' is-stale' : ''}`} href={`#written-feedback-${lessonId}`}>
              {status.resultStale
                ? `Your earlier answer ${isPassing(result) ? 'passed' : 'needs more work'}. This one is not graded yet.`
                : <>{isPassing(result) ? 'Result: passed' : 'Result: needs more work'}{gradedAt ? ` · graded ${ranWhen(gradedAt, clock)}` : ''}</>}
              {' '}· See feedback <span aria-hidden="true">↓</span>
            </a>
          ) : null}
          {savedAt && !loading && status.showDraftSaved ? <span className="written-outcome-saved">Draft saved {ranWhen(savedAt, clock)}</span> : null}
          {!loading && !(savedAt && status.showDraftSaved) && upload.state !== 'conflict' ? <UploadChip status={upload} what="answer" style={{ maxWidth: 260 }} /> : null}
        </span>
        {tooShort && !locked && !loading && (
          <span id={`written-hint-${lessonId}`} className="written-submit-hint">
            {response.trim().length === 0 ? 'Write something to submit' : 'Write a little more to submit'}
          </span>
        )}
        <span className="written-count" style={{ color: 'var(--c-meta)', fontSize: 13 }}>
          {response.trim().length} chars{codeInput ? '' : ` · ${response.trim().split(/\s+/).filter(Boolean).length} words`}
        </span>
        {maxSubmissions === null ? null : !attemptsKnown ? (
          <span style={{ color: 'var(--c-orange)', fontSize: 12 }}>
            {loaded ? 'Couldn\u2019t check your attempts — reload to try again' : 'Checking your attempts…'}
          </span>
        ) : (
          <span style={{ color: capReached ? 'var(--c-orange)' : 'var(--c-meta)', fontSize: 12 }}>
            {capReached
              ? 'No attempts left — your best one counts'
              : `${maxSubmissions - attempts} of ${maxSubmissions} attempts left`}
          </span>
        )}
        {/* Quiet one-line meta note after the controls it counts; the detail is in its tooltip. */}
        <div className="written-quota-note">
          <GradeQuotaNote />
        </div>
      </div>
      </div>

      <div className="written-help">
      {prompt.trim() ? <details style={{ marginBottom: 10, border: '1px solid var(--c-line)', borderRadius: 6, padding: '8px 12px' }}>
        <summary style={{ cursor: 'pointer', color: 'var(--c-purple)', fontSize: 13 }}>What to answer · task guidance</summary>
              <h2 style={{ fontSize: 18, marginBottom: 6, color: 'var(--c-fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={18} color="var(--c-purple)" />
        {config.rubricTitle ?? 'Written response — AI-graded'}
      </h2>
      <p style={{ color: 'var(--c-meta)', fontSize: 13, margin: '0 0 12px' }}>
        {codeInput
          ? 'Write your answer as JavaScript. There is no Run button, so read it through the way the computer would before you submit.'
          : 'Answer in your own everyday words — you are graded on having the right idea, not on exact wording, spelling or length. The AI grader checks each criterion and points you back at the lesson to reread if something is missing.' +
            (maxSubmissions === null
              ? ' You can revise and resubmit as many times as you want.'
              : ` You get ${maxSubmissions} tries: revise and resubmit, and your best one counts.`)}
      </p>

<div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, paddingTop: 10 }}><LessonNumberLinks text={prompt.trim()} hrefs={sourceHrefs} /></div>
      </details> : null}

      {afterPrompt ? <details
        className="written-graded-details"
        // Wide screens open "See how this is graded" at first: it is what a student needs before writing (climb4 r10 S8).
        ref={(el) => { if (el && !el.dataset.autoOpened) { el.dataset.autoOpened = '1'; if (window.matchMedia('(min-width: 1000px)').matches) el.open = true; } }}
        style={{ margin: '0 0 16px', padding: '10px 14px', border: '1px solid var(--c-line)', borderRadius: 6 }}><summary style={{ cursor: 'pointer', color: 'var(--c-purple)', fontSize: 14 }}>See how this is graded</summary>{afterPrompt}</details> : null}
      </div>

      {/* Its own row rather than squeezed in beside Submit: on a narrow screen
          the label, menu and description wrap, and wrapping them through the
          buttons puts the dropdown under "Save draft" where it reads as part
          of it. Renders nothing when this deploy has only one grader. */}
      <div style={{ marginTop: 10 }}>
        <GraderPicker
          graders={graders}
          value={grader}
          onChange={setGrader}
          disabled={loading || locked}
        />
      </div>

      <PseudocodePanel lessonId={lessonId} show={capReached} />

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: offline ? 'var(--c-bg)' : 'var(--x-4a2a2a)',
            border: '1px solid ' + (offline ? 'var(--c-comment)' : 'var(--c-red)'),
            borderRadius: 6,
            color: offline ? 'var(--x-aaaaaa)' : 'var(--x-ffd6d6)',
            fontSize: 13,
          }}
        >
          <strong style={{ color: offline ? 'var(--c-purple)' : 'var(--c-red)' }}>
            {offline ? 'AI grader offline' : 'Error'}
          </strong>
          <p style={{ margin: '4px 0 0' }}>{error}</p>
        </div>
      )}

      {(result || alreadySubmitted) && oneShot ? (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            background: 'var(--c-bg)',
            border: '1px solid var(--c-green)',
            borderRadius: 6,
            color: 'var(--c-fg)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--c-green)' }}>Submitted.</strong> Your answer is with your
          teacher. Nothing is marked here and this one does not reopen — that is what makes
          it a test rather than a practice run.
        </div>
      ) : null}

      {result && !oneShot && (() => {
        const passFail = result.totalPossible === 0;
        const passed = isPassing(result);
        // The score a pass/fail part RECORDS: met = 1, partly met = half (criteriaScore). It used to
        // read "3 / 3 criteria met" for an answer that was partial on all three, which a student
        // reads as full marks while the recorded score is 1.5 of 3.
        const earnedCriteria = criteriaScore(result.criteria);
        return (
        <div id={`written-feedback-${lessonId}`} className="written-feedback" style={{ marginTop: 20 }}>
          {status.resultStale ? (
            <div className="ux2-stale-note" role="note">This feedback is for your earlier answer. Submit to get feedback on what you have written now.</div>
          ) : null}
          {resultIsBest ? (
            <div style={{ marginBottom: 8, color: 'var(--c-cyan)', fontSize: 13 }}>This is your best try, the one that counts.</div>
          ) : maxSubmissions !== null ? (
            <div style={{ marginBottom: 8, color: 'var(--c-cyan)', fontSize: 13 }}>This is your latest try. Your best try is the one that counts.</div>
          ) : null}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              color: 'var(--c-meta)',
              fontSize: 14,
            }}
          >
            <span>
              <strong style={{ color: 'var(--c-fg)', fontSize: 16 }}>
                {passFail
                  ? `${Math.round(earnedCriteria * 10) / 10} / ${result.criteria.length} criteria (partly met counts half)`
                  : `${result.totalEarned} / ${result.totalPossible}`}
              </strong>
              {!passFail && (
                <>
                  {' '}
                  ({Math.round((result.totalEarned / result.totalPossible) * 100)}%)
                </>
              )}
            </span>
            <span>{passed ? '✓ passing' : 'needs revision'}</span>
          </div>

          {result.summary && (
            <div
              style={{
                marginBottom: 12,
                padding: 12,
                borderLeft: '3px solid var(--c-purple)',
                background: 'color-mix(in srgb, var(--c-purple) 8.0%, transparent)',
                borderRadius: 4,
                color: 'var(--c-fg)',
                fontStyle: 'italic',
              }}
            >
              {result.summary}
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {result.criteria.map((c, i) => {
              const label = config.rubric.find((r) => r.id === c.id);
              const color =
                c.verdict === 'met'     ? 'var(--c-green)'
              : c.verdict === 'partial' ? 'var(--c-yellow)'
                                        : 'var(--c-red)';
              const Icon =
                c.verdict === 'met'     ? CircleCheck
              : c.verdict === 'partial' ? Circle
                                        : CircleX;
              return (
                <div
                  key={c.id || i}
                  style={{
                    padding: 12,
                    background: 'var(--c-bg)',
                    borderRadius: 6,
                    border: '1px solid ' + withAlpha(color, '55'),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Icon size={18} color={color} />
                    <strong style={{ color: 'var(--c-fg)' }}>{label?.title || c.id}</strong>
                    <span style={{ marginLeft: 'auto', color, fontWeight: 600, fontSize: 13 }}>
                      {passFail
                        ? c.verdict === 'met' ? 'met' : c.verdict === 'partial' ? 'partial' : 'missing'
                        : `${c.earned} / ${c.max} pts`}
                    </span>
                  </div>
                  {c.feedback && (
                    <p style={{ margin: '4px 0 0 26px', color: 'var(--x-cccccc)', fontSize: 13, lineHeight: 1.5 }}>
                      {c.feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {passed && (
            <div style={{ marginTop: 16 }}>
              {/* The same Next every lesson type shows (ux1 B1). */}
              <NextLessonButton lessonId={lessonId} />
              <p style={{ margin: '8px 0 0', color: 'var(--c-meta)', fontSize: 13 }}>
                {/* A zero-point rubric (3.9.1, 3.9.3) has no score to raise, so
                    "keep revising to push your score higher" is an invitation to
                    resubmit the same plan. Students did: one class submitted 25
                    times after passing. Say plainly that pass/fail is all there is. */}
                {result.totalPossible === 0
                  ? "You've passed — this part is marked pass or fail, so there is no score to raise. Move on whenever you're ready."
                  : capReached
                    ? "You've passed. All your tries are used, so this is your final score. Move on whenever you're ready."
                    : "You've passed — keep revising to push your score higher if you want, or move on whenever you're ready."}
              </p>
            </div>
          )}

          {result.hints && result.hints.length > 0 && (
            <div style={{ marginTop: 14, padding: 12, background: 'var(--c-bg)', borderRadius: 6, border: '1px solid color-mix(in srgb, var(--c-orange) 33.3333%, transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--c-orange)', fontWeight: 600 }}>
                <Lightbulb size={16} />
                Hints
              </div>
              <ul style={{ margin: 0, paddingLeft: 22, color: 'var(--x-cccccc)', fontSize: 13, lineHeight: 1.6 }}>
                {result.hints.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}
        </div>
        );
      })()}
    </section>
  );
}
