# Who can see what a student shares: Private, My classes, My teacher's classes, Everyone

Status: **steps 1 and 2 built (the picker, then Public)** (2026-11-14). Owner's decisions: four audiences; **Public takes
effect at once and any teacher of the student can pull it**; "any of my classes" means **all of the teacher's
classes**; **Public is for signed-in shCode accounts only** (open questions 1 and 2 below are answered; question 1 was then tightened, see it);
**build the picker first, Public later** (both now built).

**Step 1 as built (migration 0057).** The two middle rungs, "My classes" (tick which) and "All of <teacher>'s
classes", are stored by **expanding into per-class share rows** (`library_shares` / `library_game_shares`), not
by a new table, so every existing reader (14 of them) and each class's teacher-side hide keep working unchanged.
`audience_teacher` on `library_items` / `library_games` remembers that a share is teacher-wide so a class that
teacher creates, or co-teaches, later gets the item too (`joinTeacherAudiences` in `functions/_shared/audience.ts`,
called from class creation and from adding a co-teacher). `POST /api/library/[id]/share` and
`POST /api/games/[id]/share` take `audience: { classes: [id] } | { teacher: <key> }`; with none they behave as
before (every class you are in). `GET /api/audiences` feeds the picker. Tests: `scripts/test-audience.mjs`.
What this step does NOT do: no Public rung, no `audience_shares` table, no "Newly public" feed. The design below
for those is unchanged.

## What exists today

A student shares a picture, sound, font or game with "my class". In the code that means **every live class
they are in at once** (`library_shares` and `library_game_shares`, one row per item per class;
`studentClassIds()` in `functions/_shared/libraryShare.ts`). A teacher of a class can hide an item there
(`hidden_at`/`hidden_by`). A second axis, *what people may do with it* (`share_choice`: play / credit / open /
free, `lib/share-choice.ts`), is already built and stays exactly as it is. This spec adds the **audience** axis
and leaves "what may they do" alone.

Uploaded images already have a public, unguessable URL (`/uploads/<id>`); that is not a share and is not touched.

## The audience ladder

One word per rung, in the words a 14-year-old reads. Every item has exactly one rung.

| Rung | Who sees it | Stored as |
| --- | --- | --- |
| **Just me** (default) | the owner | no share rows |
| **My classes** (pick which) | students and teachers of the classes ticked | `library_shares` / `library_game_shares` rows, as now |
| **All of Ms. Huff's classes** | everyone in any class that teacher owns or co-teaches | one `audience_shares` row, `scope = 'teacher'` |
| **Everyone** | anyone on shCode, listed in Library -> Public | one `audience_shares` row, `scope = 'public'` |

- "My classes" with one class ticked is the old "share with my class". A student in **three** classes now gets
  a checklist instead of an all-or-nothing switch, which is what multi-class enrollment needs. **No existing row
  changes meaning.**
- "All of <teacher>'s classes" is offered once per distinct teacher among the student's classes. The page is
  given a `teacherKey` (like `person_keys`), never the teacher's email.
- Rungs are exclusive in the UI but the tables allow combining (a game in Period 1 *and* public); the picker
  just shows the widest. Moving to a narrower rung deletes the wider rows.

## One place decides visibility

Today `sharedInto()` and `visibleGame()` each answer "may this viewer open this?". Add one function
`audiencesFor(viewer)` -> `{ classIds, teacherScopes, publicOk }` and make both readers use it, so a new rung
cannot be forgotten in one of them. Teachers keep seeing everything shared into their classes, hidden items
marked. Tests: extend `test-library-share.mjs`, `test-library-games.mjs`, add `test-audience.mjs`.

## Public, with the owner's rule: live at once, teacher can pull

Because Public is live at once, the safety work is in what happens **before** (cheap, automatic) and
**after** (a teacher who actually knows):

1. **Before.** The same `findPII` check messages use runs on a public item's name and, for a game, its title
   and code, with the same plain-words refusal. Names show as first name + last initial, never an email.
   Images cannot be scanned, so they rely on step 2.
2. **After: a teacher is told.** Teacher -> class page -> Students tab gets **"Newly public"** (newest first,
   what, who, when, one-click **Pull it**). Without this "teacher can pull it" is a power nobody notices to use.
3. **Pulling is sticky.** `hidden_at/hidden_by` on the public row. The owner sees "Your teacher took this
   down" and cannot re-publish it until a teacher puts it back. Any teacher of any class the owner is in may
   pull it (a student in two classes has two teachers; either one is enough).
4. **A kill switch per class**, like the messaging levels: `classes.public_sharing_off`. While on, that class's
   students see Everyone greyed out with the reason. Recommended default **on** (sharing allowed) to match the
   decision, one tap to turn off.
5. Public viewers outside the class get **no comments, suggestions or Propose change**. They can play, star and,
   if the item's `share_choice` allows it and they are signed in, Remix. Those features stay class-only.

## Open questions (they change what gets built)

1. ~~Is Public visible to someone who is not signed in?~~ **Answered (owner, 2026-11-14): Public is for accounts that are
   signed in AND vetted: in at least one class on this site, OR an approved sandbox guest** (GUEST-COLLAB-SPEC.md). Not
   "any signed-in account": signup is open (an email and a password, no verification, no domain or invite check), so that
   would be the open web with a speed bump. A class join code, or a teacher's approval of a guest, is the real gate.
   Consequences: `audiencesFor(viewer)` gets `publicOk = in a live class OR approved guest`; a guest is read-only on Public
   like anyone else; a student who leaves their last class (see `leave-class`) stops seeing Public until they join one.
   **Settled (owner, 2026-11-14): no email service.** A teacher is told in the app: a **"Newly public" list** on the class
   page (with Pull it) **plus a badge** on the envelope. **No delay: Public is live at once.** **A pull shows the student
   "Your teacher took this down" with an optional short reason** (the item goes back to their classes; sticky as above).
   Still OPEN: whether the badge and the notice ride the envelope's Activity feed or become real Messages.
2. **Reading of "any of my classes".** I read it as *any of the teacher's classes* (a rung between one class and
   everyone). If you meant *any of the student's own classes*, that is just "My classes" with several ticked and
   the third rung goes away.
3. Should a teacher be able to **pre-approve** instead of pull (a class setting "Public needs my OK")? Not
   built; it is the stricter alternative to the rule you chose, and would reuse the same table.

## Build order

1. `audience_shares` table + `audiencesFor()` + the "My classes" checklist and "All of <teacher>'s classes".
   (No new exposure: nothing leaves the teacher's own classes.)
2. Public: the PII check, the "Newly public" feed, Pull it, the class switch, Library -> Public tab.
3. Signed-out gallery, only if question 1 says so.

## Step 2 as built (migration 0058)

Public is the `public_shares` table (not the `audience_shares` sketched above, which was only needed for rungs that cannot be
expressed as class rows). What is in: the vetted gate (in a class, teacher or admin), live at once, the `findPII` check, the
per-class switch, "Newly public" with Take down / Put back and an optional reason, the Activity notice for teachers and for the
owner of a pulled item, "Everyone" in the Library, and `viaPublic` keeping comments, suggestions, proposed changes and versions
class-only. What differs from the sketch: **Put back deletes the row** (permission, not publication). What is still out: the
signed-out gallery (not wanted), an approved guest as a vetted viewer (when guests are built), and a pre-approval queue (the owner
chose live-at-once). Details and the traps are in CLAUDE.md, "Everyone, the Public rung".
