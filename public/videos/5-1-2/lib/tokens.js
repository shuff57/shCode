// tokens.js: the ONE theme file for the shCode moSHion explainer family (proposed template, see ../../STYLE.md).
// Everything that has a colour or a typeface reads it from here: the CSS custom properties on :root (engine.css),
// the SVG palette COL (engine.js), the code-panel syntax colours, the moSHion stage, the character's baked raster
// colours and the character's effect colours (director.js / kg-character.js).
//
// Only `dark` exists today (shCode's Dracula look). To add a light variant later, add `themes.light` with the same
// keys; engine.js shows the light/dark button only when more than one theme is defined.
'use strict';
(function () {
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  // Dracula, as shCode uses it (components/CodeMirrorPane.tsx, CLAUDE.md "Muted text on the dark theme is #8393c4").
  const D = {
    bg: '#282a36', panel: '#1e1f29', raised: '#44475a', text: '#f8f8f2',
    muted: '#8393c4',          // secondary text: 4.7:1 on bg
    border: '#6272a4',         // borders and decoration ONLY (3.0:1, never text)
    purple: '#bd93f9', pink: '#ff79c6', green: '#50fa7b', cyan: '#8be9fd', yellow: '#f1fa8c', orange: '#ffb86c', red: '#ff5555',
  };
  window.PM_TOKENS = {
    default: 'dark',
    font: {
      ui: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", Consolas, ui-monospace, monospace',
      faces: ['400 30px "Inter"', '500 30px "Inter"', '600 30px "Inter"', '400 30px "JetBrains Mono"', '700 30px "JetBrains Mono"'],
    },
    themes: {
      dark: {
        // CSS custom properties (engine.css reads only these names)
        css: {
          page: D.panel, board: D.bg, panel: D.panel, edge: D.raised, soft: D.panel, raised: D.raised, border: D.border,
          chalk: D.text, dim: D.muted, faint: D.border,
          task: D.orange, quiz: D.purple, good: D.green, bad: D.red, accent: D.purple, 'on-accent': D.bg,
          scrim: 'rgba(40, 42, 54, .86)', shadow: 'rgba(0, 0, 0, .5)', boxbg: 'rgba(189, 147, 249, .08)', boxfocus: 'rgba(189, 147, 249, .18)',
          'cap-bg': 'rgba(30, 31, 41, .92)', 'cap-edge': D.raised, 'cap-text': D.text,
        },
        // SVG palette (COL). The first block keeps the engine's historical key names working; the second is the Dracula set by name.
        col: {
          nat: D.orange, whole: D.cyan, int: D.yellow, rat: D.pink, irr: D.green, real: D.purple,
          chalk: D.text, dim: D.muted, faint: D.border, task: D.orange, good: D.green, bad: D.red, board: D.bg,
          tile: D.border, accent: D.purple, panel: D.panel, wash: D.purple,
          raised: D.raised, border: D.border, text: D.text, muted: D.muted,
          purple: D.purple, pink: D.pink, green: D.green, cyan: D.cyan, yellow: D.yellow, orange: D.orange, red: D.red,
        },
        // Code panel: the same tags and colours as shCode's editor (draculaHighlight in components/CodeMirrorPane.tsx).
        syntax: {
          keyword: D.pink,        // function, new, let, if ...
          fn: D.green,            // function names (definitions and calls)
          cls: D.cyan,            // class names after `new` (Canvas, Sprite): cyan italic, as lezer tags NewExpression/VariableName
          num: D.purple, str: D.yellow, punct: D.text, ident: D.text, op: D.pink,
          comment: D.muted,       // the editor uses #6272a4 for comments; on video, text must clear 4.5:1, so muted
          gutter: D.muted, lineBg: D.raised, lineMark: D.purple, bg: D.panel, edge: D.raised, tab: D.bg,
        },
        // The moSHion stage, drawn to look like public/moshion/runner.html: a new Canvas(w, h) is transparent over the
        // runner page's #111, and a new Sprite(x, y) is a 50x50 'deeppink' square with no stroke (moshion.js Sprite()).
        // MS fix round: the run pictures are the student's preview pane (runner.html: a #111 page, the canvas centred in it, and
        // "Click Run to execute your sketch." until the first run). The runner writes that line in #666 (3.3:1 on #111); the video
        // uses muted (6.2:1), the course's own text rule.
        stage: { bg: '#111111', sprite: '#ff1493', grid: D.text, gridA: .07, gridMajorA: .15, outline: D.border, tick: D.muted, x: D.cyan, y: D.orange,
                 pane: '#111111', paneEdge: D.raised, empty: D.muted },
        // shCode's Run button. MS fix round (owner decision): the VIDEO draws it #15803d (white text 5.0:1), hover #166534 (7.1:1),
        // pressed #14532d (9.1:1); the app's .btn-run is still #22c55e (white text 2.3:1). runWord is the green WORD "Run" on the
        // end card: #22c55e as text on the stage is 6.3:1, where #15803d would be 2.8:1. The pointer is text-coloured with a
        // stage-coloured edge. ghost is every dashed video helper (the faint square, the canvas edge, the size outline).
        app: { run: '#15803d', runHover: '#166534', runDown: '#14532d', runText: '#ffffff', runWord: '#22c55e',
               cursor: D.text, cursorEdge: D.bg, ghost: D.muted, cycle: D.raised },
        // The character. Rasters are baked, so colours are chosen here, before drawing (kg-character.js frames()).
        char: {
          plate: hex(D.bg), stroke: hex(D.text), hair: [196, 138, 92], shirt: hex(D.purple), pants: hex(D.border), blush: [255, 121, 198], sweat: hex(D.cyan), gold: hex(D.yellow),
          fx: { stroke: D.text, ink: D.text, 'ink-soft': D.muted, blue: D.cyan, ember: D.orange, rule: D.border, plate: D.bg, gold: D.yellow, 'gold-hot': '#fffbd0', smoke: D.border },
        },
      },
    },
  };
})();
// Apply the default theme's CSS custom properties at once, before the engine builds the frame, so nothing paints uncoloured.
(function () {
  const T = window.PM_TOKENS, css = T.themes[T.default].css, rs = document.documentElement.style;
  for (const k in css) rs.setProperty('--' + k, css[k]);
  rs.setProperty('--ui', T.font.ui); rs.setProperty('--mono', T.font.mono);
})();
