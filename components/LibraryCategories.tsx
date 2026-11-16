'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, cloneElement, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { Folder, Star, Sparkles, Rocket, Gamepad2, Music, Image as ImageIcon, Heart, BookOpen, Code2, LayoutGrid, Inbox, ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { libraryClasses as styles } from './library-ui';
import LibraryItems from './LibraryItems';
import { LibraryDragDrop, LibrarySortable, LibraryFolderDrop } from './LibraryDragDrop';
import { errorText } from '../lib/http-error';
import { FOLDER_ICONS, FOLDER_COLORS, categoryKey, categoryName, categoryShelves, categoryOptions, orderedItems, movedTo, itemCategory, type CategoryKind, type FolderIcon, type FolderColor, type LibraryCategories, type LibraryScope } from '../lib/library-categories';

const EMPTY: LibraryCategories = { categories: [], assignments: [] };
type CategoriesContext = {
  data: LibraryCategories; ready: boolean; loading: boolean; busy: boolean;
  scope: LibraryScope;
  mutate: (body: Record<string, unknown>) => Promise<boolean>;
  save: (kind: CategoryKind, name: string | null, item?: string, category?: string) => Promise<boolean>;
};
const Context = createContext<CategoriesContext | null>(null);
const selectStyle = { maxWidth: '100%', minWidth: 0, fontSize: 12, padding: '5px 6px', borderRadius: 5, background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)' };
const folderIcons = { folder: Folder, star: Star, sparkles: Sparkles, rocket: Rocket, gamepad: Gamepad2, music: Music, image: ImageIcon, heart: Heart, book: BookOpen, code: Code2 };
const folderColor = (color: FolderColor) => `var(--c-${color === 'gray' ? 'dim' : color})`;
type Appearance = { icon: FolderIcon; color: FolderColor };
const DEFAULT_APPEARANCE: Appearance = { icon: 'folder', color: 'purple' };

function FolderAppearance({ value, onChange, disabled }: { value: Appearance; onChange: (value: Appearance) => void; disabled: boolean }) {
  const title = (name: string) => name[0].toUpperCase() + name.slice(1);
  return <div className={styles.folderAppearance}>
    <fieldset disabled={disabled}>
      <legend>Icon</legend>
      <div className={styles.iconChoices}>{FOLDER_ICONS.map((icon) => {
        const Icon = folderIcons[icon];
        return <button type="button" key={icon} aria-label={`${title(icon)} icon`} title={title(icon)} aria-pressed={value.icon === icon}
          style={{ color: folderColor(value.color) }} onClick={() => onChange({ ...value, icon })}><Icon size={17} aria-hidden="true" /></button>;
      })}</div>
    </fieldset>
    <fieldset disabled={disabled}>
      <legend>Color</legend>
      <div className={styles.colorChoices}>{FOLDER_COLORS.map((color) => <button type="button" key={color} aria-label={`${title(color)} color`} title={title(color)} aria-pressed={value.color === color}
        onClick={() => onChange({ ...value, color })}><span style={{ background: folderColor(color) }} /></button>)}</div>
    </fieldset>
  </div>;
}

export function LibraryCategoriesProvider({ children, scope = 'mine' }: { children: ReactNode; scope?: LibraryScope }) {
  const [data, setData] = useState<LibraryCategories>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const endpoint = `/api/library/categories?scope=${scope}`;
  useEffect(() => {
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal }).then(async (res) => {
      if (!res.ok) {
        if (scope === 'builtin' && res.status === 401) { setData({ ...EMPTY, canManage: false }); setReady(true); return; }
        throw new Error(res.status === 401 ? 'Sign in to organize your creations into categories.' : await errorText(res));
      }
      const next = await res.json() as LibraryCategories;
      if (!controller.signal.aborted) { setData(next); setReady(true); }
    }).catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load categories. Reload to try again.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint]);

  async function mutate(body: Record<string, unknown>) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true); setError('');
    try {
      const res = await fetch(endpoint, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await errorText(res));
      setData(await res.json() as LibraryCategories);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the category. Try again.');
      return false;
    } finally { saving.current = false; setBusy(false); }
  }
  const save = (kind: CategoryKind, name: string | null, item?: string, category?: string) => mutate({ kind, name, ...(item !== undefined ? { item } : {}), ...(category ? { category } : {}) });
  return <Context.Provider value={{ data, ready, loading, busy, scope, save, mutate }}>
    {error && <p role="status" style={{ fontSize: 13, color: 'var(--c-orange)' }}>{error}</p>}
    {children}
  </Context.Provider>;
}

function choices(data: LibraryCategories, kind: CategoryKind, defaults?: readonly string[]) {
  return categoryOptions(data, kind, defaults).map((c) => [c.key, c.name] as const);
}

function CategoryPicker({ kind, item, label, data, defaults, assigned }: { kind: CategoryKind; item: string; label: string; data: LibraryCategories; defaults?: readonly string[]; assigned: string }) {
  const ctx = useContext(Context);
  if (!ctx) return null;
  const value = assigned;
  const name = choices(data, kind, defaults).find(([key]) => key === value)?.[1];
  return <details className={styles.manage}>
    <summary aria-label={`Organize ${label}`}>{name ?? 'Add to category'}</summary>
    <div>
      <label style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, width: '100%' }}>
        Category
        <select aria-label={`Category for ${label}`} style={{ ...selectStyle, flex: '1 1 80px' }} value={value}
          disabled={!ctx.ready || ctx.busy}
          onChange={(e) => {
            const next = choices(data, kind, defaults).find(([key]) => key === e.target.value)?.[1] ?? null;
            void ctx.save(kind, next, item, e.target.value || undefined);
          }}>
          <option value="">Uncategorized</option>
          {choices(data, kind, defaults).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
        </select>
      </label>
      <ItemLabel kind={kind} item={item} label={label} />
      {ctx.scope === 'builtin' && <button type="button" className="btn-secondary btn-sm" disabled={ctx.busy}
        onClick={() => { if (window.confirm('Remove this item from the shared Library? Existing sketches will still work. You can restore it from Removed items.')) void ctx.mutate({ op: 'hide-item', kind, item, hidden: true }); }}>Remove from Library</button>}
    </div>
  </details>;
}

function ItemLabel({ kind, item, label }: { kind: CategoryKind; item: string; label: string }) {
  const ctx = useContext(Context)!;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label.slice(0, 60));
  return editing ? <form onSubmit={(e) => { e.preventDefault(); void ctx.mutate({ op: 'label-item', kind, item, label: name }).then((ok) => { if (ok) setEditing(false); }); }} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    <label style={{ fontSize: 12 }}>Library label <input autoFocus maxLength={60} required value={name} onChange={(e) => setName(e.target.value)} style={selectStyle} /></label>
    <button type="submit" className="btn-secondary btn-sm" disabled={ctx.busy || !name.trim()}>Save label</button>
    <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
    <span style={{ fontSize: 11, color: 'var(--c-dim)' }}>The code name and existing sketches stay the same.</span>
  </form> : <button type="button" className="btn-secondary btn-sm" onClick={() => { setName(label.slice(0, 60)); setEditing(true); }}>Rename Library label</button>;
}

export function BuiltinLibraryItems<T>(props: Parameters<typeof CategorizedLibraryItems<T>>[0]) {
  return <LibraryCategoriesProvider scope="builtin"><CategorizedLibraryItems {...props} /></LibraryCategoriesProvider>;
}

/** Shared folder browser: personal editing, admin catalog editing, or read-only maker groups. */
export default function CategorizedLibraryItems<T>({ items, text, kind, itemKey, preview, defaults, defaultCategory, readOnly = false, children }: {
  items: readonly T[]; text: (item: T) => string; kind: CategoryKind; itemKey: (item: T) => string;
  preview?: (item: T) => ReactNode;
  defaults?: readonly string[];
  defaultCategory?: (item: T) => string;
  readOnly?: boolean;
  children: (item: T) => ReactElement<React.HTMLAttributes<HTMLElement>>;
}) {
  const ctx = useContext(Context);
  const [selected, setSelected] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const categoryHeading = useRef<HTMLSpanElement>(null);
  const wasBrowsing = useRef(false);
  useEffect(() => {
    if (browsing) heading.current?.focus();
    else if (wasBrowsing.current) categoryHeading.current?.focus();
    wasBrowsing.current = browsing;
  }, [browsing, selected]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [editing, setEditing] = useState<({ key: string; name: string } & Appearance) | null>(null);
  const [removed, setRemoved] = useState(false);
  const id = useId();
  if (!ctx) return <LibraryItems items={items} text={text}>{children}</LibraryItems>;
  const source = readOnly ? EMPTY : ctx.data;
  const ready = readOnly || ctx.ready;
  const canManage = !readOnly && ready && ctx.data.canManage !== false;
  const generated = defaultCategory ? items.filter((item) => !source.assignments.some((a) => a.kind === kind && a.item === itemKey(item)))
    .map((item) => ({ kind, item: itemKey(item), category: categoryKey(defaultCategory(item)) })) : [];
  const data: LibraryCategories = { ...source, assignments: [...source.assignments, ...generated] };
  const options = choices(data, kind, defaults);
  const visibleKeys = new Set(options.map(([key]) => key));
  const inCategory = (item: T) => { const key = itemCategory(data, kind, itemKey(item)) ?? ''; return visibleKeys.has(key) ? key : ''; };
  const ordered = orderedItems(data, kind, items, itemKey, removed);
  const filtered = selected === null ? ordered : ordered.filter((item) => inCategory(item) === selected);
  const overview = categoryShelves(data, kind, ordered, itemKey, defaults);
  const uncategorized = overview.uncategorized.length;
  const displayItems = browsing ? filtered : overview.uncategorized;
  const currentName = removed ? 'Removed items' : selected === null ? 'All creations' : selected === '' ? 'Uncategorized' : options.find(([key]) => key === selected)?.[1] ?? selected;
  const reorderFolders = (from: string, to: string) => {
    const keys = movedTo(options.map(([key]) => key), from, to);
    void ctx.mutate({ op: 'order-folders', kind, entries: keys.map((key) => ({ key, name: options.find(([k]) => k === key)![1] })) });
  };
  const reorderItems = (from: string, to: string) => {
    const keys = movedTo(ordered.map(itemKey), from, to);
    void ctx.mutate({ op: 'order-items', kind, entries: keys.map((key) => ({ key })) });
  };
  const open = (key: string | null) => { setSelected(key); setRemoved(false); setBrowsing(true); };
  return <LibraryDragDrop enabled={canManage && !ctx.busy && !removed}
    folders={browsing ? [] : options.map(([key]) => key)} items={ready || browsing ? displayItems.map(itemKey) : []}
    onSort={(type, from, to) => { if (type === 'folder') reorderFolders(from, to); else reorderItems(from, to); }}
    onMove={(item, folder) => { const name = options.find(([key]) => key === folder)?.[1]; if (name) void ctx.save(kind, name, item, folder); }}>
    <div style={{ flexBasis: '100%', gridColumn: '1 / -1', width: '100%', marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div className={styles.breadcrumb}>
          {browsing ? (
            <button type="button" className={styles.backButton} onClick={() => { setBrowsing(false); setRemoved(false); }}>
              <ArrowLeft size={18} aria-hidden="true" />Back to categories
            </button>
          ) : <span ref={categoryHeading} tabIndex={-1}>{readOnly ? 'Browse by maker' : ctx.scope === 'builtin' ? 'Browse built-in folders' : 'Browse your categories'}</span>}
        </div>
        {canManage && <button type="button" className="btn-secondary btn-sm" disabled={ctx.busy} aria-expanded={creating} onClick={() => setCreating(!creating)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Plus size={13} aria-hidden="true" />New category</button>}
      </div>
      {creating && <form onSubmit={(e) => {
        e.preventDefault();
        const clean = categoryName(name);
        if (clean) void ctx.mutate({ op: 'create', kind, name: clean, ...appearance }).then((ok) => { if (ok) { setName(''); setAppearance(DEFAULT_APPEARANCE); setCreating(false); } });
      }} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <label htmlFor={`${id}-name`} style={{ fontSize: 12 }}>Category name</label>
        <input id={`${id}-name`} autoFocus maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Space project" style={selectStyle} />
        <button className="btn-secondary btn-sm" type="submit" disabled={ctx.busy || !categoryName(name)}>Create</button>
        <button className="btn-secondary btn-sm" type="button" onClick={() => { setCreating(false); setName(''); }}>Cancel</button>
        <div style={{ flexBasis: '100%', maxWidth: 300 }}><FolderAppearance value={appearance} onChange={setAppearance} disabled={ctx.busy} /></div>
      </form>}
      {!browsing && <>
        <div className={styles.quickViews}>
          <button type="button" className={styles.quickView} onClick={() => open(null)}><LayoutGrid size={15} aria-hidden="true" />All creations <span style={{ color: 'var(--c-dim)' }}>{ordered.length}</span></button>
          <button type="button" className={styles.quickView} disabled={!ready} onClick={() => open('')} title="Creations you have not categorized yet"><Inbox size={15} aria-hidden="true" />Uncategorized <span style={{ color: 'var(--c-dim)' }}>{uncategorized}</span></button>
        </div>
        {!readOnly && ctx.loading && <p style={{ fontSize: 12, color: 'var(--c-dim)' }}>Loading categories…</p>}
        {canManage && <p style={{ fontSize: 12, color: 'var(--c-dim)' }}>Drag cards to reorder. Keyboard: focus a card, press Space, move with arrows, then Space again.</p>}
        {canManage && ctx.scope === 'builtin' && <button type="button" className="btn-secondary btn-sm" onClick={() => { setRemoved(true); setSelected(null); setBrowsing(true); }}>Removed items</button>}
        {ready && <div className={styles.shelves}>
          {overview.shelves.map(({ key, name: title, items: members, icon, color }) => {
            const Icon = folderIcons[editing?.key === key ? editing.icon : icon];
            const duplicateName = !!editing && options.some(([otherKey, title]) => otherKey !== key && categoryKey(title) === categoryKey(categoryName(editing.name) ?? ''));
            return <LibrarySortable key={key} type="folder" itemKey={key} label={title} disabled={editing?.key === key}>
              <div className={styles.shelfContainer} style={{ '--folder-color': folderColor(editing?.key === key ? editing.color : color) } as CSSProperties}>
              {editing?.key === key ? <form className={styles.folderEdit}
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = categoryName(editing.name);
                  const duplicate = options.some(([otherKey, title]) => otherKey !== key && categoryKey(title) === categoryKey(name ?? ''));
                  if (!name || duplicate || ctx.busy) return;
                  void ctx.mutate({ op: 'rename-folder', kind, key, name, icon: editing.icon, color: editing.color }).then((ok) => { if (ok) setEditing(null); });
                }}
                onKeyDown={(e) => { if (e.key === 'Escape' && !ctx.busy) { e.preventDefault(); e.stopPropagation(); setEditing(null); } }}>
                <Icon size={28} strokeWidth={1.4} aria-hidden="true" />
                <label htmlFor={`${id}-folder-${key}`}>Folder name</label>
                <input id={`${id}-folder-${key}`} autoFocus maxLength={40} required value={editing.name}
                  disabled={ctx.busy} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  aria-invalid={duplicateName}
                  style={selectStyle} />
                {duplicateName &&
                  <span role="status" style={{ fontSize: 11, color: 'var(--c-orange)' }}>A folder with that name already exists.</span>}
                <FolderAppearance value={editing} onChange={(value) => setEditing({ ...editing, ...value })} disabled={ctx.busy} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button type="submit" className="btn-secondary btn-sm" disabled={ctx.busy || !categoryName(editing.name) || duplicateName}>{ctx.busy ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="btn-secondary btn-sm" disabled={ctx.busy} onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </form> : <>
              <button type="button" data-library-drag-surface className={styles.shelf} onClick={() => open(key)} aria-label={`Open ${title}, ${members.length} creations`}>
              <div className={styles.shelfPreview} aria-hidden="true">
                {members.length && preview ? members.slice(0, 3).map((item) => <span key={itemKey(item)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{preview(item)}</span>) : <Icon size={28} strokeWidth={1.4} />}
              </div>
              <span className={styles.shelfTitle}><Icon size={14} aria-hidden="true" style={{ color: 'var(--folder-color)', flexShrink: 0 }} />{title}</span>
              <p className={styles.shelfMeta}>{members.length ? `${members.length} ${members.length === 1 ? 'creation' : 'creations'}` : 'Ready for your ideas'}</p>
              </button>
              </>}
              {canManage && editing?.key !== key && <div className={styles.folderActions}>
                <button type="button" aria-label={`Edit ${title}`} title="Edit name, icon and color" disabled={ctx.busy} onClick={() => setEditing({ key, name: title, icon, color })}><Pencil size={14} /></button>
                <button type="button" aria-label={`Delete folder ${title}`} disabled={ctx.busy} onClick={() => { if (window.confirm(`Delete folder "${title}"? Its creations will move to Uncategorized. No creations will be deleted.`)) void ctx.mutate({ op: 'delete-folder', kind, key, name: title }); }}><Trash2 size={14} /></button>
              </div>}
              </div>
            </LibrarySortable>;
          })}
        </div>}
        {ready && <h4 style={{ fontSize: 14, margin: '8px 0 12px' }}>Uncategorized <span style={{ color: 'var(--c-dim)', fontWeight: 400 }}>· {uncategorized}</span></h4>}
        {canManage && uncategorized > 0 && <p style={{ fontSize: 12, color: 'var(--c-dim)', margin: '0 0 10px' }}>Drag a creation onto a folder above, or use its category menu.</p>}
      </>}
      {browsing && <h4 ref={heading} tabIndex={-1} style={{ fontSize: 14, margin: '8px 0 12px', outline: 'none' }}>{currentName} <span style={{ color: 'var(--c-dim)', fontWeight: 400 }}>· {filtered.length}</span></h4>}
      {browsing && ready && !filtered.length && <p style={{ fontSize: 13, color: 'var(--c-dim)' }}>{canManage ? 'Nothing here yet. Open All creations and use Add to category to place something here.' : 'Nothing in this folder yet.'}</p>}
    </div>
    {browsing && canManage && !removed && <div style={{ flexBasis: '100%', gridColumn: '1 / -1', width: '100%', padding: '10px 0' }}>
      <p style={{ fontSize: 12, color: 'var(--c-dim)' }}>Move to a folder: drag a creation onto one of these folders, or use its category menu.</p>
      <div className={styles.moveTargets}>{options.map(([key, title]) => <LibraryFolderDrop key={key} folderKey={key} label={title} />)}</div>
    </div>}
    {(ready || browsing) && <LibraryItems key={!browsing ? 'uncategorized-below-folders' : selected === null ? 'all' : `category:${selected}`} items={displayItems} showAll={!browsing} text={(item) => `${data.layout?.find((x) => x.kind === kind && x.item === itemKey(item))?.label ?? ''} ${text(item)}`}>{(item) => {
      const card = children(item);
      const layout = data.layout?.find((x) => x.kind === kind && x.item === itemKey(item));
      return <LibrarySortable key={itemKey(item)} type="item" itemKey={itemKey(item)} label={layout?.label ?? text(item)}>{cloneElement(card, {
        children: <>
          {layout?.label && <strong style={{ width: '100%', fontSize: 13 }}>{layout.label}</strong>}
          {card.props.children}
          {canManage && (removed ? <button type="button" className="btn-secondary btn-sm" disabled={ctx.busy} onClick={() => void ctx.mutate({ op: 'hide-item', kind, item: itemKey(item), hidden: false })}>Restore to Library</button> : <>
            <CategoryPicker kind={kind} item={itemKey(item)} label={layout?.label ?? text(item)} data={data} defaults={defaults} assigned={inCategory(item)} />
          </>)}
        </>,
      } as React.HTMLAttributes<HTMLElement>)}</LibrarySortable>;
    }}</LibraryItems>}

  </LibraryDragDrop>;
}
