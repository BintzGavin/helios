import { ref, onUnmounted, type Ref } from 'vue';
import type { Helios } from '@helios-project/core';

export function useVideoFrame(helios: Helios): Ref<number> {
    const frame = ref(helios.getState().currentFrame);

    const update = (state: { currentFrame: number }) => {
        frame.value = state.currentFrame;
    };

    const unsubscribe = helios.subscribe(update);

    onUnmounted(() => {
        unsubscribe();
    });

    return frame;
}
