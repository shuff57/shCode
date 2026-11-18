// shCode: SolidCraft's engine from the framing page's cache (?cache=parent), so a visit after the first does not download it again.
//
// The studio frames this page credentialless, which gives it an empty HTTP cache on every visit, so the 101 MB engine was downloaded
// every time. The studio page (lib/solidcraft-runtime-cache.ts) keeps the pinned engine and kernel in its own Cache Storage, checked by
// size and sha256, and hands the bytes over on asking: window.parent.__shcodeRuntime.get(path).
//
// SolidCraft's own files are not changed. Its index.html is loaded into the #sc frame through srcdoc instead of src, with three things
// added around it: a <base> so its relative URLs resolve as before; a fetch shim that answers its engine URL from the handed-over bytes;
// its preload hint for the engine left out (the preload would download the same 101 MB again); and its service worker not registered
// (it precached the engine, another 101 MB, into storage this frame throws away). (In a srcdoc document location is about:srcdoc,
// whose origin is "null"; the shim compares origins through the document's base URL.) Anything that fails, or no ?cache=parent,
// or no cache in the framing page: the frame loads ./solidcraft/index.html as it always has.
// This is a classic script placed right after <iframe id="sc"> in host.html, so it runs before the frame loads anything.
(function () {
  var frame = document.getElementById('sc');
  var plain = function () { if (!frame.getAttribute('src') && !frame.hasAttribute('srcdoc')) frame.src = './solidcraft/index.html'; };
  var cache = null;
  try { if (new URLSearchParams(location.search).get('cache') === 'parent' && window.parent !== window) cache = window.parent.__shcodeRuntime || null; } catch (e) { cache = null; }
  if (!cache || typeof cache.get !== 'function') { plain(); return; }
  var root = new URL('./', location.href).pathname; // /solidcraft-preview/
  // the kernel (pane.js) and the engine (the shim below) ask through this
  window.__runtimeBytes = function (path) { try { return Promise.resolve(cache.get(path)).catch(function () { return null; }); } catch (e) { return Promise.resolve(null); } };
  var shim = '(function(){var of=window.fetch.bind(window);var host=window.parent;var root=' + JSON.stringify(root) + ';' +
    'window.fetch=function(input,init){try{var u=new URL(typeof input==="string"?input:(input&&input.href)||(input&&input.url),document.baseURI);' +
    'if(u.origin===new URL(document.baseURI).origin&&u.pathname.indexOf(root)===0&&/_bg\\.wasm$/.test(u.pathname)&&host.__runtimeBytes){var path=u.pathname.slice(root.length);' +
    'return host.__runtimeBytes(path).then(function(b){return b?new Response(b,{headers:{"Content-Type":"application/wasm"}}):of(input,init);},function(){return of(input,init);});}}catch(e){}' +
    'return of(input,init);};' +
    // its service worker would download the engine again into storage this frame throws away at the end of the visit (it cannot give
    // offline use here); SolidCraft's page catches a refused registration and carries on
    'try{if(navigator.serviceWorker)Object.defineProperty(navigator.serviceWorker,"register",{value:function(){return Promise.reject(new Error("no service worker in the studio frame"));}});}catch(e){}' +
    '})();';
  fetch('./solidcraft/index.html', { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('index.html ' + r.status);
    return r.text();
  }).then(function (html) {
    var base = new URL('./solidcraft/', location.href).href;
    var out = html.replace(/<link[^>]*rel="preload"[^>]*_bg\.wasm[^>]*>/g, '');
    if (!/<head[^>]*>/i.test(out)) throw new Error('no <head>');
    out = out.replace(/<head[^>]*>/i, function (h) { return h + '<base href="' + base + '"><script>' + shim + '<\/script>'; });
    frame.srcdoc = out;
  }).catch(plain);
})();
