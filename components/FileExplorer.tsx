"use client";
import { useState, useEffect, DragEvent } from 'react';
import { Tree, NodeRendererProps } from 'react-arborist';
import { FileNode } from '../lib/lessons';
import { useLessonStore } from '../lib/store';

export default function FileExplorer({ tree }: { tree: FileNode[] }) {
  const updateFile = useLessonStore((s) => s.updateFile);
  const moveFile = useLessonStore((s) => s.moveFile);
  const selectFile = useLessonStore((s) => s.selectFile);
  const currentFile = useLessonStore((s) => s.currentFile);

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
    dest: string | null
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
        for (const n of newNodes) {
          next = insertNode(next, dest, n);
        }
        return next;
      });
    }
  };

  const Node = ({ node, style, dragHandle }: NodeRendererProps<FileNode>) => {
    const isFile = node.data.type === 'file';
    return (
      <div
        style={style}
        ref={dragHandle}
        className={`file-item ${
          isFile && currentFile === node.data.path ? 'active' : ''
        }`}
        onClick={() => {
          if (isFile) selectFile(node.data.path);
          else node.toggle();
        }}
        onDrop={async (e) => {
          if (!Array.from(e.dataTransfer.types).includes('Files')) return;
          e.preventDefault();
          e.stopPropagation();
          await handleExternalDrop(e, node.data.type === 'folder' ? node.data.path : null);
        }}
        onDragOver={(e) => {
          if (Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault();
        }}
      >
        {isFile ? `📄 ${node.data.name}` : `📁 ${node.data.name}`}
      </div>
    );
  };

  return (
    <div
      className={`file-explorer ${rootOver ? 'drag-target' : ''}`}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          setRootOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setRootOver(false);
      }}
      onDrop={async (e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          setRootOver(false);
          await handleExternalDrop(e, null);
        }
      }}
    >
      <Tree
        data={nodes}
        onMove={({ dragIds, parentId, index }) => moveNode(dragIds[0], parentId, index)}
        idAccessor={(n) => n.path}
        openByDefault
        width="100%"
        height={400}
        rowHeight={24}
      >
        {Node}
      </Tree>
      <p className="drop-hint">Drag files or folders here</p>
    </div>
  );
}

