#### 1. Context & Goal
- **Objective**: Publish a CLI release containing the `helios mcp` command and attach `helios.mcpb` to the GitHub release.
- **Trigger**: The backlog clearly states "CLI: Publish a CLI release with `helios mcp`, then attach `helios.mcpb` to a GitHub release" as part of the MCP integration checklist (Phase 2).
- **Impact**: This step finalizes the CLI's MCP integration, enabling users to install the plugin and use the MCP functionality via standardized GitHub releases.

#### 2. File Inventory
- **Create**:
  - `packages/cli/scripts/publish-mcp-release.js` (A helper script to manage GitHub release attachment if `gh` CLI isn't available, using standard REST APIs).
- **Modify**:
  - `packages/cli/package.json` (Add a script entry to build the `.mcpb` file and optionally invoke the publish script).
- **Read-Only**:
  - `packages/cli/src/commands/mcp.ts`
  - `docs/BACKLOG.md`

#### 3. Implementation Spec
- **Architecture**:
  - Since the `gh` CLI is absent in our environment, we will draft a generic Node.js script using `fetch` against the GitHub API to automate release creation/attachment, parameterized via environment variables (like `GITHUB_TOKEN`, `REPO_OWNER`, `REPO_NAME`, `VERSION`).
  - Add `npm run build:mcpb` (or similar) into `package.json` to generate the `helios.mcpb` artifact before publishing.
  - The script will read the built `helios.mcpb`, create a new GitHub release (or find an existing one matching the version), and upload the asset.
- **Pseudo-Code**:
  ```javascript
  // packages/cli/scripts/publish-mcp-release.js
  const fs = require('fs');
  const { execSync } = require('child_process');

  async function publish() {
    // 1. Ensure the mcpb file is built
    execSync('npm run build:mcpb', { stdio: 'inherit' });

    // 2. Upload to GitHub API
    // const asset = fs.readFileSync('helios.mcpb');
    // await fetch('https://api.github.com/repos/.../releases/.../assets', { ... });
    console.log('Attached helios.mcpb to release');
  }

  publish().catch(console.error);
  ```
- **Public API Changes**: No changes to the CLI user interface. Only CI/release pipeline adjustments.
- **Dependencies**: Expects `GITHUB_TOKEN` to be set in the execution environment when run.

#### 4. Test Plan
- **Verification**: `node packages/cli/scripts/publish-mcp-release.js --dry-run` to simulate the HTTP requests without actually mutating the GitHub repository.
- **Success Criteria**: The script should correctly construct the API payloads for uploading an asset to a GitHub release. The `package.json` should have the updated build script.
- **Edge Cases**: Missing `.mcpb` file, missing `GITHUB_TOKEN`, or network timeouts.
