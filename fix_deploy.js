const fs = require('fs');
let content = fs.readFileSync('packages/cli/src/commands/deploy.ts', 'utf-8');

// I will just git checkout the original file first to undo the duplicates I might have added
