"use client";
import { useState, useRef, DragEvent, Fragment, useEffect } from 'react';
import { FileNode } from '../lib/lessons';
import { useLessonStore } from '../lib/store';

export default function FileExplorer({ tree }: { tree: FileNode[] }) {
  const updateFile = useLessonStore((s) => s.updateFile);
  const moveFile = useLessonStore((s) => s.moveFile);
  const [nodes, setNodes] = useState<FileNode[]>(tree);
  useEffect(() => setNodes(tree), [tree]);
  const [rootOver, setRootOver] = useState(false);

  async function traverse(entry: any, base = ''): Promise<FileNode | null> {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file: File) => {
          const reader = new FileReader();
          reader.onload = () => {
            const path = base + entry.name;
            const content = reader.result as string;
            updateFile(path, content);
            resolve({
              type: 'file',
              name: entry.name,
              path,
              content,
            });
          };
          reader.readAsText(file);
        });
      });
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise<any[]>((res) =>
        reader.readEntries((ents: any[]) => res(ents))
      );
      const children: FileNode[] = [];
      for (const ent of entries) {
        const child = await traverse(ent, base + entry.name + '/');
        if (child) children.push(child);
      }
      return {
        type: 'folder',
        name: entry.name,
        path: base + entry.name,
        children,
      };
    }
    return null;
  }

  function removeNode(
    list: FileNode[],
    path: string
  ): [FileNode | null, FileNode[], string | null, number | null] {
    let removed: FileNode | null = null;
    let parent: string | null = null;
    let index: number | null = null;
    function recurse(nodes: FileNode[], p: string | null): FileNode[] {
      return nodes
        .map((n, i) => {
          if (n.path === path) {
            removed = n;
            parent = p;
            index = i;
            return null;
          }
          if (n.type === 'folder' && n.children) {
            const children = recurse(n.children, n.path);
            if (removed) {
              return { ...n, children };
            }
          }
          return n;
        })
        .filter(Boolean) as FileNode[];
    }
    const filtered = recurse(list, null);
    return [removed, filtered, parent, index];
  }

  function insertNode(
    list: FileNode[],
    folder: string | null,
    node: FileNode,
    index?: number
  ): FileNode[] {
    if (!folder) {
      const copy = [...list];
      const i = index !== undefined ? index : copy.length;
      copy.splice(i, 0, node);
      return copy;
    }
    return list.map((n) => {
      if (n.path === folder && n.type === 'folder') {
        const children = [...(n.children || [])];
        const i = index !== undefined ? index : children.length;
        children.splice(i, 0, node);
        return { ...n, children };
      }
      if (n.type === 'folder' && n.children) {
        return { ...n, children: insertNode(n.children, folder, node, index) };
      }
      return n;
    });
  }

  function getDropIndex(container: HTMLUListElement, y: number) {
    const items = Array.from(container.children).filter(
      (el) => !el.classList.contains('drop-indicator')
    ) as HTMLElement[];
    let idx = items.length;
    for (let i = 0; i < items.length; i++) {
      const box = items[i].getBoundingClientRect();
      if (y < box.top + box.height / 2) {
        idx = i;
        break;
      }
    }
    return idx;
  }

  const moveNode = (src: string, dest: string | null, index?: number) => {
    let target: string | null = null;
    setNodes((prev) => {
      const [removed, without, parent, origIndex] = removeNode(prev, src);
      if (!removed) return prev;
      const name = removed.name;
      target = dest ? `${dest}/${name}` : name;
      const updated = { ...removed, path: target };
      let insertAt = index;
      if (
        dest === parent &&
        insertAt !== undefined &&
        origIndex !== null &&
        origIndex < insertAt
      ) {
        insertAt -= 1;
      }
      return insertNode(without, dest, updated, insertAt);
    });
    if (target) {
      moveFile(src, target);
    }
  };

  const handleExternalDrop = async (
    e: DragEvent,
    dest: string | null,
    index?: number
  ) => {
    const items = Array.from(e.dataTransfer.items || []);
    const newNodes: FileNode[] = [];
    for (const item of items) {
      const entry = (item as any).webkitGetAsEntry?.();
      if (entry) {
        const node = await traverse(entry, dest ? dest + '/' : '');
        if (node) newNodes.push(node);
      }
    }
    if (newNodes.length) {
      setNodes((prev) => {
        let next = prev;
        let insertAt = index;
        for (const n of newNodes) {
          next = insertNode(next, dest, n, insertAt);
          if (insertAt !== undefined) insertAt++;
        }
        return next;
      });
    }
  };

  function FileList({
    list,
    parent,
  }: {
    list: FileNode[];
    parent: string | null;
  }) {
    const ref = useRef<HTMLUListElement>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const onDrop = async (e: DragEvent<HTMLUListElement>) => {
      e.preventDefault();
      if (!parent) setRootOver(false);
      const ul = ref.current;
      if (!ul) return;
      const index = getDropIndex(ul, e.clientY);
      setDropIndex(null);
      const internal = e.dataTransfer.getData('text/plain');
      if (internal) {
        moveNode(internal, parent, index);
      } else {
        await handleExternalDrop(e, parent, index);
      }
    };
    return (
      <ul
        ref={ref}
        onDragOver={(e) => {
          e.preventDefault();
          const ul = ref.current;
          if (ul) {
            setDropIndex(getDropIndex(ul, e.clientY));
          }
          if (!parent) setRootOver(true);
        }}
        onDragLeave={() => {
          if (!parent) setRootOver(false);
          setDropIndex(null);
        }}
        onDrop={onDrop}
      >
        {list.map((node, i) => (
          <Fragment key={node.path}>
            {dropIndex === i && <li className="drop-indicator" />}
            <FileItem node={node} />
          </Fragment>
        ))}
        {dropIndex === list.length && <li className="drop-indicator" />}
      </ul>
    );
  }

  function FileItem({ node }: { node: FileNode }) {
    const selectFile = useLessonStore((s) => s.selectFile);
    const currentFile = useLessonStore((s) => s.currentFile);
    const [over, setOver] = useState(false);
    if (node.type === 'folder') {
      return (
        <li
          className={`folder ${over ? 'drag-over' : ''}`}
          onDragEnter={() => setOver(true)}
          onDragLeave={() => setOver(false)}
        >
          <div
            className="file-item"
            onDrop={(e) => {
              e.stopPropagation();
              setOver(false);
              const src = e.dataTransfer.getData('text/plain');
              if (src) {
                moveNode(src, node.path);
              } else {
                handleExternalDrop(e, node.path);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            {`📁 ${node.name}`}
          </div>
          <FileList list={node.children || []} parent={node.path} />
        </li>
      );
    }
    return (
      <li
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/plain', node.path)}
        onClick={() => selectFile(node.path)}
        className={`file-item ${
          currentFile === node.path ? 'active' : ''
        }`}
      >
        {`📄 ${node.name}`}
      </li>
    );
  }

  return (
    <div className={`file-explorer ${rootOver ? 'drag-target' : ''}`}>
      <FileList list={nodes} parent={null} />
      <p className="drop-hint">Drag files or folders here</p>
    </div>
  );
}
