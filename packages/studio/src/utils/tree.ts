
export interface TreeNode<T> {
  id: string;
  label: string;
  type: 'folder' | 'item' | string;
  children?: TreeNode<T>[];
  data?: T;
  isExpanded?: boolean; // Hint for initial render (e.g. search match)
}

export function buildTree<T extends { name: string }>(
  items: T[],
  getPath: (item: T) => string,
  filterText: string = '',
  itemType: string = 'item'
): TreeNode<T>[] {
  const root: TreeNode<T>[] = [];
  const map: Record<string, TreeNode<T>> = {};
  const query = filterText.toLowerCase().trim();

  // Helper to get or create folder node
  const getOrCreateFolder = (pathSegments: string[], fullPath: string): TreeNode<T> => {
    if (map[fullPath]) return map[fullPath];

    const label = pathSegments[pathSegments.length - 1]
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const node: TreeNode<T> = {
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
  items.forEach(item => {
    const pathVal = getPath(item);
    // Normalize path separators
    const normalizedPath = pathVal.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');

    // If it's at root (no slashes), just add to root
    if (parts.length === 1) {
      root.push({
        id: pathVal, // Use path as ID for tree node
        label: item.name,
        type: itemType,
        data: item
      });
      return;
    }

    // It's in a folder
    const folderParts = parts.slice(0, -1);
    const folderPath = folderParts.join('/');
    const folder = getOrCreateFolder(folderParts, folderPath);

    folder.children!.push({
      id: pathVal,
      label: item.name,
      type: itemType,
      data: item
    });
  });

  // 2. Sort function
  const sortNodes = (nodes: TreeNode<T>[]) => {
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
  const filterNode = (node: TreeNode<T>): boolean => {
    const matchesSelf = node.label.toLowerCase().includes(query);

    if (node.type === itemType) {
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

    return matchesSelf;
  };

  // Apply filter
  const filteredRoot = root.filter(node => filterNode(node));
  sortNodes(filteredRoot);

  return filteredRoot;
}

// Backward compatibility for existing tests if needed, or update tests
// I will update tests, so I don't strictly need this, but it might help if I missed any import.
import { Composition } from '../context/StudioContext';
export function buildCompositionTree(compositions: Composition[], filterText: string = ''): TreeNode<Composition>[] {
  return buildTree(compositions, c => c.id, filterText, 'composition');
}
