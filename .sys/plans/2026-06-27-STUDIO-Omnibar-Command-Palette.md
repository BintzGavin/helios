# Context & Goal
- **Objective**: Upgrade the "Composition Switcher" into a full-featured "Omnibar" (Command Palette) that allows searching and executing Commands, managing Assets, and switching Compositions from a unified interface.
- **Trigger**: "Vision Gap" - Studio lacks a centralized command center for discoverability and asset management. Current "Switcher" is limited to compositions only.
- **Impact**: Improves "Agent Experience" and Developer Experience by unifying navigation and execution. Bridges the gap towards a full IDE experience, making features like Export, Loop, and Snapshots more discoverable.

# File Inventory
- **Create**:
    - `packages/studio/src/components/Omnibar.tsx`: New component replacing `CompositionSwitcher`.
    - `packages/studio/src/components/Omnibar.css`: Styles for the Omnibar.
- **Modify**:
    - `packages/studio/src/App.tsx`: Replace `CompositionSwitcher` with `Omnibar` and update the header button.
    - `packages/studio/src/context/StudioContext.tsx`: Rename/Alias `isSwitcherOpen` to `isOmnibarOpen` (and setters) for clarity.
    - `packages/studio/src/components/CompositionSwitcher.tsx`: Delete this file (functionality moved to `Omnibar.tsx`).
- **Read-Only**:
    - `packages/studio/src/components/GlobalShortcuts.tsx`: Verify keyboard shortcut integration.

# Implementation Spec
- **Architecture**:
    - The `Omnibar` will be a modal overlay using a standard "Command Palette" pattern (search input top, scrollable list below).
    - It will aggregate three data sources into a single searchable list:
        1.  **Commands**: Static definitions wrapping `StudioContext` actions (e.g., `toggleLoop`, `takeSnapshot`, `exportVideo`, `toggleMute`).
        2.  **Compositions**: Derived from `compositions` context (existing behavior).
        3.  **Assets**: Derived from `assets` context.
    - **Items Interface**:
        ```typescript
        interface OmnibarItem {
            id: string;
            type: 'composition' | 'command' | 'asset';
            label: string;
            description?: string;
            icon?: React.ReactNode;
            action: () => void;
            keywords?: string[]; // For fuzzy matching
        }
        ```
- **Pseudo-Code**:
    ```typescript
    // Inside Omnibar component
    const { compositions, assets, toggleLoop, takeSnapshot, ... } = useStudio();

    // Define Commands
    const commands: OmnibarItem[] = [
        { id: 'cmd-loop', type: 'command', label: 'Toggle Loop', action: toggleLoop },
        { id: 'cmd-snap', type: 'command', label: 'Take Snapshot', action: takeSnapshot },
        { id: 'cmd-render', type: 'command', label: 'Start Render', action: () => openRenderModal() },
        { id: 'cmd-mute', type: 'command', label: 'Toggle Mute', action: toggleMute },
        // ...
    ];

    // Map Compositions
    const compItems = compositions.map(c => ({
        type: 'composition',
        label: c.name,
        action: () => setActiveComposition(c)
    }));

    // Map Assets
    const assetItems = assets.map(a => ({
        type: 'asset',
        label: a.name,
        action: () => copyToClipboard(a.url) // or a.relativePath
    }));

    const allItems = [...commands, ...compItems, ...assetItems];
    const filtered = allItems.filter(item => match(item.label, query));

    // Render logic with "Headers" for each group (Commands, Compositions, Assets)
    ```
- **Public API Changes**:
    - `StudioContext`: `isSwitcherOpen` -> `isOmnibarOpen` (Refactoring).
- **Dependencies**: None.

# Test Plan
- **Verification**:
    1. Run `npx helios studio`.
    2. Press `Cmd+K` (or click the header button).
    3. **Search "Loop"**: Verify "Toggle Loop" command appears.
    4. **Search "Logo"**: Verify asset appears (if "logo" exists in assets).
    5. **Search "Comp"**: Verify compositions appear.
    6. **Execute Command**: Select "Toggle Loop" -> Verify loop state changes in UI.
    7. **Select Asset**: Select an asset -> Verify its URL is copied to clipboard (check console or paste).
    8. **Switch Composition**: Select a composition -> Verify active composition changes.
- **Success Criteria**:
    - Omnibar replaces the old Switcher functionality completely.
    - All three categories (Commands, Compositions, Assets) are searchable and actionable.
    - UI handles empty states and keyboard navigation (Arrow keys, Enter, Escape).
- **Edge Cases**:
    - Search yields no results.
    - Fast typing/filtering performance.
    - Asset URL copying failure (permissions).
