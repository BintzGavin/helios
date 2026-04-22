const fs = require('fs');
const content = fs.readFileSync('packages/player/src/index.test.ts', 'utf-8');

let updated = content.replace("player.fastSeek(10);", "player.fastSeek(10);"); // No change
fs.writeFileSync('packages/player/src/index.test.ts', updated);
