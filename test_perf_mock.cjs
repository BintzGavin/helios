const { performance } = require('perf_hooks');

function test(name, fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(3)}ms`);
}

class ReusableThenable {
  resolveCb = null;
  rejectCb = null;

  then(resolve, reject) {
    this.resolveCb = resolve;
    this.rejectCb = reject;
  }

  resolve(val) {
    if (this.resolveCb) {
      const cb = this.resolveCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb(val);
    }
  }

  reject(err) {
    if (this.rejectCb) {
      const cb = this.rejectCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb(err);
    }
  }
}

class ReusableThenableFast {
  resolveCb = null;
  rejectCb = null;

  then(resolve, reject) {
    this.resolveCb = resolve;
    this.rejectCb = reject;
  }

  resolve(val) {
    const cb = this.resolveCb;
    if (cb) {
      this.resolveCb = null;
      this.rejectCb = null;
      cb(val);
    }
  }

  reject(err) {
    const cb = this.rejectCb;
    if (cb) {
      this.resolveCb = null;
      this.rejectCb = null;
      cb(err);
    }
  }
}

async function run() {
  const totalCalls = 10000000;

  for (let i=0; i<5; i++) {
    test('Current ReusableThenable', () => {
      let p = new ReusableThenable();
      for(let j=0; j<totalCalls; j++) {
         p.resolveCb = () => {};
         p.resolve();
      }
    });

    test('Fast ReusableThenable', () => {
      let p = new ReusableThenableFast();

      for(let j=0; j<totalCalls; j++) {
         p.resolveCb = () => {};
         p.resolve();
      }
    });
  }
}

run();
