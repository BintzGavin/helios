const fs = require('fs');
const path = '.jules/STUDIO.md';
let content = fs.readFileSync(path, 'utf8');

// The entry was appended twice, so we find the last occurrence and remove it
const entryMarker = '## [0.117.0] - Timeline Drag & Drop Support';
const firstIndex = content.indexOf(entryMarker);
const lastIndex = content.lastIndexOf(entryMarker);

if (firstIndex !== lastIndex && firstIndex !== -1) {
  content = content.substring(0, lastIndex);
  fs.writeFileSync(path, content);
}
