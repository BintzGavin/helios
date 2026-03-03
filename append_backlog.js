const fs = require('fs');

const path = 'docs/BACKLOG.md';
let content = fs.readFileSync(path, 'utf8');

const blockedNote = '- [ ] 🚫 Blocked: No uncompleted implementation plans found for my domain in `/.sys/plans/`. I must stop working.';

const lines = content.split('\n');
const insertIndex = lines.findIndex(line => line.trim() === '## INFRASTRUCTURE Agent Status') + 1;

if(insertIndex > 0) {
  lines.splice(insertIndex, 0, blockedNote);
} else {
  lines.push('## INFRASTRUCTURE Agent Status');
  lines.push(blockedNote);
}

fs.writeFileSync(path, lines.join('\n'));
