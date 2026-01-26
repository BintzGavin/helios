import { Helios } from '../../../packages/core/dist/index.js';
import lottie from 'lottie-web';
import animationData from './animation.json';

const helios = new Helios({
  duration: 2, // 60 frames @ 30fps = 2s
  fps: 30,
});

const container = document.getElementById('lottie-container');

if (container) {
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: animationData as any, // Type cast if necessary
    });

    helios.subscribe(({ currentFrame, fps }) => {
      // Convert frame to milliseconds
      const timeMs = (currentFrame / fps) * 1000;
      // Seek Lottie (isFrame = false means time in ms)
      anim.goToAndStop(timeMs, false);
    });
}
