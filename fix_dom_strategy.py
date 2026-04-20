with open('packages/renderer/src/strategies/DomStrategy.ts', 'r') as f:
    content = f.read()

# I need to fix the return types of capture method in DomStrategy
# Target handle returns Buffer
# CDP returns string

old_target = """
      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
      const res = await this.targetElementHandle.screenshot({
        type: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        omitBackground: !isOpaque
      });
      if (res) {
        this.lastFrameData = res;
        return res;
      }
      return this.lastFrameData!;
"""

new_target = """
      const isOpaque = this.cdpScreenshotParams.format === 'jpeg';
      const res = await this.targetElementHandle.screenshot({
        type: this.cdpScreenshotParams.format,
        quality: this.cdpScreenshotParams.quality,
        omitBackground: !isOpaque
      });
      if (res) {
        this.lastFrameData = res;
        return res;
      }
      return this.lastFrameData!;
"""

content = content.replace(old_target, new_target)

with open('packages/renderer/src/strategies/DomStrategy.ts', 'w') as f:
    f.write(content)
