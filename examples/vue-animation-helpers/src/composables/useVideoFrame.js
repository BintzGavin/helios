import { inject, ref } from 'vue';

export function useVideoFrame() {
  return inject('videoFrame', ref(0));
}
