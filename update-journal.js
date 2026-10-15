const fs = require('fs');
const path = 'docs/status/RENDERER-EXPERIMENTS.md';

let content = fs.readFileSync(path, 'utf8');

const tsvData = `
4\t6.206\t150\t24.17\t64.7\tkeep\texperiment
5\t8.686\t150\t17.27\t64.8\tkeep\texperiment
6\t8.697\t150\t17.25\t64.8\tkeep\texperiment
7\t8.711\t150\t17.22\t64.8\tkeep\texperiment
8\t8.714\t150\t17.21\t64.7\tkeep\texperiment
9\t8.704\t150\t17.23\t64.8\tkeep\texperiment
`;

const discardEntry = `- PERF-1081: Removed redundant buffer null check in multi-worker writer wait loops.
  - WHY it didn't work: Test suite failed completely (36 tests failed). It appears the null check is not redundant after all and is actually required for correct operation and avoiding race conditions/deadlocks during multi-worker processing.
`;

const discardSection = '## What Doesn\'t Work (and Why)\n';
content = content.replace(discardSection, discardSection + discardEntry);

fs.writeFileSync(path, content);
