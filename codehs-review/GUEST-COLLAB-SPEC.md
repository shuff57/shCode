# Guests: a student invites an account holder into their sandbox

Status: **built (migrations 0059 and 0060)** (2026-11-14); see CLAUDE.md, "Guests, and messaging between a host and their guest". Owner's decisions: **invite, then a teacher approves**; **any
account may be invited and the teacher decides** at approval time (open question 1 is answered; a teacher of the
class who is invited needs no approval). **Who the guest is: more than one kind** (owner, 2026-11-14), so the approval
design stays sized for the risky case (a friend or sibling outside the classes). **An approved guest counts as vetted for
Public** (ASSET-AUDIENCE-SPEC.md): signed-in AND (in a class OR an approved guest).

Two of the likely guests do NOT need this system, and the spec should not grow to cover them: a student from another
teacher's class can join that class with its code (multi-class enrollment works), and a student whose class ended is a
rollover of the enrollment's `expires_at`. **Bug found while checking this, fixed 2026-11-14:** an enrollment whose `expires_at` had passed kept its row, so
`POST /api/join-class` answered "already enrolled" and the student could not get back in; join-class now takes over an ended row.

## What the finding changes

The brief was "student features in the sandbox without completing any lessons". Checked against the code
(2026-11-14): **the sandbox is not gated on lessons.** A lesson-id check fails open for `sandbox-*` ids, and any
signed-in account already has the standalone sandbox, its projects, cloud save, and the texture/sound/font
library. What a person with no class cannot do is everything that is *class-bound*:

- Code together and game rooms (`inClass` is asked of `GET /api/rooms`), "Send to..." a program,
- sharing to the Library and the class's Games library,
- messaging (every conversation lives in a class).

So a guest is **not a lesson bypass; it is a narrow, approved bridge from one student into those social
features**, without putting an outsider on a roster, in a gradebook or in a class channel.

## The model

A guest is an existing account plus a row in a new table, `sandbox_guests`:

```
id, host_email (the student), class_id (the class that vouches), guest_email,
status 'invited' | 'pending' | 'approved' | 'declined' | 'revoked',
code (the invite), invited_at, redeemed_at, decided_by, decided_at, expires_at
```

It deliberately does **not** reuse `enrollments`: an enrollment puts a person in every class feature
(roster, channels, `classPeople()`, grade tables), which is exactly what a guest must not get. The guest never
appears in `classPeople()`, so every messaging/channel/@mention list stays class-only by construction.

### Flow

1. **Invite.** Student: Account (or the sandbox Share menu) -> *Guests* -> pick which of their classes vouches
   -> **Make an invite code**. A short code like the class join code, single use, good 7 days. The student never
   types an email (and `findPII` would refuse one anyway).
2. **Redeem.** The guest, signed in with their own account, enters the code (`/join-class` gets a second box, or
   `/guest`). Status becomes `pending`. The guest sees "Waiting for <teacher> to say yes."
3. **Approve.** Class page -> Messages & guests tab -> **Guests**: who invited, the guest's first name + last initial,
   their account role and when it was created, **Approve / Decline**. Nothing is live until a teacher of the
   vouching class approves. Either teacher of the class can later **Revoke**; so can the host student, at once.
4. **Expire.** Same school-year cutoff as enrollments (`getCurrentExpirationDate`). Approval does not renew.

## What an approved guest gets, and does not

| Gets | Does not get |
| --- | --- |
| the sandbox, its projects, cloud save, own library | any lesson, grade, due date or gradebook row |
| **Code together / game rooms with the host student** (`mayJoin` accepts "approved guest of this host") | joining sessions of anyone else in the class |
| receiving "Send to..." programs **from the host** | any messaging: no DMs, groups, channels, @mentions |
| open a copy / Remix of what the host sent | the class Library or Games library, class sharing |
| publish a game as **Just me** only | Public or class audiences (see the audience spec) |

Shown everywhere as first name + last initial with a **(guest)** tag. The host's invited guests are listed to
the host with Revoke. Limits (recommended): 3 active guests per student, 20 pending per class.

## Safety, said plainly

- **Registration has no email verification** (CLAUDE.md, ai-help limits). "Someone with an account" is therefore
  a weak statement about who they are. **The teacher's approval is the real control**, so the approval card must
  show real signals (role, account age, how the host described them if we add a free-text "who is this?"
  field, which would go through `findPII`).
- A live editing session is the highest-risk surface. Mitigations, all existing: the teacher already gets the
  text of every Code together session (`code_sessions`, Students tab "Code together sessions"), **guest
  participants are included**; a guest can only enter sessions the host student starts; the guest cannot message
  anyone, so there is no side channel.
- **Revoking is not instant inside a session that is already running.** A revoked or expired guest fails the
  ticket check on their next connection (`authorizeLive`), but nothing in the room re-checks a seat that is
  already connected (`LiveDocCore` only records who connected). To make Revoke immediate, the Durable Object
  needs a "drop this email" message from the revoke route; that is part of build step 2 and must be tested
  against `workers/live`, not assumed.

## Open questions

1. **Who may be a guest?** Any account, only student accounts, or "teacher decides" (recommended, since the
   approval card shows the role). A teacher account as a guest (a co-teacher helping a student) is a natural
   case that should not need approval at all if they teach the class.
2. **Should a guest be able to be invited by two students, or into two classes?** Recommended: one `sandbox_guests`
   row per (host, guest); the same guest may have several hosts, each approved separately.
3. Does a guest need **CODY** (the AI tutor)? Recommended no: it is metered per student and the guest is not
   one of the course's students.

## Build order

1. Migration `sandbox_guests`; `POST /api/guests` (make code), `POST /api/guests/redeem`, `GET /api/guests`,
   `DELETE /api/guests/[id]`; `GET|POST /api/classes/[id]/guests` (list, approve, decline, revoke).
2. `mayJoin()` (`functions/_shared/rooms.ts`) and the `inClass` answer of `GET /api/rooms` learn "approved
   guest of this host"; the live Worker learns to drop a revoked seat. `SendProgramButton` learns it for the
   host's side.
3. UI: Guests on Account, the redeem box, the teacher's Guests panel, the (guest) tag.
4. `scripts/test-guests.mjs`: no roster/`classPeople` leak, no messaging, approval required, revoke closes a
   seat, expiry, caps, no email in any answer.

## What changed from this design while building it (2026-11-14)

- **Messaging IS allowed, host and guest only** (the owner's later decision; the table above said none). It is a direct
  conversation under the host's class, so that class's teachers read it, with the host's level governing both ways, a guest cap
  that holds even for a teacher-role account, and reading kept after the pair ends. Classmates, groups and channels are still closed.
- **"Send to..." is not a separate guest feature:** it rides messaging, so it works between host and guest through the same list.
- **Revoke IS instant inside a running session.** The earlier worry that the Worker needed a new message was wrong: LiveDoc and
  LiveRoom already honour `{op:'leave', seat}`, so a revoke marks the seat left in D1 and sends that control.
- **Added:** a per-class off switch (`classes.guests_off`), "(guest)" in the live session name, and a rule that a TEACHER's no
  stands but a host or guest ending it themselves does not bar the pair.

## A school email as proof (2026-11-15, migration 0061)

Owner's decision: signup stays open with a personal address, but a class can require the guest to prove a SCHOOL address first.
The district's mail blocks students' outside mail in both directions, so the site sends and receives nothing: the teacher's school
account emails a one-time phrase to the guest's school address, and the guest types it back. Student-to-student mail was rejected as
a proof (the host would see the phrase and could pass it on). The teacher's approval stays the gate after the proof, and a class that
leaves the switch off behaves exactly as before. Rules, limits and the phrase's life are in `CLAUDE.md` under "Guests".
