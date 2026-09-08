import { workflow } from './runtime.js';
/**
 * Inspect progress or completion without submitting another render.
 * @param {object} input - jobId and optional waitMs (0–10000).
 * @returns {Promise<object>} Status, progress, bounded wait result, and playback URL.
 * @example
 * import status from 'kody:@owner/helios-video/status'
 * await status({jobId:'returned-job-id',waitMs:1000})
 */
export default async function status(input) {
  return workflow().status(input);
}
