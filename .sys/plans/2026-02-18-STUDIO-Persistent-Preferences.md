# 📋 STUDIO: Persistent Preferences

## 1. Context & Goal
- **Objective**: Persist user interface preferences (sidebar tab, timeline zoom, canvas settings, active composition) across page reloads to improve the developer experience.
- **Trigger**: "Vision Gap" - The README promises a "Browser-based development environment", but the current implementation resets all view settings on reload, degrading the "IDE" experience.
- **Impact**: Improves AX/DX by retaining working context (e.g. keeping the "Assets" tab open or "Transparency" toggled off).

## 2. File Inventory
- **Create**: `packages/studio/src/hooks/usePersistentState.ts` (New hook for localStorage management)
- **Modify**: `packages/studio/src/components/Sidebar/Sidebar.tsx` (Use hook for active tab)
- **Modify**: `packages/studio/src/components/Stage/Stage.tsx` (Use hook for zoom, pan, guides, transparency)
- **Modify**: `packages/studio/src/components/Timeline.tsx` (Use hook for timeline zoom)
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Persist active composition ID)
- **Read-Only**: `packages/studio/src/App.tsx` (Context reference)

## 3. Implementation Spec

### Architecture
- **Hook-based State**: Replace `useState` with `usePersistentState` for UI preferences.
- **Namespace**: All localStorage keys will be prefixed with `helios-studio:` to avoid collisions.
- **Lazy Initialization**: Read from storage only on mount.
- **JSON Serialization**: Support complex types (like `pan {x, y}`).

### Pseudo-Code

#### `packages/studio/src/hooks/usePersistentState.ts`
```typescript
import { useState, useEffect } from 'react';

export function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const prefixedKey = `helios-studio:${key}`;

  // Initialize state function
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(prefixedKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      console.warn(`Failed to load state for ${key}`, e);
      return initialValue;
    }
  });

  // Update storage effect
  useEffect(() => {
    try {
      localStorage.setItem(prefixedKey, JSON.stringify(state));
    } catch (e) {
      console.warn(`Failed to save state for ${key}`, e);
    }
  }, [prefixedKey, state]);

  return [state, setState];
}
```

#### `packages/studio/src/components/Sidebar/Sidebar.tsx`
- Import `usePersistentState` from `../../hooks/usePersistentState`.
- Replace `useState` for `activeTab`.
- Key: `'sidebar-active-tab'`.
- Default: `'compositions'`.

#### `packages/studio/src/components/Stage/Stage.tsx`
- Import `usePersistentState` from `../../hooks/usePersistentState`.
- Replace `useState` for:
  - `zoom` (Key: `'stage-zoom'`, Default: `1`)
  - `pan` (Key: `'stage-pan'`, Default: `{ x: 0, y: 0 }`)
  - `isTransparent` (Key: `'stage-transparent'`, Default: `true`)
  - `showGuides` (Key: `'stage-guides'`, Default: `false`)

#### `packages/studio/src/components/Timeline.tsx`
- Import `usePersistentState` from `../hooks/usePersistentState`.
- Replace `useState` for `zoom`.
- Key: `'timeline-zoom'`.
- Default: `0`.

#### `packages/studio/src/context/StudioContext.tsx`
- Modify the `useEffect` that fetches compositions:
  - Logic:
    ```typescript
    fetch('/api/compositions')
      .then(res => res.json())
      .then((data: Composition[]) => {
        setCompositions(data);

        let targetComp = null;

        // Try to restore from localStorage
        try {
           const savedId = localStorage.getItem('helios-studio:active-composition-id');
           if (savedId) {
             targetComp = data.find(c => c.id === JSON.parse(savedId));
           }
        } catch (e) {}

        // Fallback to first if not found
        if (!targetComp && data.length > 0) {
           targetComp = data[0];
        }

        // Only set if we found something and no active composition is set yet
        if (targetComp && !activeComposition) {
           setActiveComposition(targetComp);
        }
      })
    ```
- Update `setActiveComposition` wrapper or effect to save ID:
  ```typescript
  useEffect(() => {
    if (activeComposition) {
      localStorage.setItem('helios-studio:active-composition-id', JSON.stringify(activeComposition.id));
    }
  }, [activeComposition]);
  ```

## 4. Test Plan
- **Verification**:
  1. Start the studio (`npm run dev` in `packages/studio`).
  2. Change the Sidebar tab to "Assets".
  3. Toggle "Transparency" OFF in the Stage toolbar.
  4. Zoom the Timeline to a non-zero value.
  5. Select a different composition (if available).
  6. Reload the page (Cmd+R).
  7. Verify all settings are restored.
- **Success Criteria**: The UI state matches the state before reload.
- **Edge Cases**:
  - `localStorage` disabled (should not crash).
  - Composition ID deleted (should fallback to first).
