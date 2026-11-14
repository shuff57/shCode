// What's New: one entry per feature people should hear about. NEWEST FIRST.
//
// To announce a feature (CLAUDE.md, "What's New"):
//   1. Add a recipe for its id to scripts/whats-new/record.mjs and record the
//      clip against the local dev server:
//        node scripts/whats-new/record.mjs <id>
//      It writes public/whats-new/<id>.mp4 (silent H.264, 1280x720, 5-15 s)
//      and public/whats-new/<id>.jpg (the poster). A feature with nothing to
//      watch can ship a poster only (`--poster-only`).
//   2. Add an entry at the TOP of this list with the same id.
//   3. Run `node --import ./scripts/register-ts.mjs scripts/test-whats-new.mjs`.
//
// Entry fields:
//   id        stable, unique, NEVER reused or renamed. Seen-state is stored per
//             id, so a renamed id pops up again for everyone who saw it.
//   date      'YYYY-MM-DD' it shipped (git log --date=short). An entry is LIVE
//             for LIVE_DAYS after that: it may pop up (while unseen), it is in the
//             list behind "What's new" in the account menu and on /account, and
//             it lights the menu's dot. After that it is retired and shown
//             nowhere, but stays in this file: an id is never reused.
//   audience  'student' | 'teacher' | 'all'. A student never sees a teacher
//             entry and a teacher (or admin) never sees a student one.
//   title     a few words.
//   summary   one or two plain sentences for a 14-year-old beginner: what it is
//             and why it helps. Promise nothing the code does not do.
//   steps     optional, at most 3 short "how to use it" lines.
//   media     { poster, clip? }: files under /whats-new/. `clip` is a short
//             silent mp4, `poster` its still (also shown when there is no clip,
//             and in place of the clip when the reader asked for reduced motion).
//             `alt` says in words what the clip or picture shows.
//   action    optional { label, href }: a button that closes the popup and goes
//             there (a page in this site, never an outside link).

/** Days an entry stays live after its ship date (owner's decision 2026-11-11: two weeks, then retired). */
export const LIVE_DAYS = 14;

export type WhatsNewAudience = 'student' | 'teacher' | 'all';

export interface WhatsNewEntry {
  id: string;
  date: string;
  audience: WhatsNewAudience;
  title: string;
  summary: string;
  steps?: string[];
  media?: { poster: string; clip?: string; alt: string };
  action?: { label: string; href: string };
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: '2026-11-groups-channels',
    date: '2026-11-14',
    audience: 'student',
    title: 'Group chats and class channels',
    summary:
      'Messages now has groups and channels, like Discord. Make a group with up to 8 people from your class, or post in your class’s channels. ' +
      'Messages is also a full page now, and Issues moved into the envelope. Your teacher can read groups and channels.',
    steps: [
      'Click the envelope, then Group or Channel to make one. Every class has #general.',
      'Pick the people (for a group) or a name (for a channel), then press Make.',
      'The arrows button at the top of the envelope opens Messages as a full page.',
    ],
    media: {
      clip: '/whats-new/2026-11-groups-channels.mp4',
      poster: '/whats-new/2026-11-groups-channels.jpg',
      alt: "Sam makes a group called Maze team with Alex and writes 'Who wants to build the maze?'. On Alex's screen the envelope shows 1, and Alex opens the Maze team group and sees Sam's message.",
    },
  },
  {
    id: '2026-11-message-levels',
    date: '2026-11-14',
    audience: 'teacher',
    title: 'Groups, channels, and turning messages off',
    summary:
      'Students can now make group chats and class channels. On the class page’s Messages panel, set student messages for the whole class, or for one student: ' +
      'On, Teacher only (they can only message you), or Off (they can read but not send). Lock or delete channels from your mailbox.',
    steps: [
      'Open your class, then the Students tab, and scroll to Messages.',
      'Choose On, Teacher only or Off for the class, or next to one student.',
      'Groups are listed there to read; channels are in your envelope and on the Messages page.',
    ],
    media: {
      poster: '/whats-new/2026-11-message-levels.jpg',
      alt: "The Messages panel on the class page: a menu for student messages in the class set to On, and a menu next to each student, one of them set to Off, above the class's conversations and groups.",
    },
  },
  {
    id: '2026-11-send-program',
    date: '2026-11-14',
    audience: 'student',
    title: 'Send your sandbox program to a classmate',
    summary:
      'In the sandbox, Share then Send to… puts your program in a message. Send a copy they can run and remix, ' +
      'or, while you Code together, invite them to join you or just to watch live as you type.',
    steps: [
      'In the sandbox, click Share, then Send to….',
      'Pick a classmate or your teacher, choose what to send, and press Send.',
      'They open it from the envelope: Open runs a copy, Join codes with you, Watch shows your typing.',
    ],
    media: {
      clip: '/whats-new/2026-11-send-program.mp4',
      poster: '/whats-new/2026-11-send-program.jpg',
      alt: "Sam sends a copy of a moSHion sketch to Alex with the note 'Try my sketch!'. On Alex's screen a 1 appears on the envelope, and Alex's mailbox shows the note and a card with an Open button.",
    },
  },
  {
    id: '2026-11-messages',
    date: '2026-11-13',
    audience: 'student',
    title: 'Messages: write to your teacher and classmates',
    summary:
      'The envelope at the top of every page is now your mailbox. Send a message to your teacher or to a classmate, and read their replies there. ' +
      'Your teacher can read messages between classmates, and messages with phone numbers, addresses or emails are not sent.',
    steps: [
      'Click the envelope at the top right, then New message.',
      'Pick a person from your class, type your message and press Enter to send it.',
      'A number on the envelope means someone wrote to you. Click it to read and reply.',
    ],
    media: {
      clip: '/whats-new/2026-11-messages.mp4',
      poster: '/whats-new/2026-11-messages.jpg',
      alt: "Sam opens the mailbox, picks Alex and sends 'Build a game together after lunch?'. On Alex's screen a 1 appears on the envelope, and Alex's mailbox shows Sam's new message.",
    },
  },
  {
    id: '2026-11-class-messages',
    date: '2026-11-13',
    audience: 'teacher',
    title: 'Messages with your students',
    summary:
      'Students can message you and their classmates from the envelope at the top of every page. ' +
      "Your class page's Messages panel lists every conversation between two of your students: read them, remove a message, pause a student, " +
      'or turn classmate messages off.',
    steps: [
      'Open a class, then the Students tab, and scroll to Messages.',
      'Press Read on a conversation. Remove hides a message from students ("Removed by a teacher"); Put back undoes it.',
      'Untick "Students can message classmates" to turn it off. Students can still message you.',
    ],
    media: {
      clip: '/whats-new/2026-11-class-messages.mp4',
      poster: '/whats-new/2026-11-class-messages.jpg',
      alt: "The class page's Messages panel: the teacher reads a conversation between Maya and Leo, removes one message, then turns messages between classmates off.",
    },
  },
  {
    id: '2026-11-texture-one-name',
    date: '2026-11-13',
    audience: 'student',
    title: 'One name for your art: .texture',
    summary:
      "In moSHion, .texture now does everything for a sprite's picture or animation: pick it with sprite.texture = 'coinSpin', " +
      'then control it with the same name, like sprite.texture.frameDelay for the speed and sprite.texture.loop = false to play it once. ' +
      'Code that uses .ani still works.',
    steps: [
      "Check which one is showing with sprite.texture.name === 'coinSpin' (not sprite.texture === 'coinSpin').",
      'Setting the same texture again no longer restarts it, so it is safe to set it every frame. Use sprite.texture.frame = 0 to play it again.',
      "It works for textures from the Textures tab and for animations made with addAni: sprite.texture = 'run' switches to your 'run' animation.",
    ],
    media: {
      clip: '/whats-new/2026-11-texture-one-name.mp4',
      poster: '/whats-new/2026-11-texture-one-name.jpg',
      alt: 'A moSHion sketch: a coin spins slowly, and a heart plays its animation once and stops, then plays again when Space is pressed.',
    },
    action: { label: 'Open the Sandbox', href: '/sandbox' },
  },
  {
    id: '2026-11-stars-family',
    date: '2026-11-12',
    audience: 'student',
    title: 'Star games and see their family tree',
    summary:
      "Press Star on a classmate's game to tell them you like it. Every game you star waits for you in the Library's Starred list. " +
      'Under a game, its family tree shows who remixed it, when, and from which version, drawn as a flowchart.',
    steps: [
      'Open a game from Class games and press Star beside Run. Press the number to see who starred it.',
      'Open Learn, then Library, then Games, to find every game you starred under Starred.',
      'Scroll down under a game to its Family tree, and click a box to play that remix.',
    ],
    media: {
      clip: '/whats-new/2026-11-stars-family.mp4',
      poster: '/whats-new/2026-11-stars-family.jpg',
      alt: "Alex stars Sam's game Spike Run, sees the count go to 1, then scrolls to its family tree: Spike Run at the top with arrows down to Alex's and Maya's remixes.",
    },
    action: { label: 'Open the Library', href: '/library?tab=games' },
  },
  {
    id: '2026-11-fonts',
    date: '2026-11-11',
    audience: 'student',
    title: 'Fonts for your sketches',
    summary:
      "The words in your moSHion sketches can now use 15 built-in fonts, from pixel and arcade to handwriting, with textFont('name'). " +
      'You can also add a font file of your own, or draw your own font letter by letter in the Font maker, then use it in any sketch and share it with your class.',
    steps: [
      "Open Learn, then Fonts, to see every font and copy its textFont('name') line.",
      'Press Make a font, pick a letter, draw it with the pen, shapes, grid squares or curves, then press Save font.',
      "In a sketch, call textFont('name') before text(). textWeight(), textOutline() and textWrap() change how it looks.",
    ],
    media: {
      clip: '/whats-new/2026-11-fonts.mp4',
      poster: '/whats-new/2026-11-fonts.jpg',
      alt: 'Sam draws a letter A with three lines and an O with an ellipse in the Font maker, then types AOA OAO and sees the words in his own font.',
    },
    action: { label: 'Open Fonts', href: '/fonts' },
  },
  {
    id: '2026-11-sandbox-projects',
    date: '2026-11-11',
    audience: 'student',
    title: 'Many projects in the Sandbox',
    summary:
      'The Sandbox now holds many projects at once, each with its own name, type and code, and Remix opens a game as a new project ' +
      'instead of replacing yours. Your list follows you to any computer you sign in on; press Save in a project to take its code too.',
    steps: [
      "In the Sandbox, press the button with your project's name at the top left, then New project.",
      'Pick a type, give it a name, and press Make project. Pick any project in the list to switch to it.',
      'Use More beside a project to rename it, make a copy or delete it. You can keep up to 30.',
    ],
    media: {
      clip: '/whats-new/2026-11-sandbox-projects.mp4',
      poster: '/whats-new/2026-11-sandbox-projects.jpg',
      alt: 'Sam opens the project list, makes a JavaScript project called Hello names and runs it, then switches back to the moSHion sandbox, whose code is just as it was.',
    },
    action: { label: 'Open the Sandbox', href: '/sandbox' },
  },
  {
    id: '2026-11-undo-restore',
    date: '2026-11-11',
    audience: 'student',
    title: 'Undo a restore from History',
    summary:
      'Restoring an older version no longer throws away the code you had. History keeps it first as a version called ' +
      '"Before restoring", so if you picked the wrong one you can restore your code straight back.',
    steps: [
      'Press History, pick a version, and press Restore this version.',
      'Changed your mind? Open History again and restore the version called Before restoring.',
    ],
    media: {
      poster: '/whats-new/2026-11-undo-restore.jpg',
      alt: 'Version history with a new version at the top called Before restoring, holding the code that was there before the restore.',
    },
  },
  {
    id: '2026-11-text-layer',
    date: '2026-11-11',
    audience: 'student',
    title: 'Text between sprites',
    summary:
      'In moSHion, textLayer(n) gives text a layer, the way a sprite has one: the words are drawn over sprites on that layer or lower ' +
      'and under the higher ones. Before, text written in draw() always sat under every sprite.',
    steps: [
      'Give your sprites layers, for example player.layer = 1 and tree.layer = 10.',
      'In draw(), write textLayer(5) before text(...) to put the words between them.',
      'Write textLayer() with nothing in the brackets to put text back under every sprite.',
    ],
    media: {
      clip: '/whats-new/2026-11-text-layer.mp4',
      poster: '/whats-new/2026-11-text-layer.jpg',
      alt: 'A blue square slides across the words "Welcome to the forest": the words are drawn over the square, and the green tree is drawn over the words.',
    },
    action: { label: 'Read about textLayer()', href: '/docs/moshion/text' },
  },
  {
    id: '2026-11-propose-changes',
    date: '2026-11-10',
    audience: 'student',
    title: "Propose a change to a classmate's game",
    summary:
      "Remix a classmate's game, make it better, and send your change back. They see exactly what you changed, can try it " +
      'and talk it over with you, and can accept it into their game with your name on it. It is how programmers work together on GitHub.',
    steps: [
      "In Library, Games, press Remix on a classmate's game, then change it in the Sandbox.",
      'Press Propose change, say what you changed, and send it. Updating your own game now asks what you changed and keeps a History.',
      'Find answers under Proposed changes in your Library, and join the conversation. Your teacher can read every conversation.',
    ],
    media: {
      clip: '/whats-new/2026-11-propose-changes.mp4',
      poster: '/whats-new/2026-11-propose-changes.jpg',
      alt: "Kai sends a change to Nia's game from the Sandbox; on Nia's screen the change appears in the Library, Nia opens it and presses Accept.",
    },
    action: { label: 'Open the Games library', href: '/library' },
  },
  {
    id: '2026-11-teacher-game-changes',
    date: '2026-11-10',
    audience: 'teacher',
    title: "Students can propose changes to each other's games",
    summary:
      "A student who remixes a classmate's game can propose the change back, with a conversation any classmate can join. " +
      "It is the one place in the Games library where students type to each other, so every conversation is on the class's Students tab for you.",
    steps: [
      'Open Teach, then Classes, and pick a class.',
      'On the Students tab, scroll to Proposed changes to games. Newest comments shows what students wrote.',
      'Press View to open a conversation, where you can delete a comment, close the conversation or remove the proposal.',
    ],
    media: {
      poster: '/whats-new/2026-11-teacher-game-changes.jpg',
      alt: "The class page's Proposed changes to games panel, listing the newest comments students wrote, each with a View link.",
    },
  },
  {
    id: '2026-11-save-to-account',
    date: '2026-11-10',
    audience: 'student',
    title: 'Save to your account',
    summary:
      'A moSHion game can now keep a high score or a level in your shCode account, so it is still there on another computer. ' +
      "Add 'remote' when you save and load.",
    steps: [
      "save('best', score, 'remote') keeps a value in your account.",
      "load('best', 'remote') reads it back on any computer where you are signed in.",
      "Or use saved('player', { best: 0 }, 'remote') and call player.save() after you change it.",
    ],
    media: {
      clip: '/whats-new/2026-11-save-to-account.mp4',
      poster: '/whats-new/2026-11-save-to-account.jpg',
      alt: 'One student on two computers side by side: the game reads Plays: 1 on the first, then Plays: 2 on the second.',
    },
    action: { label: 'Read Saving to your account', href: '/docs/moshion/persistence?page=2' },
  },
  {
    id: '2026-11-game-suggestions',
    date: '2026-11-10',
    audience: 'student',
    title: "Suggest ideas for a classmate's game",
    summary:
      "When you play a classmate's game, you can pick suggestions like \"Add more obstacles\" or \"Make it harder\" to help them make it better. " +
      'On your own games, you see what players picked.',
    steps: [
      'Open Learn, then Library, and play a game from Class games.',
      'Under the game, pick any suggestions that fit. Pick one again to take it back.',
      'Open your own game to see what your classmates suggested.',
    ],
    media: {
      clip: '/whats-new/2026-11-game-suggestions.mp4',
      poster: '/whats-new/2026-11-game-suggestions.jpg',
      alt: "Two screens: Alex picks Add more obstacles and So fun! under Sam's game, and Sam sees both with Alex's name.",
    },
    action: { label: 'Open the Library', href: '/library?tab=games' },
  },
  {
    id: '2026-11-pictures-that-move',
    date: '2026-11-10',
    audience: 'student',
    title: 'Pictures that move, and your own pictures',
    summary:
      'The Library has 21 new built-in animations, like a spinning coin, a blinking heart and a waving flag. ' +
      'In the Texture editor, Import picture brings in a picture from your computer.',
    steps: [
      'Open the Library, pick Pictures, and click an animation to see each of its frames.',
      "Copy code gives you the line that uses it, like sprite.texture = 'coinSpin';",
      'In the Texture editor, press Import picture. A big picture shrinks to fit 64 by 64; press Save to keep it.',
    ],
    media: {
      clip: '/whats-new/2026-11-pictures-that-move.mp4',
      poster: '/whats-new/2026-11-pictures-that-move.jpg',
      alt: "The Library's spinning coin shown frame by frame, then a picture imported into the Texture editor's grid.",
    },
    action: { label: 'Open the Library', href: '/library?tab=pictures' },
  },
  {
    id: '2026-11-library-cleanup',
    date: '2026-11-10',
    audience: 'teacher',
    title: 'Tidy up the class Library',
    summary:
      "From a class's Students tab you can delete a game, picture or sound a student shared, clear a student's whole Library, " +
      'and clear the suggestions students picked on a class game.',
    steps: [
      'Open Teach, then Classes, pick a class, and open the Students tab.',
      "Under Shared games or Shared textures and sounds, open a row's menu to Delete it or Clear suggestions.",
      "In a student's row menu, Clear Library… deletes everything they saved, after you confirm.",
    ],
    media: {
      clip: '/whats-new/2026-11-library-cleanup.mp4',
      poster: '/whats-new/2026-11-library-cleanup.jpg',
      alt: "A class's Shared games list: a game's menu offers Clear suggestions, and the confirm says what goes.",
    },
    action: { label: 'Open my classes', href: '/teacher' },
  },
  {
    id: '2026-11-your-task-tab',
    date: '2026-11-10',
    audience: 'student',
    title: '"Your task" is a yellow tab on the left',
    summary:
      'In a lab, the steps now open from a yellow Your task tab on the left edge of the screen, right beside your code. ' +
      'The Steps tab on the right is gone, because it showed the same steps.',
    steps: [
      'Open a lab and press the yellow Your task tab on the left to show or hide the steps.',
      'The page remembers whether you left the steps open or closed.',
    ],
    media: {
      poster: '/whats-new/2026-11-your-task-tab.jpg',
      alt: 'A lab with the yellow Your task tab on the left edge of the screen and the lab\'s steps open beside the code.',
    },
  },
  {
    id: '2026-11-share-your-way',
    date: '2026-11-09',
    audience: 'student',
    title: 'Choose how classmates use what you share',
    summary:
      'When you share a game, picture or sound, you pick who can do what with it: just play it, remix it and give you credit, ' +
      'keep remixes open, or free for anyone. A remix of an open game says who made the first one.',
    steps: [
      'In the moSHion Sandbox, press Publish game and tick Share with my class.',
      'Under Who can do what with it, pick one. The game page shows your choice.',
      'If your game uses your own pictures or sounds, share them too, so classmates see the game as you made it.',
    ],
    media: {
      clip: '/whats-new/2026-11-share-your-way.mp4',
      poster: '/whats-new/2026-11-share-your-way.jpg',
      alt: 'Publishing a game with "keep remixes open" picked; its game page then shows that choice.',
    },
    action: { label: 'Open the Sandbox', href: '/sandbox' },
  },
  {
    id: '2026-11-code-together',
    date: '2026-11-08',
    audience: 'student',
    title: 'Code together',
    summary:
      'Write one Sandbox program with up to 3 classmates at the same time, in JavaScript or moSHion. ' +
      "Everyone's cursor has its own colour and name, so you can see who is typing where.",
    steps: [
      'Open the Sandbox, pick JavaScript or moSHion, and press Code together.',
      "Press Start and tell your classmates your 4 pictures, or join a classmate's session from Open sessions.",
      'Your code and who is here show on the Code together button; click it to Leave when you are done. You keep a copy, and your teacher can see programs you write together.',
    ],
    media: {
      clip: '/whats-new/2026-11-code-together.mp4',
      poster: '/whats-new/2026-11-code-together.jpg',
      alt: 'Two students type in the same Sandbox program side by side, each with a coloured cursor and a name tag.',
    },
    action: { label: 'Open the Sandbox', href: '/sandbox' },
  },
  {
    id: '2026-11-class-together-panels',
    date: '2026-11-08',
    audience: 'teacher',
    title: 'See what your class made together',
    summary:
      "A class's Students tab now has Code together sessions: every Sandbox program your students wrote together in the " +
      'last 30 days, who was in it, and the program itself. Shared games lists the games students shared with the class.',
    steps: [
      'Open Teach, then Classes, and pick a class.',
      'On the Students tab, scroll to Code together sessions and press View program.',
      'Under Shared games, press Hide or Remove on any game that should not be there.',
    ],
    media: {
      clip: '/whats-new/2026-11-class-together-panels.mp4',
      poster: '/whats-new/2026-11-class-together-panels.jpg',
      alt: "A class's Students tab with the Code together sessions panel open on a program two students wrote.",
    },
    action: { label: 'Open my classes', href: '/teacher' },
  },
  {
    id: '2026-11-sandbox-timers',
    date: '2026-11-08',
    audience: 'student',
    title: 'Timers work in the Sandbox',
    summary:
      'In the JavaScript Sandbox, setTimeout and setInterval now run, so a message can appear a second later. ' +
      'A program keeps running while a timer is waiting (up to 30 seconds). Press Stop to end it sooner.',
    media: {
      poster: '/whats-new/2026-11-sandbox-timers.jpg',
      alt: 'The JavaScript Sandbox output showing lines printed one second apart by setInterval.',
    },
    action: { label: 'Open the Sandbox', href: '/sandbox' },
  },
  {
    id: '2026-11-realtime-play',
    date: '2026-11-07',
    audience: 'student',
    title: 'Real-time online games',
    summary:
      'Make a moSHion game where you and a classmate move at the same time on two computers. ' +
      "Your sprite glides around on the other player's screen as you steer it.",
    steps: [
      "In setup(), write multiplayer('coop', 2, { realtime: true });",
      'Then online.share(me); sends your sprite to the other computer.',
      "The other player's sprite is in online.peers. Try it alone with a second browser tab.",
    ],
    media: {
      clip: '/whats-new/2026-11-realtime-play.mp4',
      poster: '/whats-new/2026-11-realtime-play.jpg',
      alt: 'Two browser windows side by side: a square steered in one moves in the other at the same moment.',
    },
    action: { label: 'Read Real-time play', href: '/docs/moshion/multiplayer?page=6' },
  },
  {
    id: '2026-11-games-library',
    date: '2026-11-07',
    audience: 'student',
    title: 'The Games library',
    summary:
      'Publish a game you made in the moSHion Sandbox and play the games your classmates made. ' +
      'Trail, Checkers and Quest are built in, ready to play with a classmate.',
    steps: [
      'In the moSHion Sandbox, press Publish game, give it a title and share it with your class.',
      'Open Learn, then Library, and find Games. Press Play on any game.',
      "Press Remix to copy a classmate's game into your own Sandbox and change it.",
    ],
    media: {
      clip: '/whats-new/2026-11-games-library.mp4',
      poster: '/whats-new/2026-11-games-library.jpg',
      alt: 'The Games part of the Library: built-in Trail, Checkers and Quest, and a Play button that opens a game.',
    },
    action: { label: 'Open the Library', href: '/library' },
  },
  {
    id: '2026-11-multiplayer',
    date: '2026-11-07',
    audience: 'student',
    title: 'Games for 2 to 4 players',
    summary:
      'One line in setup() turns your moSHion game into a game for 2 to 4 players: take turns at one keyboard, ' +
      'or play a classmate on another computer.',
    steps: [
      "multiplayer('local', 2) takes turns at one keyboard.",
      "multiplayer('versus', 2) or multiplayer('coop', 2) puts a bar above your game. Press Host a room.",
      'Your classmate joins by clicking your 4 pictures, or picks your room from Open rooms.',
    ],
    media: {
      clip: '/whats-new/2026-11-multiplayer.mp4',
      poster: '/whats-new/2026-11-multiplayer.jpg',
      alt: 'A moSHion game with the online bar above it: Host a room shows 4 pictures, and a second player joins.',
    },
    action: { label: 'Read Multiplayer', href: '/docs/moshion/multiplayer' },
  },
  {
    id: '2026-11-library',
    date: '2026-11-07',
    audience: 'student',
    title: 'Your Library: built-in art, Remix and sharing',
    summary:
      'The Library keeps your saved textures and sounds, and they now follow you to any computer you sign in on. ' +
      'It also has lots of built-in ones, and you can share yours with your class.',
    steps: [
      'Open Learn, then Library.',
      'Under Built in, press Remix to make your own copy of a texture or sound and change it.',
      'Press Share with class on one of yours. Classmates press Copy to mine to use it.',
    ],
    media: {
      clip: '/whats-new/2026-11-library.mp4',
      poster: '/whats-new/2026-11-library.jpg',
      alt: 'The Library page: the Built in textures, and Remix opening a copy in the Texture editor.',
    },
    action: { label: 'Open the Library', href: '/library' },
  },
  {
    id: '2026-11-appearance',
    date: '2026-11-07',
    audience: 'all',
    title: 'Pick your look',
    summary:
      'Choose a theme for the whole site: Dark, Light, Candy, Retro arcade or Forest. You can also pick an accent ' +
      'colour, a font and a home page background. Your choice is saved with your account.',
    steps: [
      'Open your name in the top right, then My account.',
      'Under Appearance, click a theme. The site changes straight away.',
    ],
    media: {
      clip: '/whats-new/2026-11-appearance.mp4',
      poster: '/whats-new/2026-11-appearance.jpg',
      alt: 'The Appearance settings on My account, switching the site from Dark to Light, Candy and Retro arcade.',
    },
    action: { label: 'Open My account', href: '/account' },
  },
];
