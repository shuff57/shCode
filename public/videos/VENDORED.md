# Vendored explainer videos

Papermorph pages (narrated, mark-synced SVG beats), built in bookSHelf under
`_workspace/papermorph-trials/moshion-5.1.2-style/` (style: STYLE.md there) and copied here as a folder.
A lesson plays one with `"videoUrl": "/videos/<name>/index.html"` (dev serves no directory index; Pages redirects index.html to the folder) (ContentLessonView puts a non-media URL in an iframe).

| Folder | Lesson | Length | Voice |
| --- | --- | --- | --- |
| `5-1-2/` | 5.1.2 Your first moSHion sketch | 2:39 | sandbox Edge TTS (en-US-AndrewMultilingualNeural, -10%), not the cloned voice |
| `5-1-12/` | 5.1.12 The Frame Loop Explained | 2:40 | same voice and rate |
| `5-2-gravity/` | 5.2.7 Video: Gravity Explained | ~2:29 | same voice and rate |
| `5-2-jump/` | 5.2.11 Video: The Jump Explained | ~2:19 | same voice and rate |
| `5-2-forces/` | 5.2.17 Video: Forces vs Velocity Explained | ~2:28 | same voice and rate |
| `5-2-update/` | 5.2.27 Video: update() Runs Before Physics | ~2:34 | same voice and rate |
| `5-2-bounce/` | 5.2.14 Video: Bounciness and Friction Explained | ~2:43 | same voice and rate |
| `5-2-random/` | 5.2.1 Video: Random Numbers and Timers | ~2:43 | same voice and rate |
| `5-2-delete/` | 5.2.20 Video: Delete and Hide Explained | ~2:08 | same voice and rate |
| `5-3-table/` | 5.3.2 Video: The Pinball Table, Explained (overview of the whole module: the table built in stages) | ~2:25 | same voice and rate |

The last five (`5-2-forces` through `5-2-delete`, built 2026-11-06 in bookSHelf `_workspace/papermorph-trials/moshion-5.2-*`
and reviewed by independent eyes and ears passes) sync labels to the spoken word through `audio/en/words.js`
where a beat needed it (`5-2-bounce/`, `5-2-update/`); the other beats sync to sentence marks. None of the five has a human-listened audio pass yet: the ears
reviews were ASR (faster-whisper small.en and medium.en) plus signal measurements, so give each a listen before
relying on it.

Each 5.2 explainer is its own `preview: "video"` lesson (`lessons/5-2-video-*`), placed right before the reading it
explains, like `5-1-2/` and `5-1-12/`. The readings no longer carry a `videoUrl`.

**No lesson number appears in a video.** The title card says `moSHion · Physics Feel` and the end card says
`UP NEXT / The reading: <title>`; the narration says "Up next, the reading". Lesson numbers move whenever 5.2 is
renumbered, and the spoken ones cannot be edited without re-synthesizing the voice, so the videos never name one.
Keep it that way when a new one is added.

Re-copy the bookSHelf `site/` folder over the matching folder to update. Do not hand-edit.

**The character is playable** (both explainers, `lib/play.js` + `CHAR.play` hooks in `lib/director.js`).
He can be grabbed and dragged (1:1 with the pointer, grab offset respected, hard-clamped inside the
1600x900 stage), dangles and swings with the drag velocity, and says an exclamation while he is held
(again every ~0.8 s while being ragged). A pointer that comes within 165 stage px of him fires one of
his power-ups in rotation: rasengan, super saiyan, teleport; it re-arms only after the pointer leaves a
300 px ring, with a 3.6 s cooldown. Clicks on him never toggle playback. It all runs on the wall clock,
so `CH.signature()` and the spacing gate (`CH.boxNow()`) still see the untouched teaching state.
`5-1-12/beats.js` keeps the play-mode label plain ("slow motion" / "slow motion: one frame at a time");
"moSHion" is used only where the video names the sketch or its canvas.
