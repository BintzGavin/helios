import { workflow } from './runtime.js';
/**
 * Create and start an explicit title-explainer video. Resume with status.
 * @param {object} input - Unique requestId, template, title, subtitle, optional duration.
 * @returns {Promise<object>} Stable job ID and private playback URL after configuration.
 * @example
 * import start from 'kody:@owner/helios-video'
 * await start({requestId:'launch-1',template:'title-explainer',title:'Make an idea move',subtitle:'Brief to playable video'})
 */
export default async function start(input) {
  return workflow().start(input);
}
