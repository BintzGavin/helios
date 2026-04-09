const noopCatch = () => {};

const captureWorkerFrameAsync = async (activePromise: Promise<void>): Promise<number> => {
    try {
        await activePromise;
    } catch (e) {
        // ignore
    }
    Promise.resolve().then(undefined, noopCatch);
    return 1;
};

const captureWorkerFrameSync = (activePromise: Promise<void>): Promise<number> => {
    return activePromise
        .catch(noopCatch)
        .then(() => {
            Promise.resolve().then(undefined, noopCatch);
            return 1;
        });
};

async function test() {
    let p = Promise.resolve();

    console.time("async");
    for (let i = 0; i < 100000; i++) {
        p = captureWorkerFrameAsync(p).then(() => {});
    }
    await p;
    console.timeEnd("async");

    p = Promise.resolve();

    console.time("sync");
    for (let i = 0; i < 100000; i++) {
        p = captureWorkerFrameSync(p).then(() => {});
    }
    await p;
    console.timeEnd("sync");
}

test();
