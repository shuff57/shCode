import type { FileNode } from './types';

// ---- Find file by name recursively ----
function findFileByName(nodes: FileNode[], name: string): FileNode | null {
  for (const item of nodes) {
    if (item.type === 'file' && item.name.toLowerCase() === name.toLowerCase()) {
      return item;
    }
    if (item.type === 'folder' && item.children) {
      const found = findFileByName(item.children, name);
      if (found) return found;
    }
  }
  return null;
}

// ---- Find file by absolute path from root ----
function findFileByPath(nodes: FileNode[], absolutePath: string): FileNode | null {
  const segments = absolutePath.split('/').filter((p) => p.length > 0);
  let current: FileNode[] = nodes;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const match = current.find((n) => n.name === seg);
    if (!match) return null;
    if (i === segments.length - 1 && match.type === 'file') return match;
    if (match.type === 'folder' && match.children) current = match.children;
    else return null;
  }
  return null;
}

// ---- Resolve relative path ----
function resolvePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) return relativePath;
  const baseSegments = basePath.split('/').filter((p) => p.length > 0);
  baseSegments.pop(); // remove filename
  for (const segment of relativePath.split('/')) {
    if (segment === '..') baseSegments.pop();
    else if (segment !== '.' && segment !== '') baseSegments.push(segment);
  }
  return '/' + baseSegments.join('/');
}

// ---- Build preview HTML ----
export function buildPreviewHtml(
  fileTree: FileNode[],
  fileContents: Record<string, string> // path -> content
): string {
  const htmlFile = findFileByName(fileTree, 'index.html');
  if (!htmlFile) return '<!DOCTYPE html><!-- index.html not found -->';

  let html = fileContents[htmlFile.path] ?? '';

  // Inline CSS <link> tags
  const cssRegex = /<link[^>]*?href=(["'])(.+?\.css)\1[^>]*?\/?>/gi;
  html = html.replace(cssRegex, (_match, _quote, path) => {
    const absPath = resolvePath(htmlFile.path, path);
    const cssFile = findFileByPath(fileTree, absPath);
    if (cssFile && fileContents[cssFile.path] !== undefined) {
      return `<style>${fileContents[cssFile.path]}</style>`;
    }
    // Fallback: try by name
    const byName = findFileByName(fileTree, path.split('/').pop()!);
    if (byName && fileContents[byName.path] !== undefined) {
      return `<style>${fileContents[byName.path]}</style>`;
    }
    return `<!-- Could not resolve: ${path} -->`;
  });

  // Inline JS <script src> tags
  const jsRegex = /<script[^>]*?src=(["'])(.+?\.js)\1[^>]*?>\s*<\/script>/gi;
  html = html.replace(jsRegex, (_match, _quote, path) => {
    const absPath = resolvePath(htmlFile.path, path);
    const jsFile = findFileByPath(fileTree, absPath);
    if (jsFile && fileContents[jsFile.path] !== undefined) {
      return `<script>${fileContents[jsFile.path]}</script>`;
    }
    const byName = findFileByName(fileTree, path.split('/').pop()!);
    if (byName && fileContents[byName.path] !== undefined) {
      return `<script>${fileContents[byName.path]}</script>`;
    }
    return `<!-- Could not resolve: ${path} -->`;
  });

  // Inject console override
  const consoleOverride = `<script>
(function() {
  var send = function(type, args) {
    window.parent.postMessage({ source: 'preview-console', type: type, args: args }, '*');
  };
  ['log','warn','error','info'].forEach(function(t) {
    var fn = console[t];
    console[t] = function() {
      var a = Array.prototype.slice.call(arguments);
      send(t, a);
      fn.apply(console, a);
    };
  });
  window.onerror = function(m, s, l, c) {
    send('error', [m + ' (' + l + ':' + c + ')']);
  };
})();
</script>`;

  if (html.includes('</head>')) {
    html = html.replace('</head>', consoleOverride + '</head>');
  } else {
    html = consoleOverride + html;
  }

  // Ensure DOCTYPE
  if (!html.trim().toLowerCase().startsWith('<!doctype')) {
    html = '<!DOCTYPE html>\n' + html;
  }

  return html;
}

// ---- Build JSCAD 3D preview HTML ----
export function buildJscadPreviewHtml(scriptContent: string): string {
  // Escape closing script tags in student code so they don't break the template
  const safeScript = scriptContent.replace(/<\/script/gi, '<\\/script');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #36333a; overflow: hidden; }
#viewer { width: 100vw; height: 100vh; }
#status {
  position: fixed; bottom: 8px; left: 8px;
  color: #888; font: 12px/1.4 monospace;
  pointer-events: none; z-index: 10;
}
#error-overlay {
  position: fixed; top: 0; left: 0; right: 0;
  background: rgba(220,38,38,0.9); color: #fff;
  font: 13px/1.5 monospace; padding: 12px 16px;
  display: none; z-index: 20; white-space: pre-wrap;
}
</style>
</head>
<body>
<div id="viewer"></div>
<div id="status">Loading JSCAD libraries...</div>
<div id="error-overlay"></div>

<script>
// Console override — send logs to parent Console component
(function() {
  var send = function(type, args) {
    window.parent.postMessage({ source: 'preview-console', type: type, args: args }, '*');
  };
  ['log','warn','error','info'].forEach(function(t) {
    var orig = console[t];
    console[t] = function() {
      var a = Array.prototype.slice.call(arguments);
      send(t, a);
      orig.apply(console, a);
    };
  });
  window.onerror = function(m, s, l, c) {
    send('error', [m + ' (line ' + l + ':' + c + ')']);
  };
})();
</script>

<script src="https://unpkg.com/@jscad/modeling@2.13.0/dist/jscad-modeling.min.js"
  onerror="document.getElementById('status').textContent='Failed to load @jscad/modeling — check internet connection'"></script>
<script src="https://unpkg.com/@jscad/regl-renderer@2.6.15/dist/jscad-regl-renderer.min.js"
  onerror="document.getElementById('status').textContent='Failed to load @jscad/regl-renderer — check internet connection'"></script>

<!-- CJS shims: provide require() and module.exports for student code -->
<script>
var module = { exports: {} };
var exports = module.exports;
function require(name) {
  if (name === '@jscad/modeling') return jscadModeling;
  throw new Error('Unknown module: ' + name);
}
</script>

<!-- Student code runs directly — uses require/module/exports from above -->
<script>
try {
${safeScript}
} catch (e) {
  window.__jscadError = e;
}
</script>

<!-- Evaluate result and render -->
<script>
(function() {
  var statusEl = document.getElementById('status');
  var errorEl = document.getElementById('error-overlay');
  var container = document.getElementById('viewer');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    console.error(msg);
  }

  // Check CDN loaded
  if (typeof jscadModeling === 'undefined') {
    showError('Failed to load @jscad/modeling library.\\nCheck your internet connection or try refreshing.');
    return;
  }
  if (typeof jscadReglRenderer === 'undefined') {
    showError('Failed to load @jscad/regl-renderer library.\\nCheck your internet connection or try refreshing.');
    return;
  }

  // Check for student code errors
  if (window.__jscadError) {
    showError('Error: ' + (window.__jscadError.message || window.__jscadError));
    return;
  }

  statusEl.textContent = 'Running code...';

  var geometry = null;
  try {
    var mainFn = module.exports.main;
    if (typeof mainFn !== 'function') {
      showError('No main() function found.\\n\\nYour JSCAD program needs:\\n  1. function main() { return primitives.cube({ size: 10 }) }\\n  2. module.exports = { main }');
      return;
    }

    geometry = mainFn();
    if (!geometry) {
      showError('main() returned nothing. Make sure to return a shape.\\nExample: return primitives.cube({ size: 10 })');
      return;
    }
  } catch (e) {
    showError('Error: ' + (e.message || e));
    return;
  }

  statusEl.textContent = 'Rendering...';

  // ---- Set up renderer ----
  try {
    var prepareRender = jscadReglRenderer.prepareRender;
    var drawCommands = jscadReglRenderer.drawCommands;
    var cameras = jscadReglRenderer.cameras;
    var controls = jscadReglRenderer.controls;
    var entitiesFromSolids = jscadReglRenderer.entitiesFromSolids;

    var perspectiveCamera = cameras.perspective;
    var orbitControls = controls.orbit;

    var width = container.clientWidth;
    var height = container.clientHeight;

    // Camera — matches jscad.app default perspective
    var camera = Object.assign({}, perspectiveCamera.defaults);
    camera.position = [450, 550, 700];
    camera.target = [0, 0, 0];
    camera.up = [0, 0, 1];
    perspectiveCamera.setProjection(camera, camera, { width: width, height: height });
    perspectiveCamera.update(camera, camera);

    // Controls
    var controlsState = Object.assign({}, orbitControls.defaults);

    // Renderer — jscad.app dark theme background
    var renderer = prepareRender({
      glOptions: { container: container },
      rendering: {
        background: [0.211, 0.2, 0.207, 1],
        meshColor: [1, 0.4, 0, 1],
        lightDirection: [0.2, 0.2, 1],
        lightPosition: [100, 200, 100],
        ambientLightAmount: 0.3,
        diffuseLightAmount: 0.89,
        specularLightAmount: 0.16,
        materialShininess: 8.0
      }
    });

    // Convert geometry to entities — orange mesh color (jscad.app dark theme)
    var solids = Array.isArray(geometry) ? geometry : [geometry];
    var entities = entitiesFromSolids({ color: [1, 0.4, 0, 1] }, solids);

    // Grid — jscad.app dark theme: white lines, cyan sub-grid
    var gridOptions = {
      visuals: { drawCmd: 'drawGrid', show: true, transparent: true },
      size: [200, 200],
      ticks: [10, 1],
      color: [1, 1, 1, 0.5],
      subColor: [0, 1, 1, 0.5]
    };

    // Axes — RGB for XYZ, always visible
    var axisOptions = {
      visuals: { drawCmd: 'drawAxis', show: true },
      size: 100,
      alwaysVisible: true
    };

    var renderOptions = {
      camera: camera,
      rendering: {
        background: [0.211, 0.2, 0.207, 1],
        meshColor: [1, 0.4, 0, 1],
        lightDirection: [0.2, 0.2, 1],
        lightPosition: [100, 200, 100],
        ambientLightAmount: 0.3,
        diffuseLightAmount: 0.89,
        specularLightAmount: 0.16,
        materialShininess: 8.0
      },
      drawCommands: {
        drawAxis: drawCommands.drawAxis,
        drawGrid: drawCommands.drawGrid,
        drawLines: drawCommands.drawLines,
        drawMesh: drawCommands.drawMesh
      },
      entities: [gridOptions, axisOptions].concat(entities)
    };

    // ---- Orbit controls input ----
    var pointerDown = false;
    var lastX = 0, lastY = 0;
    var rotateDelta = [0, 0];
    var panDelta = [0, 0];
    var zoomDelta = 0;

    container.onpointerdown = function(ev) {
      pointerDown = true;
      lastX = ev.pageX;
      lastY = ev.pageY;
      container.setPointerCapture(ev.pointerId);
    };
    container.onpointerup = function(ev) {
      pointerDown = false;
      container.releasePointerCapture(ev.pointerId);
    };
    container.onpointermove = function(ev) {
      if (!pointerDown) return;
      var dx = ev.pageX - lastX;
      var dy = ev.pageY - lastY;
      lastX = ev.pageX;
      lastY = ev.pageY;
      if (ev.shiftKey || ev.buttons === 4) {
        panDelta[0] += dx;
        panDelta[1] += dy;
      } else {
        rotateDelta[0] -= dx;
        rotateDelta[1] -= dy;
      }
    };
    container.onwheel = function(ev) {
      ev.preventDefault();
      zoomDelta += ev.deltaY;
    };

    // ---- Render loop ----
    var rotateSpeed = 0.002;
    var panSpeed = 1;
    var zoomSpeed = 0.08;

    function updateAndRender() {
      if (rotateDelta[0] || rotateDelta[1]) {
        var rotated = orbitControls.rotate({
          controls: controlsState, camera: camera, speed: rotateSpeed
        }, rotateDelta);
        controlsState = Object.assign({}, controlsState, rotated.controls);
        rotateDelta = [0, 0];
      }
      if (panDelta[0] || panDelta[1]) {
        var panned = orbitControls.pan({
          controls: controlsState, camera: camera, speed: panSpeed
        }, panDelta);
        controlsState = Object.assign({}, controlsState, panned.controls);
        camera.position = panned.camera.position;
        camera.target = panned.camera.target;
        panDelta = [0, 0];
      }
      if (zoomDelta) {
        var zoomed = orbitControls.zoom({
          controls: controlsState, camera: camera, speed: zoomSpeed
        }, zoomDelta);
        controlsState = Object.assign({}, controlsState, zoomed.controls);
        zoomDelta = 0;
      }

      var updated = orbitControls.update({
        controls: controlsState, camera: camera
      });
      controlsState = Object.assign({}, controlsState, updated.controls);
      camera.position = updated.camera.position;
      perspectiveCamera.update(camera);

      renderOptions.camera = camera;
      renderer(renderOptions);
      window.requestAnimationFrame(updateAndRender);
    }

    window.requestAnimationFrame(updateAndRender);
    statusEl.textContent = '';

    // Handle resize
    window.addEventListener('resize', function() {
      var w = container.clientWidth;
      var h = container.clientHeight;
      perspectiveCamera.setProjection(camera, camera, { width: w, height: h });
    });

  } catch (e) {
    showError('Render error: ' + (e.message || e));
  }
})();
</script>
</body>
</html>`;
}
