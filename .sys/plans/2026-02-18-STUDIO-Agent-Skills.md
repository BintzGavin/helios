# STUDIO: Agent Skills Installation

#### 1. Context & Goal
- **Objective**: Implement the `helios skills` CLI command and update the Studio UI to enable the discovery and installation of Agent Skills (`SKILL.md` files) into the user's project.
- **Trigger**: The vision states "Skills are installable best-practice guides for AI agents" and mentions `npx @helios-engine/skills install`, but this command does not exist, and the Studio lacks a UI to browse/install them.
- **Impact**: This enables the "Agent Experience" vision by providing a standard mechanism for users and agents to install domain-specific knowledge (Skills) into their projects (`.agents/skills`), which are then indexed by the Studio Assistant.

#### 2. File Inventory
- **Create**:
  - `packages/cli/src/commands/skills.ts`: Implementation of the `skills` command (list, install).
- **Modify**:
  - `packages/cli/src/index.ts`: Register the new `skills` command.
  - `packages/cli/src/registry/types.ts`: Update `ComponentDefinition` type to include `'skill'` in the `type` union.
  - `packages/studio/src/components/ComponentsPanel/ComponentsPanel.tsx`: Add tabs to switch between "UI Components" and "Agent Skills", and update the list rendering to filter accordingly.
  - `packages/studio/src/server/plugin.ts`: Update the `POST /api/components` handler (or add `POST /api/skills`) to handle `type: 'skill'` installation by writing to `.agents/skills`.
  - `packages/studio/src/server/discovery.ts`: Add helper functions to write skills to the correct directory structure.
- **Read-Only**:
  - `packages/cli/src/registry/client.ts`: Reuse the existing registry client to fetch skills (assuming they are added to the registry).

#### 3. Implementation Spec
- **Architecture**:
  - **Registry**: Reuse the existing Component Registry. Skills will be defined as `ComponentDefinition` with `type: 'skill'`. The `files` array will typically contain `SKILL.md`.
  - **CLI**: The `helios skills` command will use `RegistryClient` to fetch items of type `'skill'`. `install <name>` will download the files to `.agents/skills/helios/<name>/`.
  - **Studio UI**: The `ComponentsPanel` will gain a segmented control (Tabs) for "Components" vs "Skills".
  - **Studio Backend**: The API `POST /api/components` will inspect the `type` of the component being installed. If it is `'skill'`, it will redirect the write operation to `.agents/skills/helios/<name>` instead of `src/components/helios`.
- **Pseudo-Code**:
  - `cli/commands/skills.ts`:
    ```typescript
    program.command('skills').command('list').action(async () => {
      const skills = await client.getComponents('skill');
      console.log(skills.map(s => s.name).join('\n'));
    });
    program.command('skills').command('install <name>').action(async (name) => {
      const skill = await client.findComponent(name, 'skill');
      // Write files to .agents/skills/helios/${name}/
    });
    ```
  - `studio/server/plugin.ts`:
    ```typescript
    if (type === 'skill') {
       const targetDir = path.join(process.cwd(), '.agents/skills/helios', name);
       // Write files
    } else {
       // Existing logic for components
    }
    ```
- **Public API Changes**:
  - CLI: New `helios skills` command group.
  - Studio API: `POST /api/components` implicitly supports installing skills based on the component type.
- **Dependencies**:
  - None.

#### 4. Test Plan
- **Verification**:
  - **CLI**:
    1. Run `node packages/cli/bin/helios.js skills list` and verify output (requires mocking registry or adding a test skill to `manifest.ts`).
    2. Run `node packages/cli/bin/helios.js skills install timer` (mocking it as a skill if needed, or ensuring registry has a skill).
    3. Verify `.agents/skills/helios/timer/` is created.
  - **Studio**:
    1. Start Studio (`npm run dev` in `packages/studio`).
    2. Navigate to "Components" panel.
    3. Click "Agent Skills" tab.
    4. Click "Install" on a skill.
    5. Verify `.agents/skills` is populated.
- **Success Criteria**:
  - Command executes successfully.
  - Files are written to the correct location (`.agents/skills` vs `src/components`).
  - Studio UI correctly separates Components and Skills.
