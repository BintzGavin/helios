const fs = require('fs');
let content = fs.readFileSync('packages/cli/src/commands/deploy.ts', 'utf-8');

// The issue is likely that cloudflare-sandbox is registered twice. I will remove the first one.
let lines = content.split('\n');
let newLines = [];
let skip = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(".command('cloudflare-sandbox')") && !skip) {
    let nextLine = lines[i + 1] || "";
    if (nextLine.includes('Scaffold Cloudflare Sandbox Workflow deployment configuration')) {
      // we found the duplicate, let's skip it
      skip = true;
      // also remove the preceding `  deploy` line
      if (newLines.length > 0 && newLines[newLines.length - 1].trim() === 'deploy') {
        newLines.pop();
      }
    } else {
      newLines.push(lines[i]);
    }
  }

  if (skip) {
    if (lines[i].includes('{')) {
      braceCount += (lines[i].match(/{/g) || []).length;
    }
    if (lines[i].includes('}')) {
      braceCount -= (lines[i].match(/}/g) || []).length;
      if (braceCount === 0 && lines[i].includes('});')) {
        skip = false; // end of block
      }
    }
  } else {
    if (!lines[i].includes(".command('cloudflare-sandbox')") || !lines[i + 1] || !lines[i + 1].includes('Scaffold Cloudflare Sandbox Workflow deployment configuration')) {
        newLines.push(lines[i]);
    }
  }
}

fs.writeFileSync('packages/cli/src/commands/deploy.ts', newLines.join('\n'));
