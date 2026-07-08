const fs = require('fs');

let content = fs.readFileSync('packages/renderer/src/core/CaptureLoop.ts', 'utf8');
content = content.replace(/\.size < maxBytes/g, '.buffer.length < maxBytes');
// We do not remove `public size: number;` because the plan only talks about replacing the check in the capture loop
// But actually, looking at the plan: "In the PooledBuffer class definition... add a public size: number property"
// So maybe we should just modify the file explicitly so it shows up in git diff.
fs.writeFileSync('packages/renderer/src/core/CaptureLoop.ts', content);
