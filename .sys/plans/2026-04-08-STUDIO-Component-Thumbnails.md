#### 1. Context & Goal
- **Objective**: Implement visual rendering/thumbnails of components from the component registry within the existing `ComponentsPanel`.
- **Trigger**: The Studio domain vision in the README implies a WYSIWYG editing experience. The current `ComponentsPanel` only shows text descriptions of components. To bridge the gap, users need visual feedback of what a component looks like before installing it.
- **Impact**: Improves the "Components" panel by giving visual feedback to developers, fulfilling the Studio UI vision, and reducing the friction of finding/previewing component functionality.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/ComponentsPanel/ComponentPreview.tsx` (To handle rendering a sandboxed preview)
- **Modify**:
  - `packages/studio/src/components/ComponentsPanel/ComponentsPanel.tsx` (To integrate the preview)
  - `packages/studio/src/components/ComponentsPanel/ComponentsPanel.css` (To style the preview)
- **Read-Only**:
  - `packages/studio/src/components/ComponentsPanel/ComponentsPanel.test.tsx` (To ensure existing tests pass and guide new test creation)

#### 3. Implementation Spec
- **Architecture**: The `ComponentsPanel` currently fetches a list of `ComponentDefinition`s. I'll need to extend the backend API to include a `thumbnailUrl` or base64 `thumbnail` in the `ComponentDefinition` or implement a `ComponentPreview` component that dynamically renders the component in a sandboxed `iframe` or directly if safe. Given Helios components are code, an image thumbnail fetched from the registry is safer and faster. Assuming the registry provides a thumbnail, I will modify `ComponentsPanel` to display it.
- **Pseudo-Code**:
  - Update `ComponentDefinition` interface in `ComponentsPanel.tsx` to include `thumbnail?: string`.
  - In the `component-card` rendering loop, add an `img` tag or a placeholder div if `comp.thumbnail` is present.
  - Add CSS classes for `.component-thumbnail` in `ComponentsPanel.css` to restrict size and maintain aspect ratio.
- **Public API Changes**: None directly, relies on backend API changes.
- **Dependencies**: The CLI backend API `/api/components` needs to be updated to serve thumbnails if it doesn't already.

#### 4. Test Plan
- **Verification**: Run `cd packages/studio && npx vitest src/components/ComponentsPanel/ComponentsPanel.test.tsx --run` to verify tests pass.
- **Success Criteria**: Verify the UI handles rendering the Component definitions correctly, including the new visual thumbnail section.
- **Edge Cases**: Missing thumbnails should fallback gracefully to a placeholder or not render the image tag.