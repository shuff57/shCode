'use client';

// Which lessons COUNT toward the grade, for a badge that must not call a reading "late".
// The rule is lessonGradeCategory (lib/grading-weights.ts), applied to the shipped manifest;
// this file only fetches the manifest once and hands back an id -> counted lookup.

import { useEffect, useState } from 'react';
import { lessonGradeCategory } from './grading-weights';

interface ManifestLesson {
  id: string;
  title: string;
  preview?: string | null;
  scoreKind?: 'quiz' | 'written' | null;
  assignmentCode?: string | null;
}

let cached: Map<string, boolean> | null = null;
let inflight: Promise<Map<string, boolean>> | null = null;

function load(): Promise<Map<string, boolean>> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetch('/lessons-manifest.json')
    .then((r) => (r.ok ? r.json() : { lessons: [] }))
    .then((data: { lessons?: ManifestLesson[] }) => {
      const m = new Map<string, boolean>();
      for (const l of data.lessons ?? []) {
        m.set(l.id, lessonGradeCategory({ title: l.title, preview: l.preview, scoreKind: l.scoreKind, assignmentCode: l.assignmentCode }) !== null);
      }
      cached = m;
      return m;
    })
    .catch(() => {
      // Not cached: a later mount may try again. Until then nothing is known to count, so no lesson is called late.
      inflight = null;
      return new Map<string, boolean>();
    });
  return inflight;
}

/** id -> counts toward the grade. Null until the manifest has loaded; an unknown id is absent. */
export function useCountedLessons(): Map<string, boolean> | null {
  const [map, setMap] = useState<Map<string, boolean> | null>(cached);
  useEffect(() => {
    let live = true;
    void load().then((m) => { if (live) setMap(m); });
    return () => { live = false; };
  }, []);
  return map;
}
