const fs = require('fs');
const filepath = 'packages/renderer/.sys/perf-results-PERF-1071.tsv';
let content = fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf8') : 'run\trender_time_s\tframes\tfps_effective\tpeak_mem_mb\tstatus\tdescription\n';

const results = [
  '1\t4.535\t150\t33.08\t61.2\tkeep\tFast-path multi-worker dispatch limits'
];

fs.writeFileSync(filepath, content + results.join('\n') + '\n');
console.log('Results updated');
