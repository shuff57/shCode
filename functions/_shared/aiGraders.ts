// Server-side lookup of a lesson's authored AI-grader config.
//
// The rubric and prompt are declared to the model as trusted teacher context
// (see lib/grade-written-core.ts), so they must NOT come from the request body.
// They are read here from public/ai-graders.json, baked at build time by
// scripts/generate-ai-graders.mjs.
//
// Unlike the sibling-gate manifest in lessonAccess.ts, which fails OPEN so an
// asset hiccup can't lock students out of lessons, this fails CLOSED: a lookup
// that can't be resolved must refuse to grade, never fall back to the client's
// copy. Falling back is the exact hole this module exists to close.

import type { RubricItem } from '../../lib/grade-written-core';

export interface AiGraderConfig {
  lessonTitle: string;
  prompt: string;
  rubric: RubricItem[];
  model?: string;
  contextDocs?: string[];
}

interface GraderEnv {
  ASSETS?: Fetcher;
}

let cache: Record<string, AiGraderConfig> | null = null;

export async function loadAiGrader(
  env: GraderEnv,
  request: Request,
  lessonId: string,
): Promise<AiGraderConfig | null> {
  if (!cache) {
    const url = new URL(request.url);
    url.pathname = '/ai-graders.json';
    url.search = '';
    try {
      const res = env.ASSETS
        ? await env.ASSETS.fetch(new Request(url.toString()))
        : await fetch(url.toString());
      if (!res.ok) return null;
      cache = (await res.json()) as Record<string, AiGraderConfig>;
    } catch {
      return null;
    }
  }
  return cache[lessonId] || null;
}
