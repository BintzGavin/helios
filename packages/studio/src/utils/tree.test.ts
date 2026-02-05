import { describe, it, expect } from 'vitest';
import { buildCompositionTree } from './tree';
import { Composition } from '../context/StudioContext';

describe('buildCompositionTree', () => {
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

  it('filters folders by name', () => {
    const tree = buildCompositionTree(mockCompositions, 'Sub');
    // Should show Folder -> Sub -> Comp B
    // Because Sub matches, we show it.
    expect(tree).toHaveLength(1);
    expect(tree[0].label).toBe('Folder');

    const sub = tree[0].children![0];
    expect(sub.label).toBe('Sub');
    // Children of matching folder are included?
    // My logic: if matchesSelf, return true.
    // Logic for children filtering is:
    // const matchingChildren = node.children.filter...
    // if matchingChildren > 0, keep children.
    // if not, but matchesSelf, return true.
    // So 'Sub' matches. 'Comp B' does not match 'Sub'.
    // So 'Sub' has 0 matching children.
    // But 'Sub' matches self. So 'Sub' is returned.
    // 'Sub' children list will be empty?
    // Let's check logic:
    // `const matchingChildren = node.children.filter(...)`
    // If length 0, `node.children` is NOT updated (stays original full list? No).
    // Wait, I didn't update `node.children` if length 0.
    // `if (matchingChildren.length > 0) { node.children = matchingChildren; ... }`
    // So if 0 matches, node.children remains UNTOUCHED (all children).
    // And matchesSelf is true.
    // So we return true.
    // So we see Sub and ALL its children.
    // This is correct behavior for folder match.

    expect(sub.children).toHaveLength(1);
    expect(sub.children![0].label).toBe('Comp B');
  });
});
