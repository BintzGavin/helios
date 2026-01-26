#### 1. Context & Goal
- **Objective**: Pass the user's current working directory to the Studio process via `HELIOS_PROJECT_ROOT` env var to enable project discovery.
- **Trigger**: Vision Gap - `npx helios studio` currently defaults to showing examples instead of the user's project because the CLI doesn't forward the CWD.
- **Impact**: Unlocks the "Studio as a Tool" vision, allowing developers to use Helios Studio on their own projects.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/commands/studio.ts` (Inject `HELIOS_PROJECT_ROOT` env var into spawned process)
- **Read-Only**: `packages/studio/src/server/discovery.ts` (Reference for env var name), `packages/studio/vite.config.ts` (Reference for config)

#### 3. Implementation Spec
- **Architecture**: The CLI acts as the entry point wrapper. It must capture the environment context (where the user is running the command) and explicitly pass it to the isolated child process (the Studio server).
- **Pseudo-Code**:
  ```typescript
  // packages/cli/src/commands/studio.ts
  const userCwd = process.cwd();
  // Respect existing env var if set, otherwise default to CWD
  const projectRoot = process.env.HELIOS_PROJECT_ROOT || userCwd;

  spawn('npm', ['run', 'dev'], {
    cwd: studioPath, // Execution context (where the script is)
    env: {
      ...process.env,
      HELIOS_PROJECT_ROOT: projectRoot // Business logic context
    }
  })
  ```
- **Public API Changes**: None (CLI internal change).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Build the CLI: `npm run build -w packages/cli`.
  2. Create a dummy project folder with a `composition.html`.
  3. Run `node packages/cli/dist/bin/helios.js studio` from that folder.
- **Success Criteria**: The Studio opens and shows the dummy project's composition instead of the default examples.
- **Edge Cases**:
  - User running from a directory with no compositions (should show empty list or error, handled by Studio backend).
  - `HELIOS_PROJECT_ROOT` already set in user's env (CLI should respect it).
