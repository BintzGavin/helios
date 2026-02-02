# STUDIO: Dynamic Template Discovery

#### 1. Context & Goal
- **Objective**: Implement dynamic discovery of composition templates via API to replace hardcoded lists in the UI.
- **Trigger**: The "Solid" template exists in the backend (`packages/studio/src/server/templates/solid.ts`) but is missing from the "Create Composition" modal because the list is hardcoded.
- **Impact**: Ensures all backend-supported templates (including future additions) are automatically available in the Studio UI, adhering to the "Framework-agnostic" vision.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/src/server/plugin.ts` (Add API endpoint)
  - `packages/studio/src/context/StudioContext.tsx` (Add template state and fetching)
  - `packages/studio/src/components/CreateCompositionModal.tsx` (Use dynamic list)
- **Read-Only**:
  - `packages/studio/src/server/templates/index.ts` (Source of available templates)

#### 3. Implementation Spec
- **Architecture**:
  - Expose a new API endpoint `GET /api/templates` in the Studio server.
  - Fetch this list in `StudioProvider` on mount.
  - Expose `templates` array in `StudioContext`.
  - Render options dynamically in `CreateCompositionModal`.

- **Pseudo-Code**:
  - **`server/plugin.ts`**:
    - Import `templates` from `./templates`.
    - Add middleware for `GET /api/templates`:
      ```typescript
      server.middlewares.use('/api/templates', (req, res, next) => {
        if (req.url === '/' || req.url === '') {
          const list = Object.values(templates).map(t => ({ id: t.id, label: t.label }));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(list));
          return;
        }
        next();
      });
      ```
  - **`context/StudioContext.tsx`**:
    - Add `TemplateInfo` interface `{ id: string, label: string }`.
    - Add `templates: TemplateInfo[]` to Context type.
    - In `StudioProvider`, `useEffect` to `fetch('/api/templates')` and `setTemplates`.
  - **`components/CreateCompositionModal.tsx`**:
    - Consume `templates` from `useStudio()`.
    - Replace hardcoded `<option>`s with `templates.map(...)`.
    - Ensure default value logic handles dynamic list (e.g. default to 'vanilla' if present, or first item).

- **Public API Changes**:
  - New endpoint: `GET /api/templates` -> `Array<{ id: string, label: string }>`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1.  Start Studio (`npm run dev`).
  2.  Check network tab for request to `/api/templates`.
  3.  Open "New Composition" modal.
  4.  Verify "Solid" is present in the dropdown.
  5.  Select "Solid" and create a composition.
  6.  Verify the new composition is created with SolidJS structure.
- **Success Criteria**:
  - "Solid" template is selectable.
  - Future templates added to `server/templates/index.ts` appear automatically.
- **Edge Cases**:
  - API failure (should fallback to empty list or basic default? UI should handle empty state or loading).
