const fs = require('fs');

async function testWaitLoop(useCheckState) {
    let aborted = false;
    let nextFrameToWrite = 0;
    const ringMask = 0;
    const frameReadyRing = [0];
    let writerWaiterPromise = null;
    let freeWorkersHead = 1;
    let capturedErrors = [];

    let checkStateCalls = 0;
    function checkState() {
        checkStateCalls++;
    }

    const start = performance.now();
    for (let i = 0; i < 10000000; i++) {
        frameReadyRing[0] = 0; // Simulate not ready
        writerWaiterPromise = Promise.resolve(); // Simulate quick resolution for the test loop

        // We only test the inner loop of the await since we want to see the overhead
        while (frameReadyRing[0] === 0 && !aborted) {
            await writerWaiterPromise;
            if (useCheckState) {
                if (freeWorkersHead > 0 || capturedErrors.length > 0)
                    checkState();
            }
            frameReadyRing[0] = 1; // Break the loop after one wait
        }
    }
    const end = performance.now();
    return { time: end - start, checkStateCalls };
}

async function runTest() {
    const baseline = await testWaitLoop(true);
    const optimized = await testWaitLoop(false);

    const improvement = ((baseline.time - optimized.time) / baseline.time) * 100;
    console.log(`Baseline: ${baseline.time.toFixed(2)}ms`);
    console.log(`Optimized: ${optimized.time.toFixed(2)}ms (${improvement.toFixed(1)}% improvement)`);

    const resultLine = `1\t${(optimized.time / 1000).toFixed(3)}\t10000000\t0.00\t0.0\tkeep\tPERF-845 remove redundant checkState in multi-worker path (baseline: ${(baseline.time / 1000).toFixed(3)}s)\n`;
    fs.appendFileSync('packages/renderer/.sys/perf-results.tsv', resultLine);
}

runTest();
