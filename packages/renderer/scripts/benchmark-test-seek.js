const { execSync } = require('child_process');

console.log('Running Seek benchmark...');
for (let i = 0; i < 3; i++) {
  try {
    const stdout = execSync('npx tsx scripts/benchmark-test.js', { encoding: 'utf-8' });
    const match = stdout.match(/render_time_s:\s+([\d.]+)/);
    if (match) {
        console.log(`Run ${i+1}: ${match[1]}s`);
    } else {
        console.log(`Run ${i+1}: Could not parse time`);
    }
  } catch(e) {
    console.log(`Run ${i+1}: Error`);
  }
}
