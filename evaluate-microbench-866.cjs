const { performance } = require('perf_hooks');

// Simulating the single-worker capture loop setup
let isDomStrategy = true; // or false, we can benchmark both

// We will test if hoisting isDomStrategy out of the loop helps
function benchmarkInLoopUnhoisted(iterations) {
  let domCdpSession = { send: () => Promise.resolve() };
  let domBeginFrameParams = {};
  let strategy = {
    cdpSession: domCdpSession,
    beginFrameParams: domBeginFrameParams,
    lastFrameData: 'data',
    capture: () => Promise.resolve('data'),
    processCaptureResult: (d) => d
  };

  const start = performance.now();

  let nextCapturePromise = null;
  let buffer;
  let domLastFrameData = 'data';
  let totalFrames = iterations;

  // Simulated unhoisted setup (like the current single worker code for i > 0)
  // Actually, wait, let's look at how isDomStrategy is used in the while loop
  for (let i = 0; i < iterations; i++) {
    // There are several `if (isDomStrategy)` checks in the loop
    if (isDomStrategy) {
        nextCapturePromise = Promise.resolve('data');
    } else {
        nextCapturePromise = Promise.resolve('data');
    }

    // Simulate process
    if (isDomStrategy) {
       buffer = 'data';
    } else {
       buffer = 'data';
    }
  }

  const end = performance.now();
  return end - start;
}

function benchmarkInLoopHoisted(iterations) {
  let domCdpSession = { send: () => Promise.resolve() };
  let domBeginFrameParams = {};
  let strategy = {
    cdpSession: domCdpSession,
    beginFrameParams: domBeginFrameParams,
    lastFrameData: 'data',
    capture: () => Promise.resolve('data'),
    processCaptureResult: (d) => d
  };

  const start = performance.now();

  let nextCapturePromise = null;
  let buffer;
  let domLastFrameData = 'data';
  let totalFrames = iterations;

  if (isDomStrategy) {
      for (let i = 0; i < iterations; i++) {
          nextCapturePromise = Promise.resolve('data');
          buffer = 'data';
      }
  } else {
      for (let i = 0; i < iterations; i++) {
          nextCapturePromise = Promise.resolve('data');
          buffer = 'data';
      }
  }

  const end = performance.now();
  return end - start;
}

const ITERATIONS = 10000000;

// Warmup
benchmarkInLoopUnhoisted(1000);
benchmarkInLoopHoisted(1000);

// Run
let t1 = 0, t2 = 0;
for(let run = 0; run < 5; run++) {
    t1 += benchmarkInLoopUnhoisted(ITERATIONS);
    t2 += benchmarkInLoopHoisted(ITERATIONS);
}

console.log(`Unhoisted: ${t1 / 5} ms`);
console.log(`Hoisted: ${t2 / 5} ms`);
