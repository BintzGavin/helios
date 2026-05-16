const fs = require('fs');
const filepath = '.sys/plans/PERF-520-inline-stability-check.md';
let content = fs.readFileSync(filepath, 'utf8');

const tsvData = `run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	16.756	600	35.81	42.2	keep	baseline
2	16.294	600	36.82	35.6	keep	inlined evaluateStabilityParams await in CdpTimeDriver
3	16.306	600	36.80	41.3	keep	inlined evaluateStabilityParams await in CdpTimeDriver
4	16.294	600	36.82	35.6	keep	inlined evaluateStabilityParams await in CdpTimeDriver
`;

content = content.replace('status: complete', 'status: complete\nresult: improved\n---\n\n## Results Summary\n\n```tsv\n' + tsvData + '```\n');

fs.writeFileSync(filepath, content);
