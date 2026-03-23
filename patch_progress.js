const fs = require('fs');
const path = 'docs/PROGRESS.md';
let content = fs.readFileSync(path, 'utf8');

const target = `## PLAYER v0.76.18`;
const insert = `## PLAYER v0.76.19
- ✅ Completed: Expand Test Coverage - Added test coverage to \`DirectController\` and \`BridgeController\` to improve edge case handling and error branches, achieving 100% coverage on \`controllers.ts\`.

`;

content = content.replace(target, insert + target);
fs.writeFileSync(path, content);
