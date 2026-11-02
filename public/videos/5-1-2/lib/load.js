// load.js: loads the whole lib in the one frozen order, so a page never lists scripts.
// moshion-5.1.2-style copy: tokens.js first (the theme file every other file reads), no change to the rest of the order.
(function () {
  const me = document.currentScript.src, base = me.replace(/[?#].*$/, '').replace(/[^/]*$/, ''), q = (me.match(/\?[^#]*/) || [''])[0];
  window.PM = window.PM || { type: 'explainer' };
  ['tokens.js', 'kg-sketch.js', 'kg-character.js', 'brand.js', 'engine.js', 'i18n.js', 'director.js', 'lesson.js', 'graph.js', 'slope.js', 'checks.js']
    .forEach(f => document.write(`<script src="${base}${f}${q}"><\/script>`));
})();
