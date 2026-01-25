# Context & Goal
- **Objective**: Implement backend logic to discover asset files (images, audio, video) from the user's project (or examples directory in dev mode) and expose them via the Studio API, replacing the mock data in the Assets Panel.
- **Trigger**: Vision gap - The Assets Panel currently uses hardcoded mock data (`MOCK_ASSETS`), preventing users from seeing and using their actual files.
- **Impact**: Enables the "Assets Panel" to be functional, allowing users to browse and drag-and-drop assets into their compositions.

# File Inventory
- **Create**: None
- **Modify**:
    - `packages/studio/src/server/discovery.ts`: Add `findAssets` function to scan for media files.
    - `packages/studio/vite-plugin-studio-api.ts`: Add `/api/assets` endpoint.
    - `packages/studio/src/context/StudioContext.tsx`: Fetch assets from `/api/assets` and replace mocks.
- **Read-Only**:
    - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`
    - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`

# Implementation Spec
- **Architecture**:
    - The Studio runs as a SPA served by Vite. To access the host file system, we use a custom Vite plugin (`vite-plugin-studio-api.ts`).
    - We will extend the existing server-side discovery module to recursively scan for asset files.
    - The frontend will fetch this list on mount and populate the `StudioContext`.
- **Pseudo-Code**:
    - **`packages/studio/src/server/discovery.ts`**:
        - Define `AssetInfo` interface: `{ id: string, name: string, url: string, type: 'image' | 'video' | 'audio' | 'font' | 'other' }`.
        - Export `findAssets(rootDir: string): AssetInfo[]`.
        - Logic:
            - Set `searchDir` to `path.resolve(rootDir, '../../examples')` (matching `findCompositions` behavior for now).
            - Define supported extensions map:
                - Image: .png, .jpg, .jpeg, .gif, .svg, .webp
                - Video: .mp4, .webm, .mov
                - Audio: .mp3, .wav, .aac, .ogg
                - Font: .ttf, .otf, .woff, .woff2
            - Recursively walk `searchDir`.
            - Skip `node_modules`, `.git`, `dist`, `build`.
            - For each file:
                - Check extension.
                - If match:
                    - Generate `url` using `/@fs/${absolutePath}`.
                    - Determine `type`.
                    - Push to results.
    - **`packages/studio/vite-plugin-studio-api.ts`**:
        - In `configureServer`, add middleware for `/api/assets`.
        - Call `findAssets(process.cwd())`.
        - Return JSON response.
    - **`packages/studio/src/context/StudioContext.tsx`**:
        - Remove `MOCK_ASSETS`.
        - In the `useEffect` that fetches compositions, also `fetch('/api/assets')`.
        - `setAssets(data)`.
- **Public API Changes**:
    - None (Internal Studio API update).
- **Dependencies**: None.

# Test Plan
- **Verification**:
    1. Place a known asset file (e.g., `test-asset.png`) in `examples/simple-animation/`.
    2. Start the studio: `npm run dev` in `packages/studio`.
    3. Open the browser (usually `http://localhost:5173`).
    4. Observe the "Assets" panel.
- **Success Criteria**:
    - The `test-asset.png` appears in the Assets Panel.
    - Existing mock assets are gone.
    - Assets have correct icons/thumbnails based on type.
- **Edge Cases**:
    - No assets found (panel should be empty but not crash).
    - File with unknown extension (should be ignored or 'other').
    - Large number of files (performance check - simple list for now).
