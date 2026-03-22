import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const pages = await Promise.all([
    context.newPage(),
    context.newPage(),
    context.newPage(),
    context.newPage()
  ]);

  await Promise.all(pages.map(async page => {
    await page.setContent(`
      <div id="box" style="width: 100px; height: 100px; background: red;"></div>
    `);
  }));

  const cdpSessions = await Promise.all(pages.map(page => page.context().newCDPSession(page)));

  const startCapture = process.hrtime.bigint();

  for(let i=0; i<100; i++) {
     const session = cdpSessions[i % 4];
     await session.send('Runtime.evaluate', {
       expression: `document.getElementById('box').style.transform = 'translateX(${i}px)'`,
       awaitPromise: true,
       returnByValue: true
     });
     await session.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  }

  const endCapture = process.hrtime.bigint();
  console.log(`Sequential capture time (round robin 4 pages): ${Number(endCapture - startCapture)/1e6} ms`);

  const startConcurrent = process.hrtime.bigint();

  const promises = [];
  for(let i=0; i<100; i++) {
     const session = cdpSessions[i % 4];
     promises.push(
       session.send('Runtime.evaluate', {
         expression: `document.getElementById('box').style.transform = 'translateX(${i}px)'`,
         awaitPromise: true,
         returnByValue: true
       }).then(() => session.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 }))
     );
  }
  await Promise.all(promises);

  const endConcurrent = process.hrtime.bigint();
  console.log(`Concurrent capture time (4 pages): ${Number(endConcurrent - startConcurrent)/1e6} ms`);

  await browser.close();
}
main();
