#### 1. Context & Goal
- **Objective**: Add a "Skills" panel to the Studio Sidebar to browse, read, and install Agent Skills.
- **Trigger**: Vision gap - Skills are a core "Agent Experience" feature, currently only accessible via CLI.
- **Impact**: Makes skills discoverable and installable from the GUI, improving the onboarding for both humans and agents.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/SkillsPanel/SkillsPanel.tsx`: Main panel component.
  - `packages/studio/src/components/SkillsPanel/SkillItem.tsx`: Individual skill list item.
  - `packages/studio/src/components/SkillsPanel/SkillsPanel.css`: Styles.
  - `packages/studio/src/components/SkillsPanel/index.ts`: Exports.
- **Modify**:
  - `packages/studio/src/server/plugin.ts`: Add `/api/skills` endpoints.
  - `packages/studio/src/server/documentation.ts`: Add `listSkills` logic.
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add "Skills" tab.
- **Read-Only**: `packages/studio/src/server/documentation.test.ts` (Update tests).

#### 3. Implementation Spec
- **Architecture**:
  - Backend (`plugin.ts` + `documentation.ts`): Scans bundled skills (from CLI path) and compares with installed skills (in `.agents`). Exposes API.
  - Frontend (`SkillsPanel`): Fetches list, handles "Install" via POST, displays Markdown content.
- **Pseudo-Code**:
  - `listSkills(cwd, skillsRoot)`:
    - Determine `sourceRoot` (bundled skills path).
    - Determine `installRoot` (project `.agents` path).
    - Iterate known packages (core, studio, etc.).
    - Check if `SKILL.md` exists in `installRoot` -> `installed: true`.
    - Else check `sourceRoot` -> `installed: false`.
    - Return list.
  - API `GET /api/skills`: Call `listSkills`.
  - API `POST /api/skills/install`:
    - Input: `package`.
    - Copy `sourceRoot/pkg/SKILL.md` to `installRoot/pkg/SKILL.md`.
  - UI `SkillsPanel`:
    - `useEffect` fetch `/api/skills`.
    - Render `SkillItem` list.
- **Public API Changes**: None (Internal Studio API only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run dev` (or `helios studio`).
  - Open Studio, click "Skills" tab.
  - Verify list of skills appears (Core, Studio, etc.).
  - Click "Install" on a missing skill. Verify toast "Installed" and badge update.
  - Check `.agents/skills/helios` to confirm file created.
- **Success Criteria**: Skills are listed, installable, and readable.
- **Edge Cases**:
  - Skills directory missing (CLI not built?): Handle gracefully (empty list).
  - Install permission error: Show toast error.
