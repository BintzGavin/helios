const fs = require('fs');
let data = fs.readFileSync('packages/renderer/.sys/perf-results.tsv', 'utf8');

// The issue was appending without a newline when the previous line didn't end in one.
// Let's replace the mashed line.
data = data.replace('2028\t2.192\t150\t68.43\t63.5\tkeep\tPERF-724: Eliminate DomStrategy Promise Chain2029', '2028\t2.192\t150\t68.43\t63.5\tkeep\tPERF-724: Eliminate DomStrategy Promise Chain\n2029');

fs.writeFileSync('packages/renderer/.sys/perf-results.tsv', data);
console.log("Fixed TSV formatting.");
