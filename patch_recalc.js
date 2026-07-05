const fs = require('fs');

const path = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(path, 'utf8');

// There are 4 places where we do:
// i = (await workerThenables[workerIndex]) as any as number;

const findText = 'i = (await workerThenables[workerIndex]) as any as number;';
const replaceText = findText + '\\n                maxSubmits = nextFrameToWrite + maxPipelineDepth;';

// Regex replacement
code = code.replace(/i = \(await workerThenables\[workerIndex\]\) as any as number;/g,
`i = (await workerThenables[workerIndex]) as any as number;
                maxSubmits = nextFrameToWrite + maxPipelineDepth;`);

fs.writeFileSync(path, code);
