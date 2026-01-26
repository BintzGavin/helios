import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 5173;
const STUDIO_DIR = path.resolve('packages/studio');
const TEST_FILE_NAME = 'test-asset.png';
const TEST_FILE_CONTENT = 'Hello World';

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(method: string, path: string, headers: any = {}, body?: any) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', reject);

    if (body) {
        if (body instanceof Buffer || typeof body === 'string') {
            req.write(body);
        } else {
            req.write(JSON.stringify(body));
        }
    }
    req.end();
  });
}

async function main() {
  console.log('Starting Studio Server...');
  // Ensure public dir exists
  if (!fs.existsSync('public')) {
      fs.mkdirSync('public');
  }

  const studio = spawn('npm', ['run', 'dev'], {
      cwd: STUDIO_DIR,
      env: { ...process.env, HELIOS_PROJECT_ROOT: process.cwd() }
  });

  // Suppress output unless error
  studio.stdout.on('data', d => {});
  studio.stderr.on('data', d => process.stderr.write(`[Studio Err] ${d}`));

  // Wait for server to start
  await wait(5000);

  try {
    console.log('--- TEST: UPLOAD ---');
    const uploadRes: any = await request('POST', '/api/assets/upload', {
        'x-filename': TEST_FILE_NAME,
        'Content-Type': 'text/plain'
    }, TEST_FILE_CONTENT);

    console.log('Upload Response:', uploadRes.statusCode, uploadRes.body);

    if (uploadRes.statusCode !== 200) {
        throw new Error('Upload failed');
    }

    const publicPath = path.join(process.cwd(), 'public', TEST_FILE_NAME);
    if (!fs.existsSync(publicPath)) {
         throw new Error(`File not found at ${publicPath}`);
    } else {
        console.log(`File created at ${publicPath}`);
    }

    console.log('--- TEST: LIST ASSETS ---');
    // Wait a bit for FS to update?
    await wait(1000);

    const listRes: any = await request('GET', '/api/assets');
    const assets = JSON.parse(listRes.body);
    console.log('Assets list count:', assets.length);

    const asset = assets.find((a: any) => a.name === TEST_FILE_NAME);
    if (!asset) {
        // console.log(JSON.stringify(assets, null, 2));
        throw new Error('Asset not found in list');
    }
    console.log('Found asset:', asset.id);

    console.log('--- TEST: DELETE ---');
    const deleteRes: any = await request('DELETE', '/api/assets', {
        'Content-Type': 'application/json'
    }, JSON.stringify({ id: asset.id }));

    console.log('Delete Response:', deleteRes.statusCode, deleteRes.body);

    if (deleteRes.statusCode !== 200) {
        throw new Error('Delete failed');
    }

    if (fs.existsSync(publicPath)) {
        throw new Error('File still exists after delete');
    }
    console.log('File deleted successfully');

  } catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
  } finally {
    studio.kill();
  }
}

main();
