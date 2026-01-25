
export interface AudioAsset {
  buffer: ArrayBuffer;
  mimeType: string | null;
}

export async function getAudioAssets(doc: Document): Promise<AudioAsset[]> {
  const audioTags = Array.from(doc.querySelectorAll('audio'));
  return Promise.all(audioTags.map(async (tag) => {
    if (!tag.src) return { buffer: new ArrayBuffer(0), mimeType: null };
    try {
        const res = await fetch(tag.src);
        return { buffer: await res.arrayBuffer(), mimeType: res.headers.get('content-type') };
    } catch (e) {
        console.warn("Failed to fetch audio asset:", tag.src, e);
        return { buffer: new ArrayBuffer(0), mimeType: null };
    }
  }));
}

export async function mixAudio(assets: AudioAsset[], duration: number, sampleRate: number): Promise<AudioBuffer> {
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
            source.connect(ctx.destination);
            source.start(0);
        } catch (e) {
            console.warn("Failed to decode audio asset:", e);
        }
    }

    return ctx.startRendering();
}
