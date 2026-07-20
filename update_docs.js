const fs = require('fs');

// Update Status
let status = fs.readFileSync('docs/status/STUDIO.md', 'utf8');
status = status.replace('**Version**: 0.123.0', '**Version**: 0.123.1');
status += '\n- [v0.123.1] ✅ Completed: STUDIO-Improve-AssetsPanel-Coverage - Achieved 100% test coverage for AssetsPanel by adding missing drag-and-drop edge cases.\n';
fs.writeFileSync('docs/status/STUDIO.md', status);

// Update Progress
let progress = fs.readFileSync('docs/PROGRESS.md', 'utf8');
const progressEntry = `### STUDIO v0.123.1\n- ✅ Completed: STUDIO-Improve-AssetsPanel-Coverage - Achieved 100% test coverage for AssetsPanel by adding missing drag-and-drop edge cases.\n\n`;
progress = progress.replace('## STUDIO v0.122.2', progressEntry + '## STUDIO v0.122.2');
fs.writeFileSync('docs/PROGRESS.md', progress);
