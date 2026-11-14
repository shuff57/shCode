// Messages (migration 0053, owner's decision 2026-11-13): the rules and words shared by the routes
// (functions/api/messages/*, functions/api/classes/[id]/messages.ts), the mailbox in the header
// (components/Mailbox.tsx) and the teacher's panel (components/ClassMessages.tsx).
//
// Four kinds of conversation, each in ONE class (migration 0055 added groups and channels):
//   'teacher'   two people, one of them a teacher of the class;
//   'students'  two students of the class;
//   'group'     2-8 people of the class, made by a student or a teacher, with an optional name;
//   'channel'   the whole class (#general is made for every class; anyone may add one, a teacher can
//               lock one so only teachers post, rename or delete it).
// What a STUDENT may send is decided by a level, per class and per student, and the stricter wins
// (`classes.student_messages_off`, `class_message_mutes.level`):
//   0 On           everything;
//   1 Teacher only  messages to a teacher of the class, nothing else (the old pause and class switch);
//   2 Off          nothing at all; they can still read.
// Teachers always may. Who may read: a 2-person conversation's two people; a group's members; a
// channel, everyone in the class. A class's teachers also read every conversation between students and
// every group (students are told so). Names are first name + last initial; no answer carries an email.
//
// The safety check runs on the server for every message (findPII, the same check as CODY's): a
// message with a phone number, an address, an email and the like is refused with a plain reason.

import { findPII } from './pii-check';

export const MESSAGE_MAX = 1000;
export const MESSAGE_LINES = 30;
/** Messages one student may send in one minute, and in one day (teachers have no cap). */
export const MESSAGES_PER_MINUTE = 10;
export const MESSAGES_PER_DAY = 200;
/** Messages one conversation holds. */
export const MESSAGES_PER_THREAD = 2000;
/** Conversations listed in the mailbox. */
export const THREAD_LIST_LIMIT = 50;
/** How often an open mailbox asks for new messages, and how often the closed bell asks for the count. */
export const THREAD_POLL_MS = 10_000;
export const COUNT_POLL_MS = 30_000;

const PII_WORDS: Record<string, string> = {
  SSN: 'a Social Security number',
  email: 'an email address',
  phone: 'a phone number',
  'credit card': 'a long number like a card number',
  address: 'a street address',
  'bank account number': 'a bank account number',
};

/** The words a student sees when the safety check refuses a message. */
export function piiRefusal(label: string): string {
  const what = PII_WORDS[label] ?? 'personal information';
  return `This message looks like it has ${what} in it, so it was not sent. To keep everyone safe, messages cannot share phone numbers, addresses, emails or other personal details.`;
}

/** Tidy a message and check it: length, lines, special characters and the safety check. */
export function cleanMessage(raw: unknown): { body: string } | { error: string; safety?: true } {
  if (typeof raw !== 'string') return { error: 'Write a message first.' };
  const body = raw.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!body) return { error: 'Write a message first.' };
  if ([...body].length > MESSAGE_MAX) return { error: `A message is at most ${MESSAGE_MAX} characters. Split it into two.` };
  if (body.split('\n').length > MESSAGE_LINES) return { error: `A message is at most ${MESSAGE_LINES} lines. Split it into two.` };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(body)) return { error: 'That message has special characters in it. Type it again in plain words.' };
  const pii = findPII(body);
  if (pii) return { error: piiRefusal(pii), safety: true };
  return { body };
}

/** Why a person may not send in a conversation right now, or null when they may. */
export type SendBlock =
  | 'left' | 'other-left' | 'class-off' | 'muted' | 'archived'
  | 'class-all-off' | 'all-off' | 'locked' | 'not-member' | null;

/** A student's messaging level (0 On, 1 Teacher only, 2 Off); the stricter of class and student wins. */
export type MessageLevel = 0 | 1 | 2;
export const LEVEL_LABEL: Record<MessageLevel, string> = { 0: 'On', 1: 'Teacher only', 2: 'Off' };
export const isLevel = (v: unknown): v is MessageLevel => v === 0 || v === 1 || v === 2;

export function blockText(why: SendBlock, other = 'They', className = 'this class'): string {
  switch (why) {
    case 'class-all-off': return `Your teacher has turned off student messages in ${className}. You can still read them.`;
    case 'all-off': return `Your teacher has turned off your messages in ${className}. You can still read them.`;
    case 'locked': return `Only teachers can post in ${other}.`;
    case 'not-member': return `You are not in ${other} any more.`;
    case 'left': return `You are not in ${className} any more, so you cannot send messages here.`;
    case 'other-left': return `${other} is not in ${className} any more, so messages cannot be sent here.`;
    case 'archived': return `${className} has been archived, so messages cannot be sent here.`;
    case 'class-off': return `Your teacher has set messages in ${className} to teacher only. You can still message your teacher.`;
    case 'muted': return `Your teacher has paused your messages to classmates in ${className}. You can still message your teacher.`;
    default: return '';
  }
}

/** The line shown above every conversation between two students. */
export const WATCHED_NOTE = 'Your teacher can read messages between classmates.';
export const GROUP_NOTE = 'Your teacher can read this group.';
export function channelNote(className: string): string {
  return `Everyone in ${className} can read this channel, and so can your teacher.`;
}

export type ThreadKind = 'teacher' | 'students' | 'group' | 'channel';
/** People in one group, its maker included. */
export const GROUP_MAX_PEOPLE = 8;
export const GROUP_TITLE_MAX = 40;
export const CHANNEL_NAME_MAX = 24;
export const CHANNELS_PER_CLASS = 30;
/** Groups and channels one student may make in a day. */
export const MADE_PER_DAY = 10;
/** Messages one channel holds (a two-person conversation or a group: MESSAGES_PER_THREAD). */
export const MESSAGES_PER_CHANNEL = 10_000;
/** A conversation opens on its newest messages. */
export const THREAD_VIEW_LIMIT = 200;
export const GENERAL = 'general';

/** A channel name as Discord writes one: lower case, words joined by dashes, 1-24 characters. */
export function cleanChannelName(raw: unknown): { name: string } | { error: string; safety?: true } {
  const name = (typeof raw === 'string' ? raw : '').toLowerCase().trim().replace(/^#+/, '')
    .replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!name) return { error: 'Give the channel a name (letters, numbers and dashes).' };
  if (name.length > CHANNEL_NAME_MAX) return { error: `A channel name is at most ${CHANNEL_NAME_MAX} characters.` };
  const pii = findPII(name.replace(/-/g, ' '));
  if (pii) return { error: `That name looks like it has ${PII_WORDS[pii] ?? 'personal information'} in it. Pick another name.`, safety: true };
  return { name };
}

/** A group's name: one line, at most 40 characters, may be empty (then it shows its people's names). */
export function cleanGroupTitle(raw: unknown): { title: string } | { error: string; safety?: true } {
  const title = (typeof raw === 'string' ? raw : '').replace(/\s+/g, ' ').trim();
  if ([...title].length > GROUP_TITLE_MAX) return { error: `A group name is at most ${GROUP_TITLE_MAX} characters.` };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(title)) return { error: 'That name has special characters in it. Type it again in plain words.' };
  const pii = findPII(title);
  if (pii) return { error: `That name looks like it has ${PII_WORDS[pii] ?? 'personal information'} in it. Pick another name.`, safety: true };
  return { title };
}

/** What a group is called when it has no name: its other people, first names. */
export function groupLabel(title: string, names: string[]): string {
  if (title) return title;
  if (!names.length) return 'Group';
  return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
}

export interface MessagePerson {
  /** A random public id for this account (person_keys); never an email. */
  key: string;
  name: string;
  teacher: boolean;
}

/** One conversation in the mailbox list. */
export interface ThreadSummary {
  id: string;
  classId: string;
  className: string;
  kind: ThreadKind;
  /** The person (two-person), the group's name, or the channel's name (no #). */
  title: string;
  /** Two-person: the other person. A group or channel: its title, not a teacher. */
  other: { name: string; teacher: boolean };
  /** A group: how many people; a channel: locked to teachers. */
  people?: number;
  locked?: boolean;
  last: { snippet: string; mine: boolean; at: number; removed: boolean; author?: string } | null;
  unread: boolean;
}

/** One message as a page receives it. `body` is null once a teacher removed it (and `share` too). */
export interface MessageItem {
  id: string;
  mine: boolean;
  author: string;
  teacher: boolean;
  body: string | null;
  removed: boolean;
  at: number;
  /** A sandbox program sent with it (migration 0054), or null. */
  share: ShareCard | null;
}

// ---- a sandbox program in a message (migration 0054) ---------------------------------------------

export type ShareKind = 'copy' | 'together' | 'watch';
export type ShareLang = 'js' | 'moshion';
/** The most code a copy may hold, in UTF-8 bytes (the same as a published game). */
export const SHARE_CODE_MAX = 64 * 1024;
export const SHARE_TITLE_MAX = 40;
export const LANG_LABEL: Record<ShareLang, string> = { js: 'JavaScript', moshion: 'moSHion' };

/** What a message shows for a program sent with it. */
export interface ShareCard {
  id: string;
  kind: ShareKind;
  lang: ShareLang;
  title: string;
  /** 'together' and 'watch': the session is still open (the code is given only then). */
  open?: boolean;
  room?: string;
}

/** GET /api/shares/[id]. */
export interface ShareView extends ShareCard {
  author: string;
  mine: boolean;
  at: number;
  /** 'copy' only. */
  code?: string;
}

export const isShareId = isHex32;
export const isShareLang = (v: unknown): v is ShareLang => v === 'js' || v === 'moshion';

/** The project name as sent: one line, at most 40 characters, checked for personal details. */
export function cleanShareTitle(raw: unknown): { title: string } | { error: string; safety?: true } {
  const title = (typeof raw === 'string' ? raw : '').replace(/\s+/g, ' ').trim();
  if ([...title].length > SHARE_TITLE_MAX) return { title: [...title].slice(0, SHARE_TITLE_MAX).join('') };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(title)) return { error: 'That project name has special characters in it. Rename it in plain words.' };
  const pii = findPII(title);
  if (pii) return { error: `The project name looks like it has ${PII_WORDS[pii] ?? 'personal information'} in it, so it was not sent. Rename the project first.`, safety: true };
  return { title };
}

/** A copy's code: not empty, at most 64 KB, and checked for personal details like a message. */
export function cleanShareCode(raw: unknown): { code: string } | { error: string; safety?: true } {
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'There is no code to send yet.' };
  const code = raw.replace(/\r\n?/g, '\n');
  if (new TextEncoder().encode(code).length > SHARE_CODE_MAX) return { error: 'This program is too long to send (64 KB is the most). Publish it as a game instead, or send a shorter one.' };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(code)) return { error: 'This program has special characters in it, so it was not sent.' };
  const pii = findPII(code);
  if (pii) {
    return {
      error: `This program looks like it has ${PII_WORDS[pii] ?? 'personal information'} in it, so it was not sent. To keep everyone safe, programs you send cannot have phone numbers, addresses, emails or other personal details in them.`,
      safety: true,
    };
  }
  return { code };
}

/** The line a mailbox list shows for a message that is only a program (after "You: " or a name). */
export function shareSnippet(kind: ShareKind, title: string): string {
  if (kind === 'together') return 'An invitation to Code together';
  if (kind === 'watch') return 'An invitation to watch live';
  return `A program${title ? `: ${title}` : ''}`;
}

/** GET /api/messages/[id]. */
export interface ThreadView {
  id: string;
  classId: string;
  className: string;
  kind: ThreadKind;
  title: string;
  other: { name: string; teacher: boolean };
  /** A group's people (the reader included). */
  members?: { key: string; name: string; teacher: boolean; me: boolean }[];
  locked?: boolean;
  messages: MessageItem[];
  /** There are older messages than these (only the newest THREAD_VIEW_LIMIT are sent). */
  more: boolean;
  canSend: boolean;
  why: SendBlock;
  whyText: string;
  /** The line above it: who else can read it, or null. */
  note: string | null;
  /** A teacher of the class: may remove and put back messages (removed words are sent to them). */
  moderate: boolean;
  /** May rename it / add people (a group's members; a channel: its teachers and its maker). */
  manage: boolean;
  /** Reading it as a teacher of the class, not as one of its people. */
  onlooker: boolean;
}

/** GET /api/messages?people=1: whom the caller may start a conversation with, per class. */
export interface PeopleClass {
  id: string;
  name: string;
  /** The caller teaches this class. */
  teaches: boolean;
  people: MessagePerson[];
  /** For a student: why classmates are not listed (teachers still are), or null. */
  classmatesBlocked: SendBlock;
  /** For a student whose messages are Off: nobody is listed, and this says why. */
  allBlocked?: SendBlock;
}

export function snippetOf(body: string, n = 90): string {
  const one = body.replace(/\s+/g, ' ').trim();
  return [...one].length > n ? [...one].slice(0, n - 1).join('') + '…' : one;
}

/** "<class id>|<a>|<b>" with the two emails sorted: one conversation per pair per class. */
export function pairKey(classId: string, a: string, b: string): string {
  return [classId, ...[a, b].sort()].join('|');
}

function isHex32(v: unknown): v is string { return typeof v === 'string' && /^[0-9a-f]{32}$/.test(v); }
export const isThreadId = isHex32;
export const isPersonKey = (v: unknown): v is string => typeof v === 'string' && /^p[0-9a-f]{20}$/.test(v);
