import { Page } from 'playwright';

export interface TimeDriver {
  /**
   * Prepares the driver (e.g., setting up CDP session or initial overrides).
   */
  prepare(page: Page): Promise<void>;

  /**
   * Sets the composition time to the specified value.
   * @param page The Playwright page instance.
   * @param timeInSeconds The time to seek to in seconds.
   */
  setTime(page: Page, timeInSeconds: number): Promise<void>;
}
