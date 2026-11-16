import { categoryKey, categoryName, isCategoryKind } from '../../../lib/library-categories';

type Session = { email: string; role: 'student' | 'teacher' | 'admin' };
type Env = { DB: D1Database };
type Ctx = EventContext<Env, string, Session>;
const BUILTIN_OWNER = '@shared-builtin-library';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
function scope(context: Ctx) {
  const builtin = new URL(context.request.url).searchParams.get('scope') === 'builtin';
  return { builtin, owner: builtin ? BUILTIN_OWNER : context.data.email, canManage: !builtin || context.data.role === 'admin' };
}
const validKey = (v: unknown): v is string => typeof v === 'string' && !v.startsWith('@library:') && !!v.trim() && v.length <= 128 && !/[\u0000-\u001f\u007f]/.test(v);

export const onRequestGet: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { env } = context;
  const { owner, canManage } = scope(context);
  const [categories, assignments, layout] = await Promise.all([
    env.DB.prepare('SELECT kind, name, category_key AS key, position, hidden FROM library_categories WHERE owner_email = ? ORDER BY position, name COLLATE NOCASE').bind(owner).all(),
    env.DB.prepare('SELECT kind, item_key AS item, category_key AS category FROM library_category_items WHERE owner_email = ?').bind(owner).all(),
    env.DB.prepare('SELECT kind, item_key AS item, label, position, hidden FROM library_item_layout WHERE owner_email = ?').bind(owner).all(),
  ]);
  return json({ categories: categories.results, assignments: assignments.results, layout: layout.results, canManage });
};

// Organization metadata never changes asset names/URLs or removes bytes used by existing sketches.
export const onRequestPut: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { request, env, data } = context;
  const { builtin, owner, canManage } = scope(context);
  if (!canManage) return json({ error: 'Only an admin can change the shared built-in Library.' }, 403);
  const raw = await request.text();
  if (raw.length > 65536) return json({ error: 'Organization details are too long.' }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
  if (!body || !isCategoryKind(body.kind)) return json({ error: 'Choose a kind of creation.' }, 400);
  const { kind, item } = body;
  const op = body.op ?? (item !== undefined ? 'assign' : 'create');
  if (!['create', 'assign', 'rename-folder', 'delete-folder', 'order-folders', 'order-items', 'label-item', 'hide-item'].includes(String(op))) return json({ error: 'Unknown organization action.' }, 400);
  if (['assign', 'label-item', 'hide-item'].includes(String(op))) {
    if (!validKey(item)) return json({ error: 'Choose a valid creation.' }, 400);
    if (!builtin && (kind === 'game' || kind === 'upload')) {
      const sql = kind === 'game' ? 'SELECT id FROM library_games WHERE id = ? AND owner_email = ? AND deleted_at IS NULL' : 'SELECT id FROM uploads WHERE id = ? AND owner_email = ?';
      if (!await env.DB.prepare(sql).bind(item, data.email).first()) return json({ error: 'That creation is not in your Library.' }, 404);
    }
  }
  if (op === 'order-folders' || op === 'order-items') {
    const entries = body.entries;
    if (!Array.isArray(entries) || entries.length > (op === 'order-folders' ? 100 : 500) || !entries.length || entries.some((entry) => !entry || !validKey(entry.key) || (op === 'order-folders' && !categoryName(entry.name))) || new Set(entries.map((x) => x.key)).size !== entries.length) return json({ error: 'Choose a valid, unique ordering.' }, 400);
    if (op === 'order-items' && !builtin && (kind === 'game' || kind === 'upload')) {
      const sql = kind === 'game' ? 'SELECT id FROM library_games WHERE id = ? AND owner_email = ? AND deleted_at IS NULL' : 'SELECT id FROM uploads WHERE id = ? AND owner_email = ?';
      const owns = await Promise.all(entries.map((entry) => env.DB.prepare(sql).bind(entry.key, data.email).first()));
      if (owns.some((own) => !own)) return json({ error: 'Only your own creations can be reordered.' }, 404);
    }
    const statements = entries.map((entry, position) => op === 'order-folders'
      ? env.DB.prepare(`INSERT INTO library_categories (owner_email, kind, category_key, name, position) VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_email, kind, category_key) DO UPDATE SET position = excluded.position`).bind(owner, kind, entry.key, categoryName(entry.name), position + 1)
      : env.DB.prepare(`INSERT INTO library_item_layout (owner_email, kind, item_key, position) VALUES (?, ?, ?, ?) ON CONFLICT(owner_email, kind, item_key) DO UPDATE SET position = excluded.position`).bind(owner, kind, entry.key, position + 1));
    await env.DB.batch(statements);
    return onRequestGet(context);
  }
  if (op === 'label-item' || op === 'hide-item') {
    if (op === 'hide-item' && (!builtin || typeof body.hidden !== 'boolean')) return json({ error: 'Use Delete on your own creation to remove it.' }, 400);
    const label = body.label === null ? null : typeof body.label === 'string' ? body.label.trim() : '';
    if (op === 'label-item' && label !== null && (!label || label.length > 60 || /[\u0000-\u001f\u007f]/.test(label))) return json({ error: 'Use a Library label from 1 to 60 characters.' }, 400);
    await (op === 'label-item'
      ? env.DB.prepare(`INSERT INTO library_item_layout (owner_email, kind, item_key, label) VALUES (?, ?, ?, ?) ON CONFLICT(owner_email, kind, item_key) DO UPDATE SET label = excluded.label`).bind(owner, kind, item, label)
      : env.DB.prepare(`INSERT INTO library_item_layout (owner_email, kind, item_key, hidden) VALUES (?, ?, ?, ?) ON CONFLICT(owner_email, kind, item_key) DO UPDATE SET hidden = excluded.hidden`).bind(owner, kind, item, body.hidden ? 1 : 0)).run();
    return onRequestGet(context);
  }
  if (op === 'rename-folder' || op === 'delete-folder') {
    if (!validKey(body.key)) return json({ error: 'Choose a valid folder.' }, 400);
    const name = op === 'rename-folder' ? categoryName(body.name) : categoryName(body.name) ?? body.key;
    if (!name) return json({ error: 'Use a folder name from 1 to 40 characters.' }, 400);
    if (op === 'rename-folder') {
      const other = await env.DB.prepare('SELECT category_key FROM library_categories WHERE owner_email = ? AND kind = ? AND category_key != ? AND hidden = 0 AND lower(name) = lower(?)').bind(owner, kind, body.key, name).first();
      if (other) return json({ error: 'A folder with that name already exists.' }, 409);
    }
    const statements = [env.DB.prepare(`INSERT INTO library_categories (owner_email, kind, category_key, name, hidden) VALUES (?, ?, ?, ?, ?) ON CONFLICT(owner_email, kind, category_key) DO UPDATE SET name = excluded.name, hidden = excluded.hidden`).bind(owner, kind, body.key, name, op === 'delete-folder' ? 1 : 0)];
    if (op === 'delete-folder') statements.push(env.DB.prepare('DELETE FROM library_category_items WHERE owner_email = ? AND kind = ? AND category_key = ?').bind(owner, kind, body.key));
    await env.DB.batch(statements);
    return onRequestGet(context);
  }
  if (op === 'assign' && body.name === null && body.category == null) {
    if (builtin) {
      // An explicit Uncategorized override must win over the shipped grouping.
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO library_categories (owner_email, kind, category_key, name, hidden) VALUES (?, ?, '@library:uncategorized', 'Uncategorized', 1) ON CONFLICT DO NOTHING`).bind(owner, kind),
        env.DB.prepare(`INSERT INTO library_category_items (owner_email, kind, item_key, category_key) VALUES (?, ?, ?, '@library:uncategorized') ON CONFLICT(owner_email, kind, item_key) DO UPDATE SET category_key = excluded.category_key`).bind(owner, kind, item),
      ]);
    } else await env.DB.prepare('DELETE FROM library_category_items WHERE owner_email = ? AND kind = ? AND item_key = ?').bind(owner, kind, item).run();
    return onRequestGet(context);
  }
  const name = categoryName(body.name);
  if (!name) return json({ error: 'Use a category name from 1 to 40 characters, without control characters.' }, 400);
  const sameName = op === 'create' ? await env.DB.prepare('SELECT category_key FROM library_categories WHERE owner_email = ? AND kind = ? AND hidden = 0 AND lower(name) = lower(?)').bind(owner, kind, name).first<{ category_key: string }>() : null;
  const key = validKey(body.category) ? body.category : sameName?.category_key ?? categoryKey(name);
  if (!validKey(key)) return json({ error: 'That folder name is reserved.' }, 400);
  const exists = await env.DB.prepare('SELECT name, hidden FROM library_categories WHERE owner_email = ? AND kind = ? AND category_key = ?').bind(owner, kind, key).first<{ name: string; hidden: number }>();
  if (!exists) {
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM library_categories WHERE owner_email = ? AND kind = ?').bind(owner, kind).first<{ n: number }>();
    if ((count?.n ?? 0) >= 100) return json({ error: 'You can have up to 100 categories for each kind of creation.' }, 409);
  }
  if (op === 'assign' && exists?.hidden) return json({ error: 'That folder was deleted. Choose another folder.' }, 409);
  const statements = [env.DB.prepare(`INSERT INTO library_categories (owner_email, kind, category_key, name) VALUES (?, ?, ?, ?) ON CONFLICT(owner_email, kind, category_key) DO UPDATE SET hidden = 0`).bind(owner, kind, key, name)];
  if (op === 'assign') statements.push(env.DB.prepare(`INSERT INTO library_category_items (owner_email, kind, item_key, category_key) VALUES (?, ?, ?, ?) ON CONFLICT(owner_email, kind, item_key) DO UPDATE SET category_key = excluded.category_key`).bind(owner, kind, item, key));
  await env.DB.batch(statements);
  return onRequestGet(context);
};
