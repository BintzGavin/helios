import fs from 'fs';

let content = fs.readFileSync('packages/renderer/src/strategies/DomStrategy.ts', 'utf8');

content = content.replace(/capture\(page: Page, frameTime: number\): Promise<Buffer> \{[\s\S]*?(?=async finish\(page: Page\))/g, `async capture(page: Page, frameTime: number): Promise<Buffer> {
    if (this.targetElementHandle) {
      if (this.cdpSession) {
        const box = await this.targetElementHandle.boundingBox();
        if (box) {
          const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
            screenshot: {
              format: this.cdpScreenshotParams.format,
              quality: this.cdpScreenshotParams.quality,
              clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
            },
            interval: this.frameInterval,
            frameTimeTicks: 10000 + frameTime
          } as any);
          if (res && res.screenshotData) {
            const buffer = Buffer.from(res.screenshotData, 'base64');
            this.lastFrameBuffer = buffer;
            return buffer;
          } else if (this.lastFrameBuffer) {
            return this.lastFrameBuffer;
          } else {
            this.lastFrameBuffer = this.emptyImageBuffer;
            return this.emptyImageBuffer;
          }
        }
        const fallback = await this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions);
        this.lastFrameBuffer = fallback as Buffer;
        return fallback as Buffer;
      }

      const fallback = await this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions);
      this.lastFrameBuffer = fallback as Buffer;
      return fallback as Buffer;
    }

    if (this.cdpSession) {
      const res = await this.cdpSession!.send('HeadlessExperimental.beginFrame', {
        screenshot: { format: this.cdpScreenshotParams.format, quality: this.cdpScreenshotParams.quality },
        interval: this.frameInterval,
        frameTimeTicks: 10000 + frameTime
      } as any);
      if (res && res.screenshotData) {
        const buffer = Buffer.from(res.screenshotData, 'base64');
        this.lastFrameBuffer = buffer;
        return buffer;
      } else if (this.lastFrameBuffer) {
        return this.lastFrameBuffer;
      } else {
        this.lastFrameBuffer = this.emptyImageBuffer;
        return this.emptyImageBuffer;
      }
    } else {
      const fallback = await page.screenshot((this as any).fallbackScreenshotOptions);
      this.lastFrameBuffer = fallback as Buffer;
      return fallback as Buffer;
    }
  }

  `);

fs.writeFileSync('packages/renderer/src/strategies/DomStrategy.ts', content);
