import { Page } from 'playwright';
import { AudioTrackConfig } from '../types.js';
import { FIND_ALL_MEDIA_FUNCTION, PARSE_MEDIA_ATTRIBUTES_FUNCTION } from './dom-scripts.js';

export async function scanForAudioTracks(page: Page, timeout: number = 30000): Promise<AudioTrackConfig[]> {
  const script = `
    (async (timeoutMs) => {
      // Helper to find all media elements, including in Shadow DOM
      ${FIND_ALL_MEDIA_FUNCTION}

      // Helper to parse media attributes
      ${PARSE_MEDIA_ATTRIBUTES_FUNCTION}

      // Wait for media elements (video/audio)
      const mediaElements = findAllMedia(document);
      const tracks = [];

      if (mediaElements.length > 0) {
        console.log('[DomScanner] Found ' + mediaElements.length + ' media elements. Waiting for readiness...');
        await Promise.all(mediaElements.map((el) => {
          // Check if already ready (HAVE_ENOUGH_DATA = 4)
          if (el.readyState >= 4) return;

          return new Promise((resolve) => {
            let resolved = false;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              resolve(undefined);
            };

            el.addEventListener('canplaythrough', finish, { once: true });
            el.addEventListener('error', finish, { once: true });

            // Force load if needed (e.g. if preload="none")
            if (el.preload === 'none') {
              el.preload = 'auto';
            }

            // Timeout fallback
            setTimeout(() => {
              if (!resolved) {
                console.warn('[DomScanner] Timeout waiting for media element: ' + (el.currentSrc || el.src));
                finish();
              }
            }, timeoutMs);
          });
        }));
        console.log('[DomScanner] Media elements ready.');

        // Extract metadata
        mediaElements.forEach(el => {
          const src = el.currentSrc || el.src;
          if (src) {
            const attrs = parseMediaAttributes(el);

            tracks.push({
              path: src,
              volume: attrs.volume,
              offset: attrs.offset,
              seek: attrs.seek,
              fadeInDuration: attrs.fadeIn,
              fadeOutDuration: attrs.fadeOut,
              loop: attrs.loop,
              playbackRate: attrs.playbackRate,
              duration: attrs.duration
            });
          }
        });
      }
      return tracks;
    })(${timeout})
  `;

  // Execute in all frames
  const results = await Promise.all(page.frames().map(frame =>
    frame.evaluate(script) as Promise<any[]>
  ));

  // Flatten results
  const discoveredTracks = results.flat();

  // Filter and map discovered tracks
  const validTracks = discoveredTracks
    .filter(track => track.path)
    .map(track => ({
      path: track.path,
      volume: track.volume,
      offset: track.offset,
      seek: track.seek,
      fadeInDuration: track.fadeInDuration,
      fadeOutDuration: track.fadeOutDuration,
      loop: track.loop,
      playbackRate: track.playbackRate,
      duration: track.duration
    }));

  if (validTracks.length > 0) {
    console.log(`[DomScanner] Discovered ${validTracks.length} audio/video tracks across ${page.frames().length} frames.`);
  }

  return validTracks;
}
