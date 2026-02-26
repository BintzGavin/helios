import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 5173;
const STUDIO_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../');
const TEST_FILE_NAME = 'move-test-asset.json';
const TEST_FOLDER_NAME = 'move-test-folder';
const TEST_FILE_CONTENT = '{}';

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(method: string, path: string, headers: any = {}, body?: any) {
  return new Promise((resolve, reject) => {
    let content = body;
    if (body && !(body instanceof Buffer) && typeof body !== 'string') {
        content = JSON.stringify(body);
    }

    if (content) {
        headers['Content-Length'] = Buffer.byteLength(content);
    }

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: { ...headers, Connection: 'close' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', reject);

    if (content) {
        req.write(content);
    }
    req.end();
  });
}

async function main() {
  console.log('Starting verification...');

  // Use examples as root for test
  // HELIOS_PROJECT_ROOT is usually expected to be set for studio if not running in default context
  const EXAMPLE_ROOT = path.resolve(STUDIO_DIR, '../../examples');

  console.log(`Studio Dir: ${STUDIO_DIR}`);
  console.log(`Project Root: ${EXAMPLE_ROOT}`);

  const studio = spawn('npm', ['run', 'dev', '--', '--port', '5173', '--strictPort'], {
      cwd: STUDIO_DIR,
      env: { ...process.env, HELIOS_PROJECT_ROOT: EXAMPLE_ROOT }
  });

  // Suppress output unless error
  studio.stdout.on('data', d => process.stdout.write(`[Studio Out] ${d}`));
  studio.stderr.on('data', d => process.stderr.write(`[Studio Err] ${d}`));

  // Wait for server to start
  console.log('Waiting for server...');
  await wait(8000); // Increased wait time

  try {
    // 2. Create Test Asset
    console.log('--- SETUP: UPLOAD ASSET ---');
    const uploadRes: any = await request('POST', '/api/assets/upload', {
        'x-filename': TEST_FILE_NAME,
        'Content-Type': 'text/plain'
    }, TEST_FILE_CONTENT);

    if (uploadRes.statusCode !== 200) throw new Error(`Upload failed: ${uploadRes.body}`);
    console.log('Asset uploaded.');

    // 3. Create Test Folder
    console.log('--- SETUP: CREATE FOLDER ---');
    const mkdirRes: any = await request('POST', '/api/assets/mkdir', {
        'Content-Type': 'application/json'
    }, { path: TEST_FOLDER_NAME });

    if (mkdirRes.statusCode !== 200) throw new Error(`Mkdir failed: ${mkdirRes.body}`);
    console.log('Folder created.');

    // Wait for FS
    await wait(1000);

    // Get IDs
    const listRes: any = await request('GET', '/api/assets');
    const assets = JSON.parse(listRes.body);
    const fileAsset = assets.find((a: any) => a.name === TEST_FILE_NAME);
    const folderAsset = assets.find((a: any) => a.name === TEST_FOLDER_NAME);

    if (!fileAsset) throw new Error('File asset not found');
    if (!folderAsset) throw new Error('Folder asset not found');

    console.log(`File ID: ${fileAsset.id}`);
    console.log(`Folder ID: ${folderAsset.id}`);

    // 4. Move Asset
    console.log('--- TEST: MOVE ASSET ---');
    const moveRes: any = await request('POST', '/api/assets/move', {
        'Content-Type': 'application/json'
    }, {
        sourceId: fileAsset.id,
        targetFolderId: folderAsset.id
    });

    console.log('Move Response:', moveRes.statusCode, moveRes.body);

    if (moveRes.statusCode !== 200) {
        throw new Error(`Move failed: ${moveRes.body}`);
    }

    // 5. Verify
    await wait(1000);
    const listRes2: any = await request('GET', '/api/assets');
    const assets2 = JSON.parse(listRes2.body);

    const expectedRelativePath = `${TEST_FOLDER_NAME}/${TEST_FILE_NAME}`;
    // Handle windows path separator in relativePath if server produces it?
    // discovery.ts normalizes relativePath to use forward slashes.
    const movedFile = assets2.find((a: any) => a.relativePath === expectedRelativePath);

    if (!movedFile) {
        // console.log('Assets list:', JSON.stringify(assets2, null, 2));
        throw new Error(`Moved file not found at ${expectedRelativePath}`);
    }
    console.log('Verified: File is in new location.');

    // 6. Clean Up
    console.log('--- CLEANUP ---');
    // Delete folder (recursive should handle file inside)
    await request('DELETE', `/api/assets?id=${encodeURIComponent(folderAsset.id)}`);
    console.log('Cleanup complete.');

  } catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
  } finally {
    studio.kill();
  }
}

main();
