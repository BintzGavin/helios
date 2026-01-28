import { Page, CDPSession } from 'playwright';
import { TimeDriver } from './TimeDriver.js';

export class CdpTimeDriver implements TimeDriver {
  private client: CDPSession | null = null;
  private currentTime: number = 0;

  async init(page: Page): Promise<void> {
    // No-op for CdpTimeDriver
  }

  async prepare(page: Page): Promise<void> {
    this.client = await page.context().newCDPSession(page);
    // Initialize virtual time policy to 'pause' to take control of the clock.
    await this.client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
    this.currentTime = 0;
  }

  async setTime(page: Page, timeInSeconds: number): Promise<void> {
    if (!this.client) {
      throw new Error('CdpTimeDriver not prepared. Call prepare() first.');
    }

    const delta = timeInSeconds - this.currentTime;

    // If delta is 0 or negative, we don't advance.
    // In a renderer loop, time usually moves forward.
    if (delta <= 0) {
        return;
    }

    // Convert to milliseconds for CDP
    const budget = delta * 1000;

    await this.client.send('Emulation.setVirtualTimePolicy', {
      policy: 'advance',
      budget: budget
    });

    this.currentTime = timeInSeconds;
  }
}
