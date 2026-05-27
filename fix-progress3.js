const fs = require('fs');

const progressPath = 'docs/PROGRESS.md';
let progressContent = fs.readFileSync(progressPath, 'utf8');

// I need to fetch the original content from git before my modifications.
