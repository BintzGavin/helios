import { workflow } from './runtime.js';
/**
 * Save the private app's published URL so exports return playable links.
 * @param {object} input - appUrl from hosted_app_url in the publish response.
 * @returns {Promise<object>} Non-secret playback configuration.
 * @example
 * import configure from 'kody:@owner/helios-video/configure'
 * await configure({appUrl:'https://owner.kody.run/packages/helios-video'})
 */
export default async function configure(input) {
  return workflow().configure(input);
}
