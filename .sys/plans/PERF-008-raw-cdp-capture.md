---
id: PERF-008
slug: raw-cdp-capture
status: unclaimed
claimed_by: ""
created: 2024-03-24
completed: ""
result: ""
---

# PERF-008: Bypass Playwright Overhead with Raw CDP Capture

## Context & Goal
The Frame Capture Loop (phase 4) in `packages/renderer/src/strategies/DomStrategy.ts`. We are targeting the `capture()` method to eliminate the overhead added by Playwright's high-level `page.screenshot()` API fallback. While `DomStrategy` uses CDP `Page.startScreencast`, it currently relies on a `setTimeout` of 50ms and eventually falls back to `page.screenshot()` if a frame is missed. Playwright's `page.screenshot()` performs internal checks (actionability, stability) that are redundant since our time drivers explicitly manage virtual time. By replacing `page.screenshot()` with raw Chrome DevTools Protocol (CDP) `Page.captureScreenshot`, we skip these checks, yielding faster frame capture in the fallback path, saving up to 50ms+ per missed screencast frame.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Step 1: Replace page.screenshot with CDP Page.captureScreenshot
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture(page: Page, frameTime: number)` method, modify the fallback logic inside the `setTimeout`. Replace the fallback `await page.screenshot(screenshotOptions)` with a raw CDP call using `this.cdpSession` (which is already created in `prepare()`).

```typescript
<<<<<<< SEARCH
              try {
                const fallback = await page.screenshot(screenshotOptions);
                this.lastFrameBuffer = fallback;
                resolve(fallback);
              } catch (err) {
                reject(err);
              }
=======
              try {
                if (this.cdpSession) {
                  const captureParams: any = { format };
                  if (format === 'jpeg' && quality !== undefined) {
                    captureParams.quality = quality;
                  }
                  const { data } = await this.cdpSession.send('Page.captureScreenshot', captureParams);
                  const fallback = Buffer.from(data, 'base64');
                  this.lastFrameBuffer = fallback;
                  resolve(fallback);
                } else {
                  const fallback = await page.screenshot(screenshotOptions);
                  this.lastFrameBuffer = fallback;
                  resolve(fallback);
                }
              } catch (err) {
                reject(err);
              }
>>>>>>> REPLACE
```
**Why**: Directly asks Chrome for the framebuffer using CDP instead of Playwright's heavy wrapper, avoiding Playwright's stability loops when the screencast misses a frame.
**Risk**: Low. Buffer decoding from base64 is standard and already used by the screencast listener.

## Test Plan
Run `npm run test` in `packages/renderer`.
1. Ensure transparent backgrounds work correctly when using a pixel format with alpha (e.g., `yuva420p`).
2. Verify no frames are dropped.
3. Confirm `targetSelector` still functions via the Playwright fallback.