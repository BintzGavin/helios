const fs = require('fs');
const content = fs.readFileSync('.sys/plans/PERF-1071-fast-path-worker-dispatch-bounds.md', 'utf8');
const updated = content.replace('status: unclaimed', 'status: claimed').replace('claimed_by: ""', 'claimed_by: "executor-session"');
fs.writeFileSync('.sys/plans/PERF-1071-fast-path-worker-dispatch-bounds.md', updated);
