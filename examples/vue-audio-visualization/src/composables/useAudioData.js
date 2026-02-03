import { computed, unref } from 'vue';

export function useAudioData(buffer, currentTime, windowSize = 1024) {
    return computed(() => {
        const b = unref(buffer);
        const t = unref(currentTime);
        const w = unref(windowSize);

        if (!b) return { rms: 0, waveform: [] };

        const data = b.getChannelData(0);
        const sampleRate = b.sampleRate;
        const centerSample = Math.floor(t * sampleRate);

        const startSample = Math.max(0, centerSample - w / 2);
        const endSample = Math.min(data.length, centerSample + w / 2);

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
