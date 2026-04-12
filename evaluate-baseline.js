import { execSync } from 'child_process';

const runs = 3;
const results = [];
for (let i = 0; i < runs; i++) {
  console.log(`Run ${i + 1}...`);
  const output = execSync('cd packages/renderer && npx tsx scripts/benchmark-test.js', { encoding: 'utf-8' });
  const match = output.match(/render_time_s:\s+([0-9.]+)/);
  if (match) {
    results.push(parseFloat(match[1]));
  }
}
results.sort((a, b) => a - b);
const median = results[1];
console.log(`BASELINE MEDIAN: ${median}`);
