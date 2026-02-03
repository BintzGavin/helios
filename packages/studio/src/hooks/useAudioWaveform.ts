import { useState, useEffect } from 'react';

// Cache to store processed peaks for audio URLs
const waveformCache = new Map<string, Float32Array>();

/**
 * Hook to fetch audio from a URL, decode it, and extract waveform peaks.
 * Uses a global cache to avoid re-fetching/decoding the same URL.
 *
 * @param src The URL of the audio file
 * @param peaksPerSecond Resolution of the waveform (default: 100 = 1 peak per 10ms).
 *                       Higher values give more detail but use more memory.
 *                       We use 100 by default as a balance.
 */
export function useAudioWaveform(src: string, peaksPerSecond: number = 100) {
  const [peaks, setPeaks] = useState<Float32Array | null>(waveformCache.get(src) || null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!src) {
        setPeaks(null);
        return;
    }

    if (waveformCache.has(src)) {
        setPeaks(waveformCache.get(src)!);
        return;
    }

    let active = true;
    setError(false);

    async function load() {
      try {
        const resp = await fetch(src);
        if (!resp.ok) throw new Error(`Failed to fetch audio: ${resp.statusText}`);

        const buff = await resp.arrayBuffer();

        const OfflineAudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
        if (!OfflineAudioContextClass) {
             console.warn("OfflineAudioContext not supported");
             return;
        }

        // Create context for decoding
        // We only need a short dummy context to call decodeAudioData
        const ctx = new OfflineAudioContextClass(1, 1, 48000);

        // decodeAudioData detaches the buffer, so if we needed it again we'd copy it.
        // But here we just consume it.
        const audioBuffer = await ctx.decodeAudioData(buff);

        // Extract peaks
        const extracted = extractPeaks(audioBuffer, peaksPerSecond);

        if (active) {
            waveformCache.set(src, extracted);
            setPeaks(extracted);
        }
      } catch (e) {
        console.error("Error loading waveform for", src, e);
        if (active) setError(true);
      }
    }

    load();
    return () => { active = false; };
  }, [src, peaksPerSecond]);

  return { peaks, error };
}

function extractPeaks(buffer: AudioBuffer, peaksPerSecond: number): Float32Array {
    const data = buffer.getChannelData(0);
    const channelLength = data.length;
    const sampleRate = buffer.sampleRate;

    const samplesPerPeak = Math.floor(sampleRate / peaksPerSecond);
    if (samplesPerPeak < 1) return new Float32Array(0);

    const peakCount = Math.ceil(channelLength / samplesPerPeak);
    const peaks = new Float32Array(peakCount);

    for (let i = 0; i < peakCount; i++) {
        const start = i * samplesPerPeak;
        const end = Math.min(start + samplesPerPeak, channelLength);
        let max = 0;

        for (let j = start; j < end; j++) {
            const val = Math.abs(data[j]);
            if (val > max) max = val;
        }
        peaks[i] = max;
    }

    return peaks;
}
