import { SOLIDCRAFT_ASSETS } from '../functions/_shared/solidcraft-runtime';

// Read the small host page with GET: some dev proxies reject HEAD even when
// the page is served. Check the large engines with HEAD, without downloading
// them a second time. A login page or an HTML fallback is not a CAD runtime.
export async function checkSolidCraftAvailability(signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<void> {
  const host = '/solidcraft-preview/host.html';
  let response: Response;
  try { response = await fetcher(host, { cache: 'no-store', signal }); }
  catch (error) {
    if (signal.aborted) throw error;
    throw new Error(`The dev server or network could not serve ${host}. Check the server, then retry.`);
  }
  if (!response.ok) throw new Error(`SolidCraft host failed to load: ${host} (HTTP ${response.status}). Check the server, then retry.`);
  const html = await response.text();
  if (!html.includes('<title>SolidCraft host</title>') || !html.includes('id="sc"')) {
    throw new Error(`The server returned a different page for ${host}. Check the address or sign in, then retry.`);
  }
  await Promise.all(SOLIDCRAFT_ASSETS.map(async asset => {
    const url = `/solidcraft-preview/${asset.path}`;
    let engine: Response;
    try { engine = await fetcher(url, { method: 'HEAD', cache: 'no-store', signal }); }
    catch (error) {
      if (signal.aborted) throw error;
      throw new Error(`The SolidCraft engine could not be reached: ${url}. Check the server, then retry.`);
    }
    if (!engine.ok) throw new Error(`SolidCraft engine failed to load: ${url} (HTTP ${engine.status}). The server needs the pinned runtime files.`);
    if (!engine.headers.get('Content-Type')?.includes('application/wasm')) {
      throw new Error(`The server returned a different file for ${url}. The server needs the pinned SolidCraft runtime.`);
    }
  }));
}
