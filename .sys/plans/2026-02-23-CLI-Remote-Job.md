# 2026-02-23-CLI-Remote-Job

## 1. Context & Goal
- **Objective**: Enable `helios job run` to accept a remote URL (HTTP/HTTPS) as the job specification source.
- **Trigger**: Vision gap "Stateless worker architecture" in `docs/BACKLOG.md` (Distributed Rendering) requires generic workers that can execute dynamic jobs without rebuilding containers.
- **Impact**: Unlocks true cloud-native distributed rendering by allowing a single "Helios Worker" deployment to execute any job provided via URL, removing the need for per-job container builds. This directly supports the "Stateless workers" constraint in AGENTS.md.

## 2. File Inventory
- **Create**: None
- **Modify**: `packages/cli/src/commands/job.ts` (Implement URL fetching logic)
- **Read-Only**: `packages/cli/src/types/job.ts` (Verify JobSpec structure)

## 3. Implementation Spec
- **Architecture**:
  - Update `job.ts` action handler to check if the `file` argument starts with `http://` or `https://`.
  - If URL: Use global `fetch` to retrieve JSON content. Parse as `JobSpec`. Set `jobDir` to `process.cwd()` (current working directory of the worker).
  - If File: Use existing `fs.readFileSync` logic. Set `jobDir` to `path.dirname(jobPath)`.
  - Use `jobDir` as the `cwd` for spawned child processes (preserving existing behavior for local files, and using CWD for remote jobs).
  - Ensure `fetch` handles network errors (404, 500, timeouts) gracefully with descriptive error messages.

- **Pseudo-Code**:
  ```typescript
  // In action handler:
  let jobSpec: JobSpec;
  let jobDir: string;

  if (file.startsWith('http://') || file.startsWith('https://')) {
    console.log(`Fetching job spec from ${file}...`);
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`Failed to fetch job: ${res.statusText} (${res.status})`);
      jobSpec = await res.json();
      jobDir = process.cwd(); // Remote jobs run in current directory context
    } catch (e) {
      throw new Error(`Network error fetching job spec: ${e.message}`);
    }
  } else {
    // Existing logic for local files
    const jobPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(jobPath)) throw new Error(`Job file not found: ${jobPath}`);
    jobSpec = JSON.parse(fs.readFileSync(jobPath, 'utf-8'));
    jobDir = path.dirname(jobPath);
  }

  // Continue with execution using jobSpec and jobDir
  // ... existing concurrency and execution logic ...
  ```

- **Public API Changes**:
  - `helios job run <file>` argument now accepts HTTP/HTTPS URLs.

- **Dependencies**:
  - Uses global `fetch` (available in Node 18+). No new package dependencies.

## 4. Test Plan
- **Verification**:
  1. Create a simple `job.json` file.
  2. Start a local HTTP server serving this file (e.g., `npx http-server . -p 8080`).
  3. Run `helios job run http://localhost:8080/job.json`.
  4. Verify that the job executes correctly (chunks processed).
  5. Verify that `cwd` for chunks is correct (`process.cwd()`).

- **Success Criteria**:
  - CLI successfully fetches and parses the remote JSON.
  - Chunks are executed with the correct working directory.
  - Invalid URLs or network errors result in a clear error message and non-zero exit code.

- **Edge Cases**:
  - URL returns 404/500 -> Throw readable error.
  - URL returns invalid JSON -> Throw parse error.
  - Network timeout -> Handle gracefully.
  - Redirects -> `fetch` follows by default, should be fine.
