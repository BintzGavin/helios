const fs = require('fs');
const filepath = 'docs/status/RENDERER-EXPERIMENTS.md';
let content = fs.readFileSync(filepath, 'utf8');

// Update Current best
content = content.replace(/Current best: [0-9.]+s \(baseline was [0-9.]+s, -?[0-9.]+%\)\nLast updated by: PERF-[0-9]+/, 'Current best: 8.647s (baseline was 8.717s, -0.8%)\nLast updated by: PERF-1118');

// Add to What Works
const newEntry = `- Simplify \`DomStrategy.capture()\` return type to avoid object mutation and hidden class deoptimization (~0.8% faster) - PERF-1118\n`;
content = content.replace(/## What Works\n/, `## What Works\n${newEntry}`);

fs.writeFileSync(filepath, content, 'utf8');
