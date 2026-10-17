const totalFrames = 1500000;
const maxPipelineDepth = 3;

function runBaseline() {
    let dispatchesSum = 0;
    let nextFrameToSubmit = 0;
    const start = performance.now();
    for (let nextFrameToWrite = 0; nextFrameToWrite < totalFrames; nextFrameToWrite++) {
        const limit = nextFrameToWrite + maxPipelineDepth;
        let dispatches = (limit < totalFrames ? limit : totalFrames) - nextFrameToSubmit;
        dispatchesSum += dispatches;
        nextFrameToSubmit += dispatches;
    }
    const end = performance.now();
    return { time: end - start, dispatchesSum };
}

function runExperiment() {
    let dispatchesSum = 0;
    let nextFrameToSubmit = 0;
    const start = performance.now();
    for (let nextFrameToWrite = 0; nextFrameToWrite < totalFrames; nextFrameToWrite++) {
        let dispatches = (nextFrameToWrite + maxPipelineDepth < totalFrames ? nextFrameToWrite + maxPipelineDepth : totalFrames) - nextFrameToSubmit;
        dispatchesSum += dispatches;
        nextFrameToSubmit += dispatches;
    }
    const end = performance.now();
    return { time: end - start, dispatchesSum };
}

let baselineTimes = [];
let experimentTimes = [];
// warm up
for(let i = 0; i < 50; i++) {
    runBaseline();
    runExperiment();
}

for(let i = 0; i < 1000; i++) {
    baselineTimes.push(runBaseline().time);
    experimentTimes.push(runExperiment().time);
}

const avgBaseline = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;
const avgExperiment = experimentTimes.reduce((a, b) => a + b, 0) / experimentTimes.length;
console.log(`Baseline Avg: ${avgBaseline.toFixed(4)} ms`);
console.log(`Experiment Avg: ${avgExperiment.toFixed(4)} ms`);
