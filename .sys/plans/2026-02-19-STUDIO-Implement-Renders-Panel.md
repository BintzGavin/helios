# Context & Goal
- **Objective**: Implement the Renders Panel in the Studio UI to track render jobs and status.
- **Trigger**: Vision gap identified in `README.md` ("Renders Panel - Track rendering progress and manage render jobs") and missing from current `packages/studio` implementation.
- **Impact**: Enables users (and future agents) to visualize the rendering queue and job status, a critical feature for the production workflow.

# File Inventory
- **Create**:
  - `packages/studio/src/components/RendersPanel/RendersPanel.tsx`: Component to display list of render jobs.
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Container component to manage sidebar tabs (Assets/Renders).
  - `packages/studio/src/components/Sidebar/Sidebar.css`: Styles for the tabbed interface.
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx`: Add `RenderJob` type, `renderJobs` state, and mock actions.
  - `packages/studio/src/App.tsx`: Replace direct `AssetsPanel` usage with new `Sidebar` component.
- **Read-Only**:
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: For reference on list styling.

# Implementation Spec
- **Architecture**:
  - **Context**: `StudioContext` will hold the source of truth for `renderJobs`. Since we don't have a backend yet, this will be mocked with a `startRender` function that simulates progress via `setInterval`.
  - **UI**: A tabbed `Sidebar` component will switch between `AssetsPanel` and `RendersPanel`.
  - **RendersPanel**: Will list jobs using a clean, tabular or list layout, showing status (icon), composition name, progress bar, and actions.

- **Pseudo-Code (Context)**:
  ```typescript
  interface RenderJob {
    id: string;
    status: 'queued' | 'rendering' | 'completed' | 'failed';
    progress: number; // 0-1
    compositionId: string;
    outputUrl?: string;
    error?: string;
    createdAt: number;
  }

  // In StudioProvider:
  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);

  const startRender = (compositionId: string) => {
    const newJob = { id: uuid(), status: 'queued', progress: 0, ... };
    setRenderJobs(prev => [...prev, newJob]);

    // Mock simulation
    setTimeout(() => {
        // Update to rendering
        // Interval to increment progress
        // Finish when progress >= 1
    }, 1000);
  }
  ```

- **Pseudo-Code (Sidebar)**:
  ```tsx
  const Sidebar = () => {
    const [activeTab, setActiveTab] = useState<'assets' | 'renders'>('assets');

    return (
      <div className="sidebar-container">
        <div className="sidebar-tabs">
          <button onClick={() => setActiveTab('assets')}>Assets</button>
          <button onClick={() => setActiveTab('renders')}>Renders</button>
        </div>
        <div className="sidebar-content">
           {activeTab === 'assets' ? <AssetsPanel/> : <RendersPanel/>}
        </div>
      </div>
    )
  }
  ```

- **Public API Changes**:
  - `StudioContext` exports `renderJobs` and `startRender`.

- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Verify file creation: `ls -F packages/studio/src/components/Sidebar/` and `packages/studio/src/components/RendersPanel/`.
  2. Run `npx helios studio`.
  3. Verify the Sidebar now shows "Assets" and "Renders" tabs.
  4. Click "Renders" tab.
  5. Verify empty state or mock initial jobs.
  6. Click a "Start Test Render" button (which should be added to the panel for verification purposes).
  7. Observe a new job appearing, status changing to "Rendering", and progress bar filling up to 100%.

- **Success Criteria**:
  - UI renders without errors.
  - Tabs switch correctly.
  - Render job lifecycle (pending -> rendering -> completed) is visually distinct.
- **Edge Cases**:
  - Rapidly switching tabs while rendering.
  - Multiple concurrent mock renders.
