const fs = require('fs');
const filepath = '.sys/plans/PERF-1118-simplify-dom-strategy-capture-return.md';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(/status: claimed/, 'status: complete');
content = content.replace(/completed: ""/, 'completed: "2024-10-21"');
content = content.replace(/result: ""/, 'result: "improved"');

const summary = `
## Results Summary
- **Best render time**: 8.647s (vs baseline 8.717s)
- **Improvement**: 0.8%
- **Kept experiments**: [PERF-1118: Simplify DomStrategy capture() Return Type]
- **Discarded experiments**: []
`;

content += summary;

fs.writeFileSync(filepath, content, 'utf8');
