import fs from 'fs';
import { execSync } from 'child_process';

try {
  execSync('cd packages/player && npx vitest run --coverage src/index.test.ts src/export-options.test.ts', { stdio: 'inherit' });
} catch (e) {}

const report = fs.readFileSync('packages/player/coverage/coverage-final.json', 'utf8');
const data = JSON.parse(report);

const indexCoverage = Object.values(data).find(f => f.path.endsWith('src/index.ts'));

const uncoveredLines = [];
for (const [line, count] of Object.entries(indexCoverage.statementMap)) {
  if (indexCoverage.s[line] === 0) {
    uncoveredLines.push(count.start.line);
  }
}

// deduplicate
const uniqueLines = [...new Set(uncoveredLines)].sort((a,b) => a-b);
console.log('Uncovered lines in index.ts:');
console.log(uniqueLines.join(', '));
