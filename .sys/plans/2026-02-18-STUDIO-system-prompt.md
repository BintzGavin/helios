# STUDIO: Implement System Prompt Generator

## 1. Context & Goal
- **Objective**: Add a "System Prompt" generator feature in Studio to provide users with an optimized LLM prompt for the current composition.
- **Trigger**: Vision gap - "System prompt for LLM code generation" is a documented "Planned Feature" for V1.x in `README.md`.
- **Impact**: Unlocks AI-assisted development by providing the necessary context (API patterns + current schema) to LLMs, reducing friction for users using ChatGPT/Claude/Cursor.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/components/SystemPromptModal.tsx`: The modal component displaying the generated prompt.
  - `packages/studio/src/components/SystemPromptModal.css`: Styling for the modal.
  - `packages/studio/src/components/SystemPromptModal.test.tsx`: Unit tests for the modal.
  - `packages/studio/src/data/ai-context.ts`: Constant file containing the static Helios system prompt and API summary.
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx`: Add `isPromptOpen` and `setPromptOpen` state variables.
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add a button (e.g., sparkle icon) to the footer to toggle `isPromptOpen`.
  - `packages/studio/src/App.tsx`: Mount the `SystemPromptModal` component.

## 3. Implementation Spec

### Architecture
- **State Management**: `StudioContext` holds the visibility state (`isPromptOpen`).
- **Data Source**: `ai-context.ts` provides the static knowledge base (Helios philosophy, API signatures).
- **Context Injection**: `SystemPromptModal` combines the static data with dynamic data from `StudioContext` (`activeComposition` name, `playerState.schema`).
- **UI**: A modal with a large readonly textarea and a "Copy to Clipboard" button.

### Pseudo-Code

#### `packages/studio/src/data/ai-context.ts`
```typescript
export const HELIOS_SYSTEM_PROMPT = `
You are an expert Helios video engineer.
Helios is a programmatic video engine that drives the browser's native animation engine.

Core Philosophy:
- Drive the browser, don't simulate it.
- Use CSS animations and Web Animations API.
- Use the Helios class to control time.

API Summary:
import { Helios } from '@helios-project/core';
const helios = new Helios({ duration, fps });
helios.subscribe(({ currentFrame }) => { ... });

Constraints:
- Do NOT use Remotion hooks.
- Use relative paths for imports.
`;
```

#### `packages/studio/src/components/SystemPromptModal.tsx`
```typescript
export const SystemPromptModal = () => {
  const { isPromptOpen, setPromptOpen, activeComposition, playerState } = useStudio();

  if (!isPromptOpen) return null;

  const prompt = useMemo(() => {
    const schemaStr = playerState.schema
      ? JSON.stringify(playerState.schema, null, 2)
      : 'No schema defined';

    return \`\${HELIOS_SYSTEM_PROMPT}

Current Task Context:
Composition: \${activeComposition?.name || 'Untitled'}
Props Schema:
\${schemaStr}
\`;
  }, [activeComposition, playerState.schema]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt);
    // Show feedback
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>AI System Prompt</h2>
        <textarea readOnly value={prompt} />
        <button onClick={copyToClipboard}>Copy to Clipboard</button>
        <button onClick={() => setPromptOpen(false)}>Close</button>
      </div>
    </div>
  );
};
```

#### `packages/studio/src/context/StudioContext.tsx`
- Add `isPromptOpen: boolean` and `setPromptOpen: (open: boolean) => void` to context interface and provider.

#### `packages/studio/src/components/Sidebar/Sidebar.tsx`
- Add a button in `sidebar-footer` next to the Help button.
- Icon suggestion: "✨" or "AI".

## 4. Test Plan
- **Verification**:
  - Run `npx vitest packages/studio` to verify `SystemPromptModal.test.tsx`.
  - Run `npm run dev` in `packages/studio`.
  - Click the "AI" button in the sidebar.
  - Verify the modal opens.
  - Verify the text area contains the static prompt AND the current composition's schema.
  - Click "Copy" and verify content is in clipboard (if manually testing) or check console log if clipboard API is mocked.
- **Edge Cases**:
  - Verify behavior when no composition is active.
  - Verify behavior when `playerState.schema` is undefined.

## 5. Pre-Commit Steps
- Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
