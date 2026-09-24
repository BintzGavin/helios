import { workflow } from './runtime.js';
/**
 * Cancel a render recorded in this user's package.
 * @param {object} input - jobId returned by start.
 * @returns {Promise<object>} Terminal state or cancellation acknowledgment.
 * @example
 * import cancel from 'kody:@owner/helios-video/cancel'
 * await cancel({jobId:'returned-job-id'})
 */
export default async function cancel(input) {
  return workflow().cancel(input);
}
