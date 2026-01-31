import { Page } from 'playwright';
import { AudioTrackConfig } from '../types.js';

export async function scanForAudioTracks(page: Page): Promise<AudioTrackConfig[]> {
  const script = `
    (async () => {
      // Helper to find all media elements, including in Shadow DOM
      function findAllMedia(rootNode) {
        const media = [];
        // Check rootNode (if it is an Element)
        if (rootNode.nodeType === Node.ELEMENT_NODE) {
          const tagName = rootNode.tagName;
          if (tagName === 'AUDIO' || tagName === 'VIDEO') {
            media.push(rootNode);
          }
        }

        const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
            media.push(node);
          }
          if (node.shadowRoot) {
            media.push(...findAllMedia(node.shadowRoot));
          }
        }
        return media;
      }

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

            // Timeout fallback (e.g., 10 seconds)
            setTimeout(() => {
              if (!resolved) {
                console.warn('[DomScanner] Timeout waiting for media element: ' + (el.currentSrc || el.src));
                finish();
              }
            }, 10000);
          });
        }));
        console.log('[DomScanner] Media elements ready.');

        // Extract metadata
        mediaElements.forEach(el => {
          const src = el.currentSrc || el.src;
          if (src) {
            // Parse attributes
            const offset = el.dataset.heliosOffset ? parseFloat(el.dataset.heliosOffset) : 0;
            const seek = el.dataset.heliosSeek ? parseFloat(el.dataset.heliosSeek) : 0;
            const volume = el.muted ? 0 : el.volume;

            tracks.push({
              path: src,
              volume: volume,
              offset: isNaN(offset) ? 0 : offset,
              seek: isNaN(seek) ? 0 : seek
            });
          }
        });
      }
      return tracks;
    })()
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
    }));

  if (validTracks.length > 0) {
    console.log(`[DomScanner] Discovered ${validTracks.length} audio/video tracks across ${page.frames().length} frames.`);
  }

  return validTracks;
}
