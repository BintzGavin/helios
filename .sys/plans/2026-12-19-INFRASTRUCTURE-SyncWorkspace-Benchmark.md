#### 1. Context & Goal
- **Objective**: Implement performance benchmarks for the `syncWorkspaceDependencies` utility.
- **Trigger**: The INFRASTRUCTURE domain is functionally aligned with the V2 vision, and adding performance benchmarks is an allowed fallback action. Benchmarks exist for cloud adapters and `parseCommand`, but `syncWorkspaceDependencies` lacks benchmark coverage.
- **Impact**: Quantifies the overhead of the workspace dependency synchronizer, ensuring it remains performant when called repeatedly in CI/CD pipelines or test processes.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/tests/benchmarks/sync-workspace.bench.ts`
- **Modify**: None
- **Read-Only**:
  - `packages/infrastructure/src/governance/sync-workspace.ts`
  - `packages/infrastructure/README.md`

#### 3. Implementation Spec
- **Architecture**: The benchmark will use `vitest bench` to measure the execution time of `syncWorkspaceDependencies`. It will use focused `vi.spyOn` for `node:fs/promises` to simulate a monorepo file system with multiple packages without incurring actual disk I/O overhead, isolating the parsing and synchronization logic.
- **Pseudo-Code**:
  ```typescript
  import { describe, bench, beforeAll, afterAll, vi } from 'vitest';
  import { syncWorkspaceDependencies } from '../../src/governance/sync-workspace.js';
  import fs from 'node:fs/promises';
  import path from 'node:path';

  describe('syncWorkspaceDependencies Benchmark', () => {
    const rootDir = '/virtual/repo';

    beforeAll(() => {
      const mockEntries = [
        { name: 'pkg-a', isDirectory: () => true },
        { name: 'pkg-b', isDirectory: () => true },
      ];

      const mockPkgA = {
        name: '@helios-project/pkg-a',
        version: '1.2.3',
        dependencies: {
          '@helios-project/pkg-b': '^1.0.0', // Needs updating
          'external-pkg': '^2.0.0',
        },
      };

      const mockPkgB = {
        name: '@helios-project/pkg-b',
        version: '2.5.0',
        devDependencies: {
          '@helios-project/pkg-a': 'workspace:*', // Needs updating
        },
      };

      vi.spyOn(fs, 'readdir').mockResolvedValue(mockEntries as any);

      vi.spyOn(fs, 'readFile').mockImplementation((filepath: any) => {
        if (typeof filepath === 'string' && filepath.includes('pkg-a')) {
          return Promise.resolve(JSON.stringify(mockPkgA));
        }
        if (typeof filepath === 'string' && filepath.includes('pkg-b')) {
          return Promise.resolve(JSON.stringify(mockPkgB));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    });

    afterAll(() => {
      vi.restoreAllMocks();
    });

    bench('synchronize dependencies', async () => {
      // Reset writeFile mock to prevent memory leak during bench hot loop
      vi.mocked(fs.writeFile).mockClear();
      await syncWorkspaceDependencies({ rootDir });
    });
  });
  ```
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: N/A for governance tooling.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run bench -- tests/benchmarks/sync-workspace.bench.ts --run`
- **Success Criteria**: The benchmark executes successfully and outputs performance metrics (e.g., ops/sec) for the `syncWorkspaceDependencies` utility.
- **Edge Cases**: N/A for benchmarks.
- **Integration Verification**: Ensure the benchmark script runs without errors in the CI/CD pipeline.
