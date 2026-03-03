const fs = require('fs');

const path = 'docs/status/INFRASTRUCTURE.md';
let content = fs.readFileSync(path, 'utf8');

const blockedNote = '- [v0.28.0] 🚫 Blocked: No uncompleted implementation plans found for my domain in `/.sys/plans/`. I must stop working.\n';

const lines = content.split('\n');
const insertIndex = lines.findIndex(line => line.trim() === '## Status Log') + 1;

lines.splice(insertIndex, 0, blockedNote.trim());

fs.writeFileSync(path, lines.join('\n'));
