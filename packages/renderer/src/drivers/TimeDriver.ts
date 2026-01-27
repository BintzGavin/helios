import { Page } from 'playwright';

export interface TimeDriver {
  /**
   * Initialize the driver before navigation (e.g., injecting scripts).
   * @param page The Playwright page instance.
   */
  init(page: Page): Promise<void>;

  /**
   * Prepares the driver after navigation (e.g., setting up CDP session or initial overrides).
   */
  prepare(page: Page): Promise<void>;

  /**
   * Sets the composition time to the specified value.
   * @param page The Playwright page instance.
   * @param timeInSeconds The time to seek to in seconds.
   */
  setTime(page: Page, timeInSeconds: number): Promise<void>;
}
