import fs from 'fs';
const files = fs.readdirSync('.sys/plans');
const ids = files.filter(f => f.startsWith('PERF-') && f.endsWith('.md'))
  .map(f => {
    const match = f.match(/PERF-(\d+)/);
    return match ? parseInt(match[1]) : 0;
  });
console.log(Math.max(...ids));
