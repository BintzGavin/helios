const fs = require('fs');
const file = 'packages/renderer/tests/verify-captions.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/const args = FFmpegBuilder\.getArgs\(/g, 'const args = FFmpegBuilder.getArgs(');
// wait actually, FFmpegBuilder.getArgs now returns an FFmpegConfig object, not an array.
// FFmpegConfig has an `args` property.
