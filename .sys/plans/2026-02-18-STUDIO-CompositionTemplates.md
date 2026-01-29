# 2026-02-18-STUDIO-CompositionTemplates.md

## 1. Context & Goal
- **Objective**: Enable users to select from multiple templates (Vanilla Canvas, Vanilla DOM, React Canvas, React DOM) when creating a new composition in Helios Studio.
- **Trigger**: Vision Gap - The `README.md` promises a "Framework-agnostic" environment, but currently, the "Create Composition" feature only generates a hardcoded Vanilla JS + Canvas template. This forces users to manually delete and rewrite code for other use cases.
- **Impact**: Significantly improves Developer Experience (DX) by providing "batteries-included" starting points for the most common workflows, validating the "Framework-agnostic" vision.

## 2. File Inventory
- **Modify**: `packages/studio/src/server/discovery.ts` (Add template logic and file definitions)
- **Modify**: `packages/studio/vite-plugin-studio-api.ts` (Update API to accept `template` parameter)
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Update `createComposition` signature)
- **Modify**: `packages/studio/src/components/CreateCompositionModal.tsx` (Add template selection UI)

## 3. Implementation Spec

### Architecture
- **Backend (`discovery.ts`)**: Introduce a `TEMPLATES` registry mapping template IDs to a file structure generator. The `createComposition` function will use this registry to populate the new directory.
- **API**: The POST `/api/compositions` endpoint will accept an optional `template` string in the request body.
- **Frontend**: The Creation Modal will expose a `<select>` dropdown populated with available templates.

### Templates
1.  **Vanilla Canvas** (Default): Existing behavior (single `composition.html` with inline script).
2.  **Vanilla DOM**: `composition.html` + `src/main.js` (HTML/CSS animation).
3.  **React Canvas**: `composition.html` + `src/main.tsx` (React mounting a Canvas).
4.  **React DOM**: `composition.html` + `src/main.tsx` (React mounting DOM elements).

### Pseudo-Code

**`packages/studio/src/server/discovery.ts`**
```typescript
const TEMPLATES = {
  'vanilla-canvas': { ... },
  'vanilla-dom': { ... },
  'react-canvas': { ... },
  'react-dom': { ... }
};

export function createComposition(rootDir: string, name: string, templateId = 'vanilla-canvas') {
  // ... validation ...
  const template = TEMPLATES[templateId] || TEMPLATES['vanilla-canvas'];
  // ... write files recursively ...
}
```

**`packages/studio/src/components/CreateCompositionModal.tsx`**
- Add state `template` (default 'vanilla-canvas').
- Add `<select>` element to UI.
- Pass `template` to `createComposition(name, template)`.

### Dependencies
- None. Relies on existing Studio Vite config (which already includes `@vitejs/plugin-react`) to serve React templates.

## 4. Test Plan
- **Verification**:
    1.  Start Studio: `npm run dev` in `packages/studio`.
    2.  Open "Create Composition" modal.
    3.  Select "React DOM" and create "My React Comp".
    4.  Verify the folder structure is created (has `src/main.tsx`).
    5.  Verify the composition loads in the preview iframe (React renders).
    6.  Repeat for "Vanilla DOM" and "Vanilla Canvas".
- **Success Criteria**:
    -  User can select a template.
    -  Files are generated correctly for the selected template.
    -  Preview loads without errors for all supported templates.
- **Edge Cases**:
    -  Invalid template ID sent to API (should fallback to default).
    -  React template loading in an environment without React plugin (should work in Studio as it has the plugin).
