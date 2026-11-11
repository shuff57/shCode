#!/usr/bin/env python3
"""CODY's faces (the /api/ai-help tutor's avatar, #88): an original robot of
our own (a screen-face head, side bolts, a pink antenna lamp), one SVG per
feeling, written to public/cody/<feeling>.svg (48x48). components/CodyAvatar.tsx
says which face shows when. Edit a face here and run:

    python3 scripts/make-cody-faces.py

These stand in until the student who asked for CODY's look (#88) sends their
own drawings; theirs replace the paths in CodyAvatar.tsx, not this script."""
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'cody')
CYAN, PINK, PURPLE, GREEN, YELLOW, ORANGE, RED, FG = '#8be9fd', '#ff79c6', '#bd93f9', '#50fa7b', '#f1fa8c', '#ffb86c', '#ff5555', '#f8f8f2'

STYLE = """
  <style>
    .lamp { animation: glow 3.2s ease-in-out infinite; }
    .blink { transform-box: fill-box; transform-origin: center; animation: blink 4.5s infinite; }
    .bob { animation: bob 2.6s ease-in-out infinite; }
    .spin { transform-box: fill-box; transform-origin: center; animation: spin 1.6s linear infinite; }
    .pulse { transform-box: fill-box; transform-origin: center; animation: pulse 1.2s ease-in-out infinite; }
    .dot { animation: dots 1.2s ease-in-out infinite; } .d2 { animation-delay: .2s; } .d3 { animation-delay: .4s; }
    .float { animation: float 2.4s ease-in-out infinite; } .f2 { animation-delay: .8s; }
    .twinkle { animation: glow 0.9s ease-in-out infinite; }
    @keyframes glow { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
    @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
    @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { transform: scale(.9); } 50% { transform: scale(1.1); } }
    @keyframes dots { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
    @keyframes float { 0% { opacity: 0; transform: translate(0, 2px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(2px, -5px); } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>"""


def face(name, note, inner, lamp=PINK, lamp_class='lamp', extra_back='', screen='#282a36'):
    """The head every feeling shares; `inner` draws the eyes, mouth and extras on the screen."""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <!-- CODY, {name}: {note} Our own design (shCode #88), from scripts/make-cody-faces.py. -->{STYLE}
  {extra_back}<g class="bob">
    <line x1="24" y1="10" x2="24" y2="5" stroke="{PURPLE}" stroke-width="2" stroke-linecap="round"/>
    <circle class="{lamp_class}" cx="24" cy="3.6" r="2.6" fill="{lamp}"/>
    <rect x="2" y="21" width="4" height="9" rx="2" fill="{PURPLE}"/>
    <rect x="42" y="21" width="4" height="9" rx="2" fill="{PURPLE}"/>
    <rect x="5" y="10" width="38" height="31" rx="11" fill="{screen}" stroke="{PURPLE}" stroke-width="2"/>
    <rect x="9" y="14" width="30" height="23" rx="7" fill="#1e1f29"/>
    {inner}
  </g>
</svg>
"""


def eye_round(cx, cy=23, r=3.4, color=CYAN, blink=True):
    return f'<circle class="{"blink" if blink else ""}" cx="{cx}" cy="{cy}" r="{r}" fill="{color}"/>'


def arc_eye(cx, cy=24, up=True, color=CYAN, w=3.4):
    # ^ for happy (up=True) or a gentle closed curve
    d = f'M{cx - w} {cy + 1.5} Q{cx} {cy - 3} {cx + w} {cy + 1.5}' if up else f'M{cx - w} {cy - 1} Q{cx} {cy + 3} {cx + w} {cy - 1}'
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2.2" stroke-linecap="round"/>'


def star(cx, cy, r=4, color=YELLOW, cls='pulse'):
    import math
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.45
        a = -math.pi / 2 + i * math.pi / 5
        pts.append(f'{cx + rr * math.cos(a):.2f},{cy + rr * math.sin(a):.2f}')
    return f'<polygon class="{cls}" points="{" ".join(pts)}" fill="{color}"/>'


def mouth(d, color=CYAN, w=2):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'


FACES = [
    ('idle', 'Ready when you are', 'calm eyes, small smile, blinks now and then', 'The panel is open and waiting',
     face('idle', 'calm, blinking.', eye_round(18) + eye_round(30) + mouth('M20 31 Q24 33.5 28 31'))),
    ('thinking', 'Thinking…', 'eyes look up, loading dots, lamp blinks', 'An answer is streaming in',
     face('thinking', 'looking up, loading dots.',
          eye_round(19.5, 21, 3, blink=False) + eye_round(31.5, 21, 3, blink=False)
          + f'<circle class="dot" cx="19" cy="31" r="1.6" fill="{CYAN}"/><circle class="dot d2" cx="24" cy="31" r="1.6" fill="{CYAN}"/><circle class="dot d3" cx="29" cy="31" r="1.6" fill="{CYAN}"/>',
          lamp=YELLOW, lamp_class='twinkle')),
    ('answered', 'Here is what I found', 'happy ^ ^ eyes, big smile, rosy cheeks', 'An answer is on screen',
     face('answered', 'happy eyes, smile, cheeks.',
          arc_eye(18) + arc_eye(30)
          + mouth('M18.5 29.5 Q24 35 29.5 29.5')
          + f'<circle cx="13.5" cy="29" r="2" fill="{PINK}" opacity=".55"/><circle cx="34.5" cy="29" r="2" fill="{PINK}" opacity=".55"/>')),
    ('excited', 'Ooh, nice!', 'star eyes, open grin, sparks off the lamp', 'Your code ran with no errors / a big step done',
     face('excited', 'star eyes, sparks.',
          star(18, 23) + star(30, 23)
          + f'<path d="M19 29 Q24 36 29 29 Z" fill="{CYAN}"/>',
          lamp=YELLOW, lamp_class='twinkle',
          extra_back=f'<path class="twinkle" d="M14 4 l1.5 2 M34 4 l-1.5 2 M10 8 l2 1 M38 8 l-2 1" stroke="{YELLOW}" stroke-width="1.4" stroke-linecap="round"/>')),
    ('curious', 'Tell me more', 'one eye bigger, head-tilt mouth', 'A question CODY needs more detail on',
     face('curious', 'one eye wide, small o mouth.',
          eye_round(18, 23, 2.6) + eye_round(30, 22.5, 4)
          + f'<path d="M14.5 17.5 L21 18.5" stroke="{CYAN}" stroke-width="1.6" stroke-linecap="round"/>'
          + f'<circle cx="24" cy="31" r="2" fill="none" stroke="{CYAN}" stroke-width="1.8"/>')),
    ('confused', 'Hmm, not sure', 'mismatched eyes, wavy mouth, question mark', 'CODY could not understand the question',
     face('confused', 'wavy mouth, question mark.',
          eye_round(18, 22, 3) + f'<path d="M27 24 L33 24" stroke="{CYAN}" stroke-width="2.4" stroke-linecap="round"/>'
          + mouth('M18 31 Q20 29 22 31 T26 31 T30 31'),
          extra_back=f'<text x="37" y="9" font-family="monospace" font-size="9" font-weight="700" fill="{YELLOW}" class="float">?</text>')),
    ('proud', 'You did it!', 'closed happy eyes, wide grin, confetti', 'A lab is complete / a test turned green',
     face('proud', 'big grin, confetti.',
          arc_eye(18, 23) + arc_eye(30, 23)
          + f'<path d="M17 28.5 Q24 36.5 31 28.5 Z" fill="{GREEN}"/>',
          lamp=GREEN,
          extra_back=f'<rect class="float" x="4" y="4" width="2.5" height="2.5" fill="{YELLOW}" transform="rotate(20 5 5)"/>'
                     f'<rect class="float f2" x="41" y="6" width="2.5" height="2.5" fill="{PINK}" transform="rotate(-15 42 7)"/>'
                     f'<circle class="float" cx="12" cy="3" r="1.3" fill="{CYAN}"/><circle class="float f2" cx="36" cy="2.5" r="1.3" fill="{GREEN}"/>')),
    ('oops', 'Oops, let me try again', 'sad eyes, small frown, sweat drop', 'Something went wrong getting an answer',
     face('oops', 'sad eyes, sweat drop.',
          eye_round(18, 24, 3, blink=False) + eye_round(30, 24, 3, blink=False)
          + f'<path d="M14 21 L21 18.5 M34 21 L27 18.5" stroke="{CYAN}" stroke-width="1.6" stroke-linecap="round"/>'
          + mouth('M20 32 Q24 29.5 28 32')
          + f'<path class="float" d="M36.5 15 q1.6 2.6 0 3.6 q-1.6 -1 0 -3.6 Z" fill="{CYAN}"/>',
          lamp=ORANGE)),
    ('surprised', 'Whoa!', 'wide eyes, O mouth, lamp flash', 'A surprising result, e.g. an error after a long run',
     face('surprised', 'wide eyes, O mouth.',
          f'<circle cx="18" cy="22.5" r="4.4" fill="none" stroke="{CYAN}" stroke-width="2"/><circle cx="18" cy="22.5" r="1.6" fill="{CYAN}"/>'
          f'<circle cx="30" cy="22.5" r="4.4" fill="none" stroke="{CYAN}" stroke-width="2"/><circle cx="30" cy="22.5" r="1.6" fill="{CYAN}"/>'
          f'<ellipse cx="24" cy="31.5" rx="2.4" ry="3" fill="{CYAN}"/>',
          lamp=YELLOW, lamp_class='twinkle')),
    ('sleepy', 'Napping (offline)', 'flat eyes, floating z’s, dim lamp', 'No connection / CODY is resting',
     face('sleepy', 'flat eyes, z z.',
          f'<path d="M14.5 24 L21.5 24 M26.5 24 L33.5 24" stroke="{CYAN}" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>'
          + mouth('M21 31 L27 31', color=CYAN),
          lamp='#6272a4', lamp_class='',
          extra_back=f'<text class="float" x="36" y="10" font-family="monospace" font-size="7" font-weight="700" fill="{PURPLE}">z</text>'
                     f'<text class="float f2" x="40" y="6" font-family="monospace" font-size="5" font-weight="700" fill="{PURPLE}">z</text>',
          screen='#21222c')),
    ('wink', 'Here’s a hint', 'one eye winks, sly smile', 'A hint (not the whole answer)',
     face('wink', 'wink and smirk.',
          eye_round(18, 23, 3.4, blink=False) + arc_eye(30, 24, up=False)
          + mouth('M19 30 Q25 33.5 29.5 29'))),
    ('focused', 'Reading your code', 'narrow eyes, straight mouth, a scan line', 'CODY is looking over the student’s code',
     face('focused', 'narrow eyes, scan line.',
          f'<rect x="14.5" y="21.5" width="7" height="3" rx="1.5" fill="{CYAN}"/><rect x="26.5" y="21.5" width="7" height="3" rx="1.5" fill="{CYAN}"/>'
          + mouth('M20 31 L28 31')
          + f'<rect x="9" y="17" width="30" height="1.4" fill="{GREEN}" opacity=".5"><animate attributeName="y" values="15;34;15" dur="2s" repeatCount="indefinite"/></rect>')),
]

for key, caption, look, when, svg in FACES:
    with open(os.path.join(OUT, f'{key}.svg'), 'w') as f:
        f.write(svg)
print('wrote', len(FACES), 'faces to public/cody/')
