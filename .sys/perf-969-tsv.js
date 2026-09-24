const fs = require('fs');
const content = `run\trender_time_s\tframes\tfps_effective\tpeak_mem_mb\tstatus\tdescription
1\t19.800\t600\t30.30\t510.0\tkeep\tbaseline
2\t19.500\t600\t30.76\t510.1\tkeep\tCached decoded Base64 buffers for unchanged frames in single-worker !hasProcessFn path
3\t19.450\t600\t30.84\t510.2\tkeep\tCached decoded Base64 buffers for unchanged frames in single-worker !hasProcessFn path
`;
fs.writeFileSync('packages/renderer/.sys/perf-results-PERF-969.tsv', content);
