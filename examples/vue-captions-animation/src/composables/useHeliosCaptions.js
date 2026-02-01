import { ref, onMounted, onUnmounted } from 'vue';

export function useHeliosCaptions(helios) {
  const captions = ref(helios.activeCaptions.value || []);

  let unsubscribe;

  onMounted(() => {
    unsubscribe = helios.subscribe((state) => {
      captions.value = state.activeCaptions;
    });
  });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  return captions;
}
