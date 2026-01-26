
const { Helios } = require('./packages/core/dist/index.js');
try {
  const helios = new Helios({ duration: 10, fps: 30 });
  console.log('Success');
} catch (e) {
  console.error(e);
}
