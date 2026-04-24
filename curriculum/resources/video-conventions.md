# Video Lesson Conventions

Canonical rules for in-app lessons whose primary surface is a YouTube-embedded
video. When a module spec under `curriculum/modules/lessons/*.md` lists a
"video" entry or a `lessons/<slug>/` whose `lesson.json.preview === "video"`,
these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `preview === "video"`

**Canonical example:** `lessons/2-1-1-video-intro/lesson.json`.

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> Video — <topic>",
  "description": "<one-line hook ending with when-to-watch>",
  "type": "lesson",
  "difficulty": "beginner",
  "estimateMins": 5,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "video",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "videoUrl": "",
  "videoFallback": "<teacher-facing fallback copy>",
  "steps": [],
  "requirements": [],
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true }
}
```

### Field-by-field

- `videoUrl` — **leave empty** at build time. The UI accepts any YouTube URL form (`youtu.be/…`, `/watch?v=…`, `/embed/…`, `/shorts/…`) and auto-extracts the 11-char video ID into an `/embed/` iframe (see `components/ContentLessonView.tsx` `toEmbedUrl`). Teacher fills this in during course prep.
- `videoFallback` — the dashed-border message shown when `videoUrl` is empty. Make it actionable ("Ask your teacher for the link", "Open the slide deck for the live demo"). Never invent URLs here either.
- `steps` / `requirements` — must be empty arrays. Videos are not auto-graded.
- `grading.totalPoints` — must be `0`. The completion toggle is rendered by `CompletionPanel`, not the auto-grader.

## 2. File layout

```
lessons/<slug>/
└── lesson.json        # metadata only — no script.js, style.css, content.md
```

A `content.md` is allowed but rare — only when the video needs a short comprehension-check paragraph below the embed. Do not use it to duplicate the video transcript.

## 3. Don'ts

- **Do not invent a `videoUrl`.** Builder AI leaves it empty; teacher curates. Same rule as `q5play-starter-conventions.md` history column.
- **Do not auto-grade videos.** No `steps`, no `requirements`, no `aiGrader`.
- **Do not bundle a `script.js`.** There is nothing to run.
- **Do not use `preview: "video"` for a slide deck.** Slides have their own type (see `slide-deck-conventions.md`).

## 4. Title convention

`"<unit-numbering> Video — <topic>"` — the word "Video" appears in the title so the type is legible in the sidebar even if the badge is stripped.

Example: `"2.1.2 Video — Your first q5play sketch"`.

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Convention crystallized across `2-1-1-video-intro`, `2-2-2-video-new-sprite`, `2-2-7-video-this-keyword`. |
| This doc | Hoisted out of per-module specs so future modules inherit it. |
