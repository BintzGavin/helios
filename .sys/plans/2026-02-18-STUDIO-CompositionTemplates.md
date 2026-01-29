# Context & Goal
- **Objective**: Implement a template system for creating new compositions in Helios Studio, supporting Vanilla JS and React initially.
- **Trigger**: The "Create Composition" feature currently hardcodes a Vanilla JS template, but the vision is framework-agnostic.
- **Impact**: Enables users to quickly bootstrap compositions in their preferred framework (React, etc.) directly from the Studio UI.

# File Inventory
- **Create**:
  - `packages/studio/src/server/templates/index.ts`: Registry of available templates.
  - `packages/studio/src/server/templates/vanilla.ts`: Vanilla JS template definition.
  - `packages/studio/src/server/templates/react.ts`: React template definition.
  - `packages/studio/src/server/templates/types.ts`: Type definitions for templates.
- **Modify**:
  - `packages/studio/src/components/CreateCompositionModal.tsx`: Add template selection dropdown.
  - `packages/studio/src/server/discovery.ts`: Update `createComposition` to accept `template` argument and use the template system.
  - `packages/studio/vite-plugin-studio-api.ts`: Update POST `/api/compositions` handler to parse `template` from body.
  - `packages/studio/src/context/StudioContext.tsx`: Update `createComposition` signature to accept `template`.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`: Check for context updates.

# Implementation Spec

## Architecture
- **Template Pattern**: Use a Strategy pattern for templates. Each template exports a function that returns a list of files (path + content) to generate.
- **API Update**: The `createComposition` API will accept an optional `template` string (defaulting to 'vanilla').

## Pseudo-Code

### `packages/studio/src/server/templates/types.ts`
```typescript
export interface TemplateFile {
  path: string;
  content: string;
}

export interface Template {
  id: string;
  label: string;
  generate: (name: string) => TemplateFile[];
}
```

### `packages/studio/src/server/templates/index.ts`
```typescript
import { vanillaTemplate } from './vanilla';
import { reactTemplate } from './react';

export const templates = {
  vanilla: vanillaTemplate,
  react: reactTemplate
};

export type TemplateId = keyof typeof templates;
```

### `packages/studio/src/server/templates/vanilla.ts`
- Implement `generate` to return the existing `composition.html` content.

### `packages/studio/src/server/templates/react.ts`
- Implement `generate` to return:
  - `composition.html` (with root div and script src="./index.tsx")
  - `index.tsx` (React mount code)

### `packages/studio/src/server/discovery.ts`
- Import `templates` from `./templates`.
- Update `createComposition(rootDir, name, templateId)`:
  - Validate `templateId` (default 'vanilla').
  - Get template generator.
  - Call `generator(name)` to get files.
  - `fs.mkdirSync` for the directory.
  - Loop through files and `fs.writeFileSync`.

### `packages/studio/vite-plugin-studio-api.ts`
- In `POST /api/compositions`:
  - Extract `template` from body.
  - Pass it to `createComposition`.

### `packages/studio/src/context/StudioContext.tsx`
- Update `StudioContextType` interface: `createComposition: (name: string, template?: string) => Promise<void>;`
- Update `createComposition` implementation to accept `template` argument and include it in the POST body.

### `packages/studio/src/components/CreateCompositionModal.tsx`
- Add `template` state (default 'vanilla').
- Add `<select>` for template choices:
  - Vanilla JS
  - React
- Pass `template` in `createComposition` context call.

## Public API Changes
- `POST /api/compositions` body now accepts `{ name: string, template?: string }`.

## Dependencies
- None.

# Test Plan
- **Verification**:
  1. Run `npx helios studio` (or `npm run dev` in studio package).
  2. Open "New Composition" modal.
  3. Verify "Template" dropdown exists with "Vanilla" and "React".
  4. Create a "Vanilla" composition -> Verify `composition.html` created with vanilla code.
  5. Create a "React" composition -> Verify `composition.html` and `index.tsx` created.
  6. Verify React composition loads and renders in the player (requires React env).
- **Success Criteria**:
  - Can create distinct Vanilla and React compositions.
  - New compositions appear in the switcher immediately.
- **Edge Cases**:
  - Invalid template ID (should fallback or error).
  - File name collisions (handled by existing logic).
