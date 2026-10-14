const fs = require('fs');
const filepath = '.sys/plans/PERF-1071-fast-path-worker-dispatch-bounds.md';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace('status: claimed', 'status: complete');
content = content.replace('completed: ""', `completed: "${new Date().toISOString().split('T')[0]}"`);
content = content.replace('result: ""', 'result: "improved"');

const summary = `
## Results Summary
- **Best render time**: 4.535s (vs baseline 14.430s)
- **Improvement**: 68.6%
- **Kept experiments**: Hoisted limits and conditional bypass of empty queue check in multi-worker dispatches.
- **Discarded experiments**: None.
`;

fs.writeFileSync(filepath, content + summary);
console.log('Plan completed');
