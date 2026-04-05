import fs from 'fs';

let content = fs.readFileSync('packages/renderer/src/strategies/DomStrategy.ts', 'utf8');

content = content.replace(/async capture\(page: Page, frameTime: number\): Promise<Buffer> \{[\s\S]*?(?=async finish\(page: Page\))/g, `capture(page: Page, frameTime: number): Promise<Buffer> {
    if (this.targetElementHandle) {
      if (this.cdpSession) {
        return this.targetElementHandle.boundingBox().then((box: any) => {
          if (box) {
            return this.cdpSession!.send('HeadlessExperimental.beginFrame', {
              screenshot: {
                format: this.cdpScreenshotParams.format,
                quality: this.cdpScreenshotParams.quality,
                clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
              },
              interval: this.frameInterval,
              frameTimeTicks: 10000 + frameTime
            } as any).then((res: any) => {
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
            });
          }
          return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
            this.lastFrameBuffer = fallback;
            return fallback as Buffer;
          });
        });
      }

      return this.targetElementHandle.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
        this.lastFrameBuffer = fallback;
        return fallback as Buffer;
      });
    }

    if (this.cdpSession) {
      return this.cdpSession!.send('HeadlessExperimental.beginFrame', {
        screenshot: { format: this.cdpScreenshotParams.format, quality: this.cdpScreenshotParams.quality },
        interval: this.frameInterval,
        frameTimeTicks: 10000 + frameTime
      } as any).then((res: any) => {
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
      });
    } else {
      return page.screenshot((this as any).fallbackScreenshotOptions).then((fallback: any) => {
        this.lastFrameBuffer = fallback;
        return fallback as Buffer;
      });
    }
  }

  `);

fs.writeFileSync('packages/renderer/src/strategies/DomStrategy.ts', content);
