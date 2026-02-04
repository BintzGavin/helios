# Context & Goal
- **Objective**: Implement a visual "Components Panel" in Helios Studio to browse and install components from the registry.
- **Trigger**: The README envisions a "Studio IDE", and the Backlog tracks a "Component Registry", but currently the registry is only accessible via the CLI (`helios add`). This disconnect forces users to leave the UI to perform common scaffolding tasks.
- **Impact**: Improves Agent Experience (AX) and Developer Experience (DX) by making the component library discoverable and installable directly within the Studio environment.

# File Inventory

## Create
- `packages/studio/src/components/ComponentsPanel/ComponentsPanel.tsx`: The main panel UI component.
- `packages/studio/src/components/ComponentsPanel/ComponentsPanel.css`: Styles for the panel.
- `packages/studio/src/components/ComponentsPanel/ComponentItem.tsx`: Individual component card component.
- `packages/studio/src/server/types.ts`: Shared types for the server (e.g., `ComponentDefinition`).

## Modify
- `packages/studio/src/server/plugin.ts`: Update `StudioPluginOptions` to accept `components` and expose `/api/components` endpoints.
- `packages/studio/src/context/StudioContext.tsx`: Add API methods for listing and installing components, and state management.
- `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add "Components" tab to the sidebar navigation.
- `packages/cli/src/commands/studio.ts`: Inject the CLI registry into the Studio plugin initialization.
- `packages/studio/src/types.ts`: Add client-side types for Components to match the server types.
- `packages/studio/vite.config.ts`: Add mock components to the plugin configuration for standalone dev mode.

## Read-Only
- `packages/cli/src/registry/manifest.ts`: The source of truth for components (consumed by CLI and injected into Studio).
- `packages/cli/src/registry/types.ts`: The original type definition (to be mirrored in Studio to avoid circular dependency).

# Implementation Spec

## Architecture
- **Inversion of Control**: The Studio Plugin will not import the registry directly (to avoid circular dependencies). Instead, the CLI (which acts as the host) will inject the registry manifest into the `studioApiPlugin` configuration.
- **API Design**:
  - `GET /api/components`: Returns the list of available components.
  - `POST /api/components/install`: Accepts `{ name }`, finds the component in the injected registry, and writes files to the user's project (reusing logic similar to `helios add`).
- **UI Pattern**: A new Sidebar tab "Components" displaying a grid/list of components. Clicking "Install" triggers the API and shows a Toast notification.

## Pseudo-Code

### `packages/studio/src/server/plugin.ts`
```typescript
interface StudioPluginOptions {
  studioRoot?: string;
  components?: ComponentDefinition[]; // Injected from CLI
}

// Inside configureMiddlewares:
server.middlewares.use('/api/components', async (req, res) => {
  const url = req.url || '/';

  // GET /api/components - List components
  if (req.method === 'GET' && (url === '/' || url === '')) {
    const list = options.components || [];
    // Map to simplified objects if needed, or return full definitions
    return json(list);
  }

  // POST /api/components/install - Install component
  if (req.method === 'POST' && url === '/install') {
    const { name } = await getBody(req);
    const component = options.components?.find(c => c.name === name);

    if (!component) {
      return error(404, 'Component not found');
    }

    // Determine target directory (e.g., src/components)
    // Use project root detection logic
    const projectRoot = getProjectRoot(process.cwd());
    const targetBaseDir = path.join(projectRoot, 'src/components'); // Default to src/components

    // Write files
    for (const file of component.files) {
        // ... fs.writeFileSync ...
    }

    return json({ success: true, dependencies: component.dependencies });
  }
});
```

### `packages/studio/src/components/ComponentsPanel/ComponentsPanel.tsx`
```typescript
export const ComponentsPanel = () => {
  const { components, installComponent } = useStudio();

  // Render grid of ComponentItem
  return (
    <div className="components-panel">
      {components.length === 0 ? (
          <div className="empty-state">No components found</div>
      ) : (
          components.map(comp => (
            <ComponentItem key={comp.name} component={comp} onInstall={installComponent} />
          ))
      )}
    </div>
  );
};
```

### `packages/studio/src/context/StudioContext.tsx`
```typescript
// Add state
const [components, setComponents] = useState<ComponentDefinition[]>([]);

// Fetch on mount
useEffect(() => {
    fetch('/api/components').then(data => setComponents(data));
}, []);

// Install handler
const installComponent = async (name: string) => {
    try {
        await fetch('/api/components/install', { method: 'POST', body: { name } });
        addToast('Component installed', 'success');
        // Show dependencies toast if any
    } catch (e) {
        addToast('Failed to install', 'error');
    }
};
```

## Dependencies
- No external blockers.
- Relies on `packages/cli` existing structure.

# Test Plan

## Verification
1.  **Build CLI**: Run `npm run build:cli` in `packages/studio` to ensure server code compiles.
2.  **Mock Test**: Start `packages/studio` in dev mode (`npm run dev`) and verify the mock components appear in the new panel.
    - *Note*: Ensure `vite.config.ts` in `packages/studio` injects some mock data into `studioApiPlugin`.
3.  **CLI Integration**: Verify that `packages/cli` correctly passes the registry to the plugin.
    - This can be verified by code review or by running `npx helios studio` in a test project if possible, but the mock test covers the UI flow.

## Success Criteria
- "Components" tab appears in Sidebar.
- List of components is fetched from API.
- Clicking "Install" on a mock component (in dev) triggers the success Toast.
