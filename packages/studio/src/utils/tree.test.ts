import { describe, it, expect } from 'vitest';
import { buildCompositionTree, buildTree } from './tree';
import { Composition } from '../context/StudioContext';

describe('buildCompositionTree (Backward Compatibility)', () => {
  const mockCompositions: Composition[] = [
    { id: 'root-comp', name: 'Root Comp', url: '' },
    { id: 'folder/comp-a', name: 'Comp A', url: '' },
    { id: 'folder/sub/comp-b', name: 'Comp B', url: '' },
    { id: 'folder/comp-c', name: 'Comp C', url: '' },
    { id: 'other/comp-d', name: 'Comp D', url: '' }
  ];

  it('builds a hierarchical tree', () => {
    const tree = buildCompositionTree(mockCompositions);

    // Sort order: folders first
    expect(tree[0].type).toBe('folder');
    expect(tree[0].label).toBe('Folder');
    expect(tree[1].type).toBe('folder');
    expect(tree[1].label).toBe('Other');
    expect(tree[2].type).toBe('composition');
    expect(tree[2].label).toBe('Root Comp');

    // Check Folder children
    const folder = tree[0];
    expect(folder.children).toHaveLength(3); // sub (folder), comp-a, comp-c
    // sub folder should be first
    expect(folder.children![0].type).toBe('folder');
    expect(folder.children![0].label).toBe('Sub');

    const sub = folder.children![0];
    expect(sub.children).toHaveLength(1);
    expect(sub.children![0].label).toBe('Comp B');
  });

  it('filters the tree and expands matches', () => {
    const tree = buildCompositionTree(mockCompositions, 'Comp B');

    // Should contain Folder -> Sub -> Comp B
    expect(tree).toHaveLength(1);
    expect(tree[0].label).toBe('Folder');
    expect(tree[0].isExpanded).toBe(true);

    const sub = tree[0].children![0];
    expect(sub.label).toBe('Sub');
    expect(sub.isExpanded).toBe(true);

    expect(sub.children![0].label).toBe('Comp B');
  });
});

describe('buildTree (Generic)', () => {
  interface MockItem {
    id: string;
    name: string;
    path: string;
  }

  const mockItems: MockItem[] = [
    { id: '1', name: 'Item 1', path: 'folder/item1.txt' },
    { id: '2', name: 'Item 2', path: 'item2.txt' },
    { id: '3', name: 'Item 3', path: 'folder/sub/item3.txt' }
  ];

  it('builds tree using custom path getter', () => {
    const tree = buildTree(mockItems, (item) => item.path, '', 'file');

    // Expect Folder and Item 2 at root
    expect(tree).toHaveLength(2);
    expect(tree[0].label).toBe('Folder');
    expect(tree[0].type).toBe('folder');

    expect(tree[1].label).toBe('Item 2');
    expect(tree[1].type).toBe('file');

    // Check nested
    const folder = tree[0];
    expect(folder.children).toHaveLength(2); // sub, item1.txt

    const sub = folder.children![0];
    expect(sub.label).toBe('Sub');

    const item3Node = sub.children![0];
    expect(item3Node.label).toBe('Item 3');
    expect(item3Node.data).toEqual(mockItems[2]);
  });
});
