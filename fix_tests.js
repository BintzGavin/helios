import fs from 'fs';

const filePath = 'packages/cli/src/registry/__tests__/client.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Add global teardown
if (!content.includes('afterEach(() => {') && !content.includes('afterEach(')) {
  content = content.replace(
    /describe\('RegistryClient', \(\) => {/,
    `describe('RegistryClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });`
  );
}

fs.writeFileSync(filePath, content, 'utf8');
