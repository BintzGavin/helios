import { AudioTrackMetadata } from "@helios-project/core";

export interface AudioAsset {
  id: string;
  buffer: ArrayBuffer;
  mimeType: string | null;
  volume?: number;
  muted?: boolean;
  loop?: boolean;
  startTime?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

async function fetchAudioAsset(id: string, src: string, options: Partial<AudioAsset>): Promise<AudioAsset> {
  if (!src) return { id, buffer: new ArrayBuffer(0), mimeType: null };
  try {
      const res = await fetch(src);
      return {
          id,
          buffer: await res.arrayBuffer(),
          mimeType: res.headers.get('content-type'),
          volume: options.volume ?? 1,
          muted: options.muted ?? false,
          loop: options.loop ?? false,
          startTime: options.startTime ?? 0,
          fadeInDuration: options.fadeInDuration ?? 0,
          fadeOutDuration: options.fadeOutDuration ?? 0
      };
  } catch (e) {
      console.warn("Failed to fetch audio asset:", src, e);
      return { id, buffer: new ArrayBuffer(0), mimeType: null };
  }
}

export async function getAudioAssets(
  doc: Document,
  metadataTracks: AudioTrackMetadata[] = [],
  audioTrackState: Record<string, { volume: number; muted: boolean }> = {}
): Promise<AudioAsset[]> {
  const domAssetsPromises = Array.from(doc.querySelectorAll('audio')).map((tag, index) => {
    // ID Extraction Priority:
    // 1. data-helios-track-id (Used by DomDriver for control)
    // 2. id attribute (Standard DOM)
    // 3. Fallback: generated "track-${index}" (Stable fallback for listing)
    const id = tag.getAttribute('data-helios-track-id') || tag.id || `track-${index}`;
    const volumeAttr = tag.getAttribute('volume');
    const state = audioTrackState[id];

    let volume = 1;
    let muted = false;

    if (state) {
        volume = state.volume;
        muted = state.muted;
    } else {
        volume = volumeAttr !== null ? parseFloat(volumeAttr) : tag.volume;
        muted = tag.muted;
    }

    return fetchAudioAsset(id, tag.src, {
        volume,
        muted,
        loop: tag.loop,
        startTime: parseFloat(tag.getAttribute('data-start-time') || '0') || 0,
        fadeInDuration: parseFloat(tag.getAttribute('data-helios-fade-in') || '0') || 0,
        fadeOutDuration: parseFloat(tag.getAttribute('data-helios-fade-out') || '0') || 0
    });
  });

  const metadataAssetsPromises = metadataTracks.map(track => {
     const state = audioTrackState[track.id];
     return fetchAudioAsset(track.id, track.src, {
         volume: state?.volume ?? 1,
         muted: state?.muted ?? false,
         startTime: track.startTime,
         fadeInDuration: track.fadeInDuration,
         fadeOutDuration: track.fadeOutDuration,
         loop: false // Metadata doesn't strictly support loop yet, defaults to false
     });
  });

  const domAssets = await Promise.all(domAssetsPromises);
  const metadataAssets = await Promise.all(metadataAssetsPromises);

  // Merge: Prioritize metadata if IDs collide (Explicit state overrides DOM discovery)
  const assetsMap = new Map<string, AudioAsset>();
  domAssets.forEach(a => assetsMap.set(a.id, a));
  metadataAssets.forEach(a => assetsMap.set(a.id, a));

  return Array.from(assetsMap.values());
}

export async function mixAudio(assets: AudioAsset[], duration: number, sampleRate: number, rangeStart: number = 0): Promise<AudioBuffer> {
    if (typeof OfflineAudioContext === 'undefined') {
        throw new Error("OfflineAudioContext not supported in this environment");
    }

    if (duration <= 0) {
        // Return silent 1-sample buffer to avoid errors
        const ctx = new OfflineAudioContext(2, 1, sampleRate);
        return ctx.startRendering();
    }

    const length = Math.ceil(duration * sampleRate);
    const ctx = new OfflineAudioContext(2, length, sampleRate);

    for (const asset of assets) {
        if (asset.buffer.byteLength === 0) continue;
        try {
            const audioBuffer = await ctx.decodeAudioData(asset.buffer.slice(0));
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = !!asset.loop;

            const gainNode = ctx.createGain();
            const targetVolume = asset.muted ? 0 : (typeof asset.volume === 'number' ? asset.volume : 1);
            gainNode.gain.value = targetVolume;

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            const assetStart = asset.startTime || 0;
            // Calculate when this clip should play relative to the export window
            let playbackStart = assetStart - rangeStart;
            let startOffset = 0;

            if (playbackStart < 0) {
                // If the clip starts before the window, we need to skip the beginning
                startOffset = -playbackStart;
                playbackStart = 0;
            }

            // Apply Fades
            if ((asset.fadeInDuration && asset.fadeInDuration > 0) || (asset.fadeOutDuration && asset.fadeOutDuration > 0)) {
                let fadeInEndTime = playbackStart;

                // Fade In
                if (asset.fadeInDuration && asset.fadeInDuration > 0) {
                    const durationRemaining = asset.fadeInDuration - startOffset;
                    if (durationRemaining > 0) {
                        const initialVol = targetVolume * (startOffset / asset.fadeInDuration);
                        gainNode.gain.setValueAtTime(initialVol, playbackStart);
                        fadeInEndTime = playbackStart + durationRemaining;
                        gainNode.gain.linearRampToValueAtTime(targetVolume, fadeInEndTime);
                    } else {
                        gainNode.gain.setValueAtTime(targetVolume, playbackStart);
                    }
                } else {
                    gainNode.gain.setValueAtTime(targetVolume, playbackStart);
                }

                // Fade Out
                if (asset.fadeOutDuration && asset.fadeOutDuration > 0) {
                    const clipDuration = audioBuffer.duration;
                    const assetEnd = assetStart + clipDuration;
                    const playbackEnd = assetEnd - rangeStart;
                    const fadeOutStart = playbackEnd - asset.fadeOutDuration;

                    if (fadeOutStart >= 0) {
                        if (fadeOutStart >= fadeInEndTime) {
                            gainNode.gain.setValueAtTime(targetVolume, fadeOutStart);
                        } else {
                            // Overlap: Anchor at current calculated volume or targetVolume?
                            // Simpler to anchor at targetVolume if we assume users don't overlap fades aggressively
                            gainNode.gain.setValueAtTime(targetVolume, fadeOutStart);
                        }
                        gainNode.gain.linearRampToValueAtTime(0, playbackEnd);
                    } else {
                        const timeIntoFade = -fadeOutStart;
                        if (timeIntoFade < asset.fadeOutDuration) {
                            const progress = timeIntoFade / asset.fadeOutDuration;
                            const startVol = targetVolume * (1 - progress);
                            gainNode.gain.setValueAtTime(startVol, 0);
                            gainNode.gain.linearRampToValueAtTime(0, playbackEnd);
                        } else {
                            gainNode.gain.setValueAtTime(0, 0);
                        }
                    }
                }
            }

            // source.start(when, offset)
            source.start(playbackStart, startOffset);
        } catch (e) {
            console.warn("Failed to decode audio asset:", e);
        }
    }

    return ctx.startRendering();
}
