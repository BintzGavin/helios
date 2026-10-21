const fs = require('fs');
const filepath = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(filepath, 'utf8');

// Single-worker initialization block
code = code.replace(/const data = \(rawResult as any\)\.screenshotData;\s*if \(data \|\| !domLastFrameBuffer\) \{\s*domLastFrameBuffer = Buffer\.from\(\(data \|\| \(strategy as any\)\.lastFrameData\) as string, "base64"\);\s*\}/g, 'domLastFrameBuffer = Buffer.from(rawResult as string, "base64");');

// Single-worker while loop block
code = code.replace(/const data = \(rawResult as any\)\.screenshotData;\s*if \(data\) \{\s*domLastFrameBuffer = Buffer\.from\(data as string, "base64"\);\s*\}/g, 'domLastFrameBuffer = Buffer.from(rawResult as string, "base64");');

// Multi-worker runWorker loop
code = code.replace(/const rawResult = await strategy\.capture\(page, i \* timeStep\);\s*const data = \(rawResult as any\)\.screenshotData;\s*let buf: Buffer;\s*if \(data\) \{\s*buf = Buffer\.from\(data as string, "base64"\);\s*domLastFrameBuffer = buf;\s*\} else \{\s*buf = domLastFrameBuffer!;\s*\}/g, 'const rawResult = await strategy.capture(page, i * timeStep);\n              let buf: Buffer = Buffer.from(rawResult as string, "base64");\n              domLastFrameBuffer = buf;');

fs.writeFileSync(filepath, code, 'utf8');
