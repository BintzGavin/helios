import { derived } from 'svelte/store';

export function createAudioStore(bufferStore, heliosStore, windowSize = 1024) {
  return derived([bufferStore, heliosStore], ([$buffer, $helios]) => {
    if (!$buffer || !$helios) return { rms: 0, waveform: [] };

    // Calculate currentTime from helios frame and fps
    const currentTime = $helios.currentFrame / $helios.fps;

    const data = $buffer.getChannelData(0);
    const sampleRate = $buffer.sampleRate;
    const centerSample = Math.floor(currentTime * sampleRate);

    // Logic from React/Vue examples
    const startSample = Math.max(0, centerSample - windowSize / 2);
    const endSample = Math.min(data.length, centerSample + windowSize / 2);

    let sumSquares = 0;
    const waveform = [];

    for(let i = startSample; i < endSample; i++) {
        const sample = data[i];
        sumSquares += sample * sample;
        waveform.push(sample);
    }

    const rms = Math.sqrt(sumSquares / (endSample - startSample || 1));

    return { rms, waveform };
  });
}
