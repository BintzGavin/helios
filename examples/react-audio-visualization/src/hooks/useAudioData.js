import { useMemo } from 'react';

export function useAudioData(buffer, currentTime, windowSize = 1024) {
    return useMemo(() => {
        if (!buffer) return { rms: 0, waveform: [] };

        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const centerSample = Math.floor(currentTime * sampleRate);

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
    }, [buffer, currentTime, windowSize]);
}
