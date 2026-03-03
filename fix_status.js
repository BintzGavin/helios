const fs = require('fs');

const path = 'docs/status/INFRASTRUCTURE.md';
let content = fs.readFileSync(path, 'utf8');

const blockedNote = '- [v0.28.0] 🚫 Blocked: No uncompleted implementation plans found for my domain in `/.sys/plans/`. I must stop working.';

let lines = content.split('\n');

// remove duplicates of the blocked note
lines = lines.filter((line, index, arr) => {
    if (line.trim() === blockedNote) {
        return arr.findIndex(l => l.trim() === blockedNote) === index;
    }
    return true;
});

fs.writeFileSync(path, lines.join('\n'));
