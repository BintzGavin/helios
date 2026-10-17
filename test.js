let nextFrameToSubmit = 50;
let nextFrameToWrite = 20;
let maxPipelineDepth = 64;

let d = (nextFrameToWrite + maxPipelineDepth) - nextFrameToSubmit;
console.log(d);
