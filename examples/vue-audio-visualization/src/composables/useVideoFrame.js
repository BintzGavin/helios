import { ref, onUnmounted } from 'vue';

export function useVideoFrame(helios) {
    const frame = ref(helios.getState().currentFrame);

    const update = (state) => {
        frame.value = state.currentFrame;
    };

    const unsubscribe = helios.subscribe(update);

    onUnmounted(() => {
        unsubscribe();
    });

    return frame;
}
