import { Composition } from '../context/StudioContext';

export interface TreeNode {
  id: string;
  label: string;
  type: 'folder' | 'composition';
  children?: TreeNode[];
  data?: Composition;
  isExpanded?: boolean; // Hint for initial render (e.g. search match)
}

export function buildCompositionTree(compositions: Composition[], filterText: string = ''): TreeNode[] {
  const root: TreeNode[] = [];
  const map: Record<string, TreeNode> = {};
  const query = filterText.toLowerCase().trim();

  // Helper to get or create folder node
  const getOrCreateFolder = (pathSegments: string[], fullPath: string): TreeNode => {
    if (map[fullPath]) return map[fullPath];

    const label = pathSegments[pathSegments.length - 1]
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const node: TreeNode = {
      id: fullPath,
      label,
      type: 'folder',
      children: [],
      isExpanded: undefined
    };

    map[fullPath] = node;

    // Attach to parent
    if (pathSegments.length > 1) {
      const parentPath = pathSegments.slice(0, -1).join('/');
      const parentSegments = pathSegments.slice(0, -1);
      const parent = getOrCreateFolder(parentSegments, parentPath);
      parent.children!.push(node);
    } else {
      root.push(node);
    }

    return node;
  };

  // 1. Build full tree first
  compositions.forEach(comp => {
    const parts = comp.id.split('/');

    // If it's at root (no slashes), just add to root
    if (parts.length === 1) {
      root.push({
        id: comp.id,
        label: comp.name,
        type: 'composition',
        data: comp
      });
      return;
    }

    // It's in a folder
    const folderParts = parts.slice(0, -1);
    const folderPath = folderParts.join('/');
    const folder = getOrCreateFolder(folderParts, folderPath);

    folder.children!.push({
      id: comp.id,
      label: comp.name,
      type: 'composition',
      data: comp
    });
  });

  // 2. Sort function
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === b.type) return a.label.localeCompare(b.label);
      return a.type === 'folder' ? -1 : 1; // Folders first
    });
    nodes.forEach(n => {
      if (n.children) sortNodes(n.children);
    });
  };

  // 3. Filter logic
  if (!query) {
    sortNodes(root);
    return root;
  }

  // Recursive filter function
  // Returns true if node or any child matches
  const filterNode = (node: TreeNode): boolean => {
    const matchesSelf = node.label.toLowerCase().includes(query);

    if (node.type === 'composition') {
      return matchesSelf;
    }

    // It's a folder
    if (!node.children) return false;

    // Filter children
    const matchingChildren = node.children.filter(child => filterNode(child));

    if (matchingChildren.length > 0) {
      node.children = matchingChildren;
      node.isExpanded = true; // Expand if children match
      return true;
    }

    // If folder itself matches, keep it (and maybe show empty? or all children?)
    // Standard behavior: if folder matches, show all children.
    // But here we filtered children recursively.
    // Let's say if folder matches, we keep matching children.
    // If folder matches but no children match, do we show it? Yes.
    // If folder matches, should we show ALL children?
    // Often yes. But let's stick to strict filtering for now to avoid clutter.
    return matchesSelf;
  };

  // Apply filter
  const filteredRoot = root.filter(node => filterNode(node));
  sortNodes(filteredRoot);

  return filteredRoot;
}
