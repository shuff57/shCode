'use client';

import { cloneElement, createContext, useContext, useEffect, useId, useState, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, pointerWithin,
  useDroppable, useSensor, useSensors, type CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { libraryClasses as styles } from './library-ui';

type Kind = 'folder' | 'item';
type DragData = { type: Kind | 'move-folder'; key: string; label: string };
const dragId = (type: DragData['type'], key: string) => `${type}:${key}`;
const Enabled = createContext(false);

// Folder destinations accept an item only when the pointer actually enters
// them. Elsewhere, sorting stays within folders or within the current item list.
const collisions: CollisionDetection = (args) => {
  const type = args.active.data.current?.type;
  if (type === 'item' && args.pointerCoordinates) {
    const folders = pointerWithin({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === 'move-folder' || c.data.current?.type === 'folder') });
    if (folders.length) return folders;
  }
  return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === type
    || (type === 'item' && !args.pointerCoordinates && (c.data.current?.type === 'folder' || c.data.current?.type === 'move-folder'))) });
};

export function LibraryDragDrop({ enabled, folders, items, onSort, onMove, children }: {
  enabled: boolean; folders: string[]; items: string[];
  onSort: (type: Kind, from: string, to: string) => void;
  onMove: (item: string, folder: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  const [active, setActive] = useState<DragData | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  return <Enabled.Provider value={enabled}>
    <DndContext id={id} sensors={sensors} collisionDetection={collisions}
      onDragStart={({ active }) => setActive(active.data.current as DragData)}
      onDragCancel={() => setActive(null)}
      onDragEnd={({ active, over }) => {
        setActive(null);
        if (!enabled || !over) return;
        const source = active.data.current as DragData | undefined;
        const target = over.data.current as DragData | undefined;
        if (!source || !target) return;
        if (source.type === 'item' && (target.type === 'move-folder' || target.type === 'folder')) onMove(source.key, target.key);
        else if (source.type !== 'move-folder' && source.type === target.type && source.key !== target.key) onSort(source.type, source.key, target.key);
      }}>
      <SortableContext items={[...folders.map((key) => dragId('folder', key)), ...items.map((key) => dragId('item', key))]}
        strategy={(args) => (args.activeIndex < folders.length) === (args.overIndex < folders.length) ? rectSortingStrategy(args) : null}>
        {children}
      </SortableContext>
      {mounted && createPortal(<DragOverlay dropAnimation={null}>
        {active && <div className={styles.dragPreview}><GripVertical size={16} aria-hidden="true" />{active.label}</div>}
      </DragOverlay>, document.body)}
    </DndContext>
  </Enabled.Provider>;
}

type ElementProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> };

export function LibrarySortable({ type, itemKey, label, disabled = false, children }: {
  type: Kind; itemKey: string; label: string; disabled?: boolean;
  children: ReactElement<ElementProps>;
}) {
  const allowed = useContext(Enabled);
  const enabled = allowed && !disabled;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: dragId(type, itemKey), data: { type, key: itemKey, label } satisfies DragData, disabled: !enabled,
  });
  const element = children;
  // Folder and picture preview buttons also act as drag surfaces. All other
  // controls keep their normal pointer behavior (rename, delete, play, menus).
  const canStart = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    const control = target.closest('button, a, input, select, textarea, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="menuitem"]');
    return !control || control.hasAttribute('data-library-drag-surface');
  };
  return cloneElement(element, {
    ...(enabled ? attributes : {}),
    ref: setNodeRef,
    role: element.props.role ?? 'group',
    tabIndex: enabled ? 0 : element.props.tabIndex,
    'aria-label': enabled ? `Reorder ${type} ${label}` : element.props['aria-label'],
    'data-library-sortable': type,
    'data-library-key': itemKey,
    className: `${element.props.className ?? ''} ${enabled ? styles.sortableCard : ''} ${isOver && !isDragging ? styles.dropTarget : ''}`,
    draggable: false,
    onDragStart: (event: React.DragEvent) => event.preventDefault(),
    onMouseDown: (event: React.MouseEvent<HTMLElement>) => {
      element.props.onMouseDown?.(event);
      if (enabled && !event.defaultPrevented && canStart(event.target)) listeners?.onMouseDown?.(event);
    },
    onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
      element.props.onTouchStart?.(event);
      if (enabled && !event.defaultPrevented && canStart(event.target)) listeners?.onTouchStart?.(event);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      element.props.onKeyDown?.(event);
      if (enabled && !event.defaultPrevented && event.target === event.currentTarget) listeners?.onKeyDown?.(event);
    },
    style: { ...element.props.style, transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : element.props.style?.opacity },
  } as ElementProps);
}

export function LibraryFolderDrop({ folderKey, label }: { folderKey: string; label: string }) {
  const enabled = useContext(Enabled);
  const { setNodeRef, isOver } = useDroppable({
    id: dragId('move-folder', folderKey), data: { type: 'move-folder', key: folderKey, label } satisfies DragData, disabled: !enabled,
  });
  return <span ref={setNodeRef} className={`${styles.folderDrop} ${isOver ? styles.dropTarget : ''}`}>
    {label}
  </span>;
}
