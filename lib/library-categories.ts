/** Personal organization is separate from asset bytes, sharing, and editor metadata. */
export const CATEGORY_KINDS = ['game', 'texture', 'sound', 'font', 'upload'] as const;
export type CategoryKind = typeof CATEGORY_KINDS[number];
export const FOLDER_ICONS = ['folder', 'star', 'sparkles', 'rocket', 'gamepad', 'music', 'image', 'heart', 'book', 'code'] as const;
export const FOLDER_COLORS = ['purple', 'pink', 'cyan', 'green', 'orange', 'yellow', 'red', 'gray'] as const;
export type FolderIcon = typeof FOLDER_ICONS[number];
export type FolderColor = typeof FOLDER_COLORS[number];
export const isFolderIcon = (value: unknown): value is FolderIcon => FOLDER_ICONS.some(icon => icon === value);
export const isFolderColor = (value: unknown): value is FolderColor => FOLDER_COLORS.some(color => color === value);
export type LibraryCategory = { kind: CategoryKind; name: string; key: string; position?: number; hidden?: boolean | number; icon?: FolderIcon; color?: FolderColor };
export type CategoryAssignment = { kind: CategoryKind; item: string; category: string };
export type ItemLayout = { kind: CategoryKind; item: string; label: string | null; position: number; hidden: boolean | number };
export type LibraryCategories = { categories: LibraryCategory[]; assignments: CategoryAssignment[]; layout?: ItemLayout[]; canManage?: boolean };
export type LibraryScope = 'mine' | 'builtin';
export const SUGGESTED_CATEGORIES: Record<CategoryKind, readonly string[]> = {
  game: ['Arcade', 'Puzzle', 'Adventure', 'Multiplayer'],
  texture: ['Characters', 'Backgrounds', 'Objects', 'Animations'],
  sound: ['Music', 'Sound effects', 'Voices'],
  font: ['Pixel', 'Handwritten', 'Display'],
  upload: ['Characters', 'Backgrounds', 'Reference'],
};

export function isCategoryKind(value: unknown): value is CategoryKind {
  return CATEGORY_KINDS.some((kind) => kind === value);
}

export function categoryName(value: unknown): string | null {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  return name.length > 0 && name.length <= 40 ? name : null;
}

export function categoryKey(name: string): string { return name.toLowerCase(); }

export function itemCategory(data: LibraryCategories, kind: CategoryKind, item: string): string | null {
  return data.assignments.find((a) => a.kind === kind && a.item === item)?.category ?? null;
}

/** Build shelves from current creations, ignoring assignments for deleted items. */
export function categoryOptions(data: LibraryCategories, kind: CategoryKind, defaults: readonly string[] = SUGGESTED_CATEGORIES[kind]) {
  const names = new Map(defaults.map((name) => [categoryKey(name), { key: categoryKey(name), name, position: 0, icon: 'folder' as FolderIcon, color: 'purple' as FolderColor }]));
  for (const category of data.categories) if (category.kind === kind) {
    if (category.hidden) names.delete(category.key);
    else names.set(category.key, { key: category.key, name: category.name, position: category.position ?? 0,
      icon: isFolderIcon(category.icon) ? category.icon : 'folder', color: isFolderColor(category.color) ? category.color : 'purple' });
  }
  return [...names.values()].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

export function orderedItems<T>(data: LibraryCategories, kind: CategoryKind, items: readonly T[], keyOf: (item: T) => string, hidden = false) {
  const layout = new Map((data.layout ?? []).filter((x) => x.kind === kind).map((x) => [x.item, x]));
  return items.filter((item) => !!layout.get(keyOf(item))?.hidden === hidden)
    .map((item, index) => ({ item, index, position: layout.get(keyOf(item))?.position ?? 0 }))
    .sort((a, b) => a.position - b.position || a.index - b.index).map((x) => x.item);
}

export function movedBefore(keys: readonly string[], from: string, to: string): string[] {
  if (from === to || !keys.includes(from) || !keys.includes(to)) return [...keys];
  const result = keys.filter((key) => key !== from);
  result.splice(result.indexOf(to), 0, from);
  return result;
}

/** Drop onto a slot: forward moves land after the target, backward moves before it. */
export function movedTo(keys: readonly string[], from: string, to: string): string[] {
  const target = keys.indexOf(to);
  if (from === to || !keys.includes(from) || target < 0) return [...keys];
  const result = keys.filter((key) => key !== from);
  result.splice(target, 0, from);
  return result;
}

export function categoryShelves<T>(data: LibraryCategories, kind: CategoryKind, items: readonly T[], keyOf: (item: T) => string, defaults?: readonly string[]) {
  const options = categoryOptions(data, kind, defaults);
  const visible = new Set(options.map((x) => x.key));
  const byItem = new Map(data.assignments.filter((a) => a.kind === kind).map((a) => [a.item, a.category]));
  const buckets = new Map<string, T[]>();
  const uncategorized: T[] = [];
  for (const item of items) {
    const category = byItem.get(keyOf(item));
    if (!category || !visible.has(category)) uncategorized.push(item);
    else { const members = buckets.get(category) ?? []; members.push(item); buckets.set(category, members); }
  }
  return {
    shelves: options.map(({ key, name, icon, color }) => ({ key, name, icon, color, items: buckets.get(key) ?? [] })),
    uncategorized,
  };
}
