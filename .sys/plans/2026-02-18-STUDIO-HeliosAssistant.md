#### 1. Context & Goal
- **Objective**: Implement a "Helios Assistant" modal in Studio that combines context-aware prompt generation with documentation search.
- **Trigger**: Vision gap "AI chatbot for documentation help" in V1.x Roadmap (README.md).
- **Impact**: Enhances Agent Experience (AX) by providing in-tool documentation access and facilitating better external LLM usage through context-rich prompts.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/server/documentation.ts`: Backend logic to scan and parse workspace `README.md` files.
  - `packages/studio/src/components/AssistantModal/AssistantModal.tsx`: React component for the Assistant UI (Tabs: Ask AI, Documentation).
  - `packages/studio/src/components/AssistantModal/AssistantModal.css`: Styling for the modal.
  - `packages/studio/src/components/AssistantModal/index.ts`: Export barrel.
  - `packages/studio/src/components/AssistantModal/AssistantModal.test.tsx`: Unit tests for the new component.
- **Modify**:
  - `packages/studio/vite-plugin-studio-api.ts`: Register `GET /api/documentation` endpoint.
  - `packages/studio/src/context/StudioContext.tsx`: Replace `isPromptOpen`/`setPromptOpen` with `isAssistantOpen`/`setAssistantOpen`.
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Update the "Sparkles" button to open Assistant instead of System Prompt.
  - `packages/studio/src/App.tsx`: Replace `SystemPromptModal` with `AssistantModal`.
- **Delete**:
  - `packages/studio/src/components/SystemPromptModal.tsx`
  - `packages/studio/src/components/SystemPromptModal.css`
  - `packages/studio/src/components/SystemPromptModal.test.tsx`
- **Read-Only**:
  - `README.md`
  - `packages/core/README.md`

#### 3. Implementation Spec
- **Architecture**:
  - **Backend**: A new module `documentation.ts` uses `fs` to read `README.md` files from the project root and packages (`core`, `studio`, `renderer`, `player`). It parses them into `DocSection` objects (id, package, title, content) by splitting on H1/H2 headers.
  - **API**: Exposes `/api/documentation` via `vite-plugin-studio-api` which returns the full list of sections (lightweight enough for local dev).
  - **Frontend**: `AssistantModal` fetches docs on mount. It features two tabs:
    1.  **Ask AI**: User inputs a question. System performs client-side keyword matching against loaded docs. It constructs a "Context-Aware Prompt" containing: System Context + Composition Schema + **Top 3 Relevant Doc Sections** + User Question.
    2.  **Documentation**: A searchable list of all doc sections with expand/collapse functionality.
- **Pseudo-Code**:
  ```typescript
  // server/documentation.ts
  function findDocumentation(cwd) {
     // Identify roots (dev vs prod)
     // Read READMEs from packages/core, packages/studio, etc.
     // Split content by "\n#" to create sections
     return [{ id, package, title, content }];
  }

  // components/AssistantModal.tsx
  const AssistantModal = () => {
     const [docs] = useState([]);
     useEffect(() => fetch('/api/documentation').then(setDocs), []);

     const generatePrompt = (query) => {
        const relevant = docs.filter(d => d.content.includes(keywords));
        const context = `Context: ${schema}\nDocs: ${relevant}`;
        setPrompt(context);
     }
  }
  ```
- **Public API Changes**: None (Internal Studio API addition).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Open "Helios Assistant" (Sparkles icon).
  - **Tab 1 (Ask AI)**: Type "How do I use audio?". Verify generated prompt contains audio-related documentation snippets.
  - **Tab 2 (Documentation)**: Search for "renderer". Verify list filters to show renderer docs.
- **Success Criteria**:
  - Documentation from multiple packages is discoverable.
  - System prompt generation includes dynamically retrieved documentation context.
- **Edge Cases**:
  - No documentation files found (should handle gracefully).
  - running in production (node_modules) vs dev (monorepo) - `findDocumentation` must handle path resolution.
