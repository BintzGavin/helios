const fs = require('fs');
let content = fs.readFileSync('packages/renderer/.sys/plans/PERF-858-chunked-progress-counter-multi-worker.md', 'utf-8');

// Replace the git merge diff blocks with normal markdown blocks
content = content.replace(/<<<<<<< SEARCH\n/g, '```typescript\n');
content = content.replace(/=======\n/g, '```\n\nTo:\n```typescript\n');
content = content.replace(/>>>>>>> REPLACE\n/g, '```\n');
// Also fix the initial code block open which is already there, meaning it has ```typescript then ```typescript. Let's just do a simpler replace.
