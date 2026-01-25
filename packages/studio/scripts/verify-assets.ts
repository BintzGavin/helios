import path from 'path';
import { findAssets } from '../src/server/discovery.ts';

const rootDir = path.join(process.cwd(), 'packages/studio');
console.log(`Scanning assets from root: ${rootDir}`);

const assets = findAssets(rootDir);
console.log(`Found ${assets.length} assets.`);

if (assets.length > 0) {
  console.log('Sample assets:');
  assets.slice(0, 5).forEach(asset => {
    console.log(`- ${asset.name} (${asset.type}) -> ${asset.url}`);
  });
} else {
  console.warn('No assets found. Check if examples/ directory has any media files.');
}
