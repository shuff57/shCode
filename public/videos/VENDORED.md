# Vendored explainer videos

Papermorph pages (narrated, mark-synced SVG beats), built in bookSHelf under
`_workspace/papermorph-trials/moshion-5.1.2-style/` (style: STYLE.md there) and copied here as a folder.
A lesson plays one with `"videoUrl": "/videos/<name>/index.html"` (dev serves no directory index; Pages redirects index.html to the folder) (ContentLessonView puts a non-media URL in an iframe).

| Folder | Lesson | Length | Voice |
| --- | --- | --- | --- |
| `5-1-2/` | 5.1.2 Your first moSHion sketch | 2:39 | sandbox Edge TTS (en-US-AndrewMultilingualNeural, -10%), not the cloned voice |
| `5-1-12/` | 5.1.12 The Frame Loop Explained | 2:40 | same voice and rate |
| `5-2-gravity/` | 5.2.6 Reading: Gravity | ~2:29 | same voice and rate |
| `5-2-jump/` | 5.2.9 Reading: Ground-Gated Actions | ~2:19 | same voice and rate |

The two 5.2 explainers are not separate lessons: they are attached to the reading they teach with
`"videoUrl": "/videos/<name>/index.html"`, and `ContentLessonView` renders the player above the reading's
markdown whenever a lesson has a `videoUrl` (previously only `preview: "video"` did). That keeps one
explainer per main idea without renumbering the module.


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
