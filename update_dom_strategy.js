const fs = require('fs');
const filepath = 'packages/renderer/src/strategies/DomStrategy.ts';
let code = fs.readFileSync(filepath, 'utf8');

code = code.replace(/processCaptureResult\(result: any\): string \| Buffer \{[\s\S]*?return this\.lastFrameData as string \| Buffer;\s*\}/, '');

code = code.replace(/capture\(page: Page, frameTime: number\): Promise<any> \{[\s\S]*?\}\);[\s\S]*?\}/, `capture(page: Page, frameTime: number): Promise<any> {
    return this.cdpSession!.send('Page.captureScreenshot', this.cachedCaptureParams).then(r => r.data);
  }`);

fs.writeFileSync(filepath, code, 'utf8');
