import { NextRequest, NextResponse } from 'next/server';
import { chat, isReachable } from '../../../lib/ollama';
import { sections as docSections } from '../../../lib/q5play-docs';

interface RubricItem {
  id: string;
  title: string;
  description?: string;
  points: number;
}

interface GradeRequest {
  lessonId: string;
  lessonTitle: string;
  prompt: string;            // the original assignment prompt
  response: string;          // student response
  rubric: RubricItem[];
  model?: string;
  contextDocs?: string[];    // q5play-docs section slugs to include as reference
}

interface CriterionResult {
  id: string;
  earned: number;
  max: number;
  verdict: 'met' | 'partial' | 'missing';
  feedback: string;
}

interface GradeResponse {
  ok: true;
  totalEarned: number;
  totalPossible: number;
  criteria: CriterionResult[];
  summary: string;
  hints: string[];
}

function buildDocContext(slugs: string[] | undefined): string {
  if (!slugs || slugs.length === 0) return '';
  const chunks: string[] = [];
  for (const slug of slugs) {
    const section = docSections.find((s) => s.slug === slug);
    if (!section) continue;
    chunks.push(`### Reference — ${section.title}`);
    for (const page of section.pages) {
      chunks.push(`**${page.title}**\n${page.body}`);
      if (page.code) chunks.push('```js\n' + page.code + '\n```');
    }
  }
  return chunks.join('\n\n');
}

// Flat outline of every section + page in the in-app q5play docs. Included in
// every grade request so the model knows what pages exist even when a topic
// isn't in the lesson's contextDocs. The [slug] prefix is the section's URL
// segment at /docs/q5play/[slug].
function buildDocOutline(): string {
  const lines: string[] = [];
  for (const section of docSections) {
    lines.push(`- [${section.slug}] ${section.title}`);
    for (const page of section.pages) {
      lines.push(`    - ${page.title}`);
    }
  }
  return lines.join('\n');
}

function buildPrompt(req: GradeRequest): { system: string; user: string } {
  const docContext = buildDocContext(req.contextDocs);
  const docOutline = buildDocOutline();
  const rubricText = req.rubric
    .map((r) => `- [${r.id}] (${r.points} pts) ${r.title}${r.description ? ' — ' + r.description : ''}`)
    .join('\n');
  const totalPossible = req.rubric.reduce((s, r) => s + r.points, 0);

  const system = `You are a supportive but accurate CS tutor grading a high-school student's short written response in a JavaScript + q5play game-development course.

Your job:
1. Score each rubric item fairly. Partial credit is fine when intent is right but the answer is incomplete or imprecise. Award 0 only when the item is genuinely not attempted or wrong.
2. Give SHORT, specific, encouraging feedback per item (max 2 sentences each).
3. Suggest up to 2 actionable hints for things the student should re-read or re-think. When a hint points at the q5play docs, use the EXACT page title from the q5play docs outline so the student can find it. Prefer specific pages (subsections) over section names.
4. Never reveal the full correct answer.
5. Respond ONLY with valid JSON matching this shape:

{
  "criteria": [
    { "id": "<rubric id>", "earned": <number>, "verdict": "met" | "partial" | "missing", "feedback": "<1-2 sentences>" }
  ],
  "summary": "<1-2 sentence overall note to the student>",
  "hints": [ "<optional doc pointer or nudge>", ... up to 2 ]
}

Use plain text — no markdown, no code fences around the JSON.`;

  const user = `# Assignment: ${req.lessonTitle}

## Prompt the student was given
${req.prompt}

## Rubric (total ${totalPossible} pts)
${rubricText}

## q5play docs outline (all pages that exist in the in-app docs)

${docOutline}

${docContext ? `## q5play reference — deep content for this lesson\n\n${docContext}\n\n` : ''}## Student response

"""
${req.response.trim()}
"""

Grade now. Return JSON only.`;

  return { system, user };
}

export async function POST(req: NextRequest) {
  let body: GradeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.response || body.response.trim().length < 20) {
    return NextResponse.json(
      { ok: false, error: 'Response is empty or too short. Write at least a few sentences.' },
      { status: 400 },
    );
  }
  if (!body.rubric || body.rubric.length === 0) {
    return NextResponse.json({ ok: false, error: 'Missing rubric' }, { status: 400 });
  }

  const model = body.model || 'qwen3-coder-next:cloud';
  const reachable = await isReachable();
  if (!reachable) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Ollama is not reachable at http://localhost:11434. Start Ollama and try again. Your teacher can grade manually as a fallback.',
        offline: true,
      },
      { status: 503 },
    );
  }

  const { system, user } = buildPrompt(body);

  let raw: string;
  try {
    const response = await chat({
      model,
      json: true,
      temperature: 0.2,
      timeoutMs: 180_000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    raw = response.message.content;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: `Ollama call failed: ${msg}` }, { status: 502 });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        { ok: false, error: 'Model did not return JSON. Try again or ask your teacher.', raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Could not parse model output', raw: raw.slice(0, 500) },
        { status: 502 },
      );
    }
  }

  const criteria: CriterionResult[] = body.rubric.map((r) => {
    const match = (parsed.criteria || []).find((c: any) => c.id === r.id);
    const earnedRaw = Number(match?.earned ?? 0);
    const earned = Math.max(0, Math.min(r.points, isFinite(earnedRaw) ? earnedRaw : 0));
    const verdict: CriterionResult['verdict'] =
      (match?.verdict === 'met' || match?.verdict === 'partial' || match?.verdict === 'missing')
        ? match.verdict
        : earned === r.points ? 'met' : earned > 0 ? 'partial' : 'missing';
    return {
      id: r.id,
      earned,
      max: r.points,
      verdict,
      feedback: String(match?.feedback || '').slice(0, 400),
    };
  });
  const totalEarned = criteria.reduce((s, c) => s + c.earned, 0);
  const totalPossible = body.rubric.reduce((s, r) => s + r.points, 0);
  const hints = Array.isArray(parsed.hints)
    ? parsed.hints.slice(0, 3).map((h: any) => String(h).slice(0, 250))
    : [];

  const result: GradeResponse = {
    ok: true,
    totalEarned,
    totalPossible,
    criteria,
    summary: String(parsed.summary || '').slice(0, 600),
    hints,
  };
  return NextResponse.json(result);
}
