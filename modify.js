const fs = require('fs');
const file = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(file, 'utf8');

const search = `            if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {`;
const replace = `            if (nextFrameToSubmit - nextFrameToWrite !== maxPipelineDepth) {`;

code = code.split(search).join(replace);
fs.writeFileSync(file, code);
