import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {

  const frames = 300;
  let writeSuccess = true;
  let pendingBytes = 0;
  const start = performance.now();
  for (let i = 0; i < 1000000; i++) {
    for (let f = 0; f < frames; f++) {
      if (writeSuccess) {
      } else if (pendingBytes >= 16777216) {
        pendingBytes = 0;
      }
    }
  }
  const elapsed = (performance.now() - start) / 1000;
  console.log(`elapsed: ${elapsed}s`);
}

main();
