// i18n.js: player text in Spanish, and the EN/ES switch. Loaded after engine.js; changes nothing unless a page asks.
//   CHAPTER.language = 'es'                      -> the player's own text (controls, help, cover) is Spanish
//   CHAPTER.language = 'fil'                     -> same, Filipino
//   CHAPTER.alt = { lang, href } or [ ... ]       -> one button per other language in the bar (EN, ES, FIL) that opens the same video there
// Wraps applyType (engine.js boot2 calls it once, before the cover text is set).
'use strict';
const I18N = {};
I18N.es = {
  'Paused. Press space or click to continue.': 'En pausa. Presiona espacio o haz clic para continuar.',
  'Keyboard shortcuts': 'Atajos de teclado', 'Playback': 'Reproducción', 'Lesson': 'Lección',
  'Play or pause': 'Reproducir o pausar', 'Previous or next step': 'Paso anterior o siguiente', 'Start over': 'Volver al inicio',
  'Captions on or off': 'Activar o desactivar subtítulos', 'Light or dark paper': 'Papel claro u oscuro',
  'Character (guide) on or off': 'Personaje (guía) activado o desactivado', 'Full screen': 'Pantalla completa', 'Show this list': 'Mostrar esta lista',
  'Press': 'Presiona', 'Space': 'Espacio', 'Home': 'Inicio', ' to close.': ' para cerrar.', ' to start, ': ' para empezar, ', ' for shortcuts.': ' para ver los atajos.',
  'Sound could not play. The lesson continues with the on-screen text.': 'No se pudo reproducir el sonido. El video continúa con el texto en pantalla.',
  'Play explainer': 'Reproducir video', 'Start lesson': 'Empezar lección',
  'Play or pause (space)': 'Reproducir o pausar (espacio)', 'Previous step (left arrow)': 'Paso anterior (flecha izquierda)',
  'Restart': 'Reiniciar', 'Restart lesson': 'Reiniciar lección', 'Adjust volume': 'Ajustar volumen', 'Volume (0 = muted)': 'Volumen (0 = silencio)', 'Volume': 'Volumen',
  'Character on or off (G)': 'Personaje activado o desactivado (G)', 'Light or dark paper (D)': 'Papel claro u oscuro (D)',
  'Keyboard shortcuts (?)': 'Atajos de teclado (?)', 'Captions (C)': 'Subtítulos (C)', 'All chapters': 'Todos los capítulos',
};

I18N.fil = {
  'Paused. Press space or click to continue.': 'Naka-pause. Pindutin ang space o mag-click para magpatuloy.',
  'Keyboard shortcuts': 'Mga shortcut sa keyboard', 'Playback': 'Pagpapatugtog', 'Lesson': 'Aralin',
  'Play or pause': 'I-play o i-pause', 'Previous or next step': 'Nakaraan o susunod na hakbang', 'Start over': 'Magsimulang muli',
  'Captions on or off': 'I-on o i-off ang caption', 'Light or dark paper': 'Maliwanag o madilim na papel',
  'Character (guide) on or off': 'I-on o i-off ang karakter (gabay)', 'Full screen': 'Buong screen', 'Show this list': 'Ipakita ang listahang ito',
  'Press': 'Pindutin ang', 'Space': 'Space', 'Home': 'Home', ' to close.': ' para isara.', ' to start, ': ' para magsimula, ', ' for shortcuts.': ' para sa mga shortcut.',
  'Sound could not play. The lesson continues with the on-screen text.': 'Hindi mapatugtog ang tunog. Magpapatuloy ang video gamit ang teksto sa screen.',
  'Play explainer': 'I-play ang video', 'Start lesson': 'Simulan ang aralin',
  'Play or pause (space)': 'I-play o i-pause (space)', 'Previous step (left arrow)': 'Nakaraang hakbang (kaliwang arrow)',
  'Restart': 'Ulitin', 'Restart lesson': 'Ulitin ang aralin', 'Adjust volume': 'Ayusin ang volume', 'Volume (0 = muted)': 'Volume (0 = naka-mute)', 'Volume': 'Volume',
  'Character on or off (G)': 'I-on o i-off ang karakter (G)', 'Light or dark paper (D)': 'Maliwanag o madilim na papel (D)',
  'Keyboard shortcuts (?)': 'Mga shortcut sa keyboard (?)', 'Captions (C)': 'Caption (C)', 'All chapters': 'Lahat ng kabanata',
};
const UI_STEP = { es: 'Ir al paso ', fil: 'Pumunta sa hakbang ' };
const I18N_ALT = { en: ['EN', 'Ver en inglés / View in English'], es: ['ES', 'Ver en español'], fil: ['FIL', 'Panoorin sa Filipino'] };
function localizeShell() {
  const D = I18N[CHAPTER.language] || {}, tr = s => D[s] ?? D[s.trim()];
  const walk = n => { for (const c of [...n.childNodes]) {
    if (c.nodeType === 3) { const v = tr(c.nodeValue); if (v) c.nodeValue = c.nodeValue === c.nodeValue.trim() ? v : c.nodeValue.replace(c.nodeValue.trim(), v.trim()); }
    else if (c.nodeType === 1 && !c.id?.startsWith('coverT')) walk(c);
  } };
  ['help', 'soundNote', 'cover'].forEach(id => walk($(id)));
  walk(document.querySelector('.paused-mark'));
  document.querySelectorAll('#bar [aria-label], #bar [title]').forEach(e => {
    for (const a of ['aria-label', 'title']) { const v = e.getAttribute(a) && tr(e.getAttribute(a)); if (v) e.setAttribute(a, v); }
  });
  document.documentElement.lang = CHAPTER.language;
}
const LANG_NAME = { en: 'English', es: 'Español', fil: 'Filipino' };
function langButton() {
  const cur = CHAPTER.language || 'en';
  const alts = CHAPTER.langs ? CHAPTER.langs.filter(l => l !== cur).map(l => ({ lang: l, same: true })) : [].concat(CHAPTER.alt || []); if (!alts.length) return;
  const all = [{ lang: cur }, ...alts].sort((a, b) => ['en', 'es', 'fil'].indexOf(a.lang) - ['en', 'es', 'fil'].indexOf(b.lang));
  const st = document.createElement('style');
  st.textContent = '.langwrap{position:relative;flex:none}.langmenu{position:absolute;right:0;bottom:56px;min-width:170px;padding:6px;border-radius:14px;background:var(--panel);border:1px solid var(--edge);box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:30}'
    + '.langmenu[hidden]{display:none}.langmenu a,.langmenu span{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px 12px;border-radius:9px;color:var(--chalk);text-decoration:none;font-size:18px;white-space:nowrap}'
    + '.langmenu a:hover,.langmenu a:focus-visible{background:var(--soft);outline:none}.langmenu span{color:var(--dim);font-weight:700}.langmenu b{font-size:13px;color:var(--dim)}';
  document.head.appendChild(st);
  const wrap = document.createElement('div'), btn = document.createElement('button'), menu = document.createElement('div');
  wrap.className = 'langwrap'; btn.className = 'icon cc'; btn.id = 'bLang'; btn.textContent = (I18N_ALT[cur] || [cur.toUpperCase()])[0];
  const tip = { en: 'Language', es: 'Idioma', fil: 'Wika' }[cur] || 'Language';
  btn.setAttribute('aria-label', tip); btn.title = tip; btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false');
  menu.className = 'langmenu'; menu.id = 'langMenu'; menu.setAttribute('role', 'menu'); menu.hidden = true; btn.setAttribute('aria-controls', 'langMenu');
  all.forEach(a => {
    const el = a.lang === cur ? document.createElement('span') : Object.assign(document.createElement('a'), { href: a.same ? '?lang=' + a.lang : a.href });
    el.lang = a.lang; el.setAttribute('role', 'menuitem'); el.innerHTML = '<i style="font-style:normal">' + (LANG_NAME[a.lang] || a.lang) + '</i><b>' + (I18N_ALT[a.lang] || [a.lang.toUpperCase()])[0] + '</b>';
    if (a.lang === cur) el.setAttribute('aria-current', 'true');
    if (a.same) el.addEventListener('click', e => { e.preventDefault(); switchLang(a.lang); });
    menu.appendChild(el);
  });
  const set = on => { menu.hidden = !on; btn.setAttribute('aria-expanded', String(on)); if (on) (menu.querySelector('a') || btn).focus(); };
  btn.addEventListener('click', e => { e.stopPropagation(); set(menu.hidden); });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) set(false); });
  wrap.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); set(false); btn.focus(); } });
  wrap.append(btn, menu); $('bCC').before(wrap);
}
const _applyType = applyType;
applyType = function () { _applyType(); if (I18N[CHAPTER.language]) localizeShell(); langButton(); };
const _buildSegs = buildSegs;
buildSegs = function () {
  _buildSegs();
  if (UI_STEP[CHAPTER.language]) document.querySelectorAll('#segs [aria-label]').forEach(e => e.setAttribute('aria-label', e.getAttribute('aria-label').replace(/^Go to step /, UI_STEP[CHAPTER.language])));
};

// Same-page languages: remember the choice, reload this URL in the other language at the start of the current step.
function switchLang(l) {
  try { localStorage.setItem('pm-lang', l); } catch {}
  const q = new URLSearchParams(location.search);
  q.set('lang', l); q.set('beat', String(P.i || 0)); q.delete('t');
  location.href = location.pathname + '?' + q.toString();
}
const _applyType2 = applyType;
applyType = function () { _applyType2(); if (CHAPTER.langs) document.title = CHAPTER.title; };
