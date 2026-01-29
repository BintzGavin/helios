import { createMemo } from 'solid-js';
import { createHeliosSignal } from './lib/createHeliosSignal';
import './style.css';

function App() {
  // Ensure helios exists (should be initialized in index.jsx)
  if (!window.helios) {
    console.warn('Helios not initialized on window');
  }

  const state = createHeliosSignal(window.helios);

  // Derived state for rotation (0 to 360 deg)
  const rotation = createMemo(() => {
    const s = state();
    const totalFrames = s.duration * window.helios.fps;
    const progress = totalFrames > 0 ? s.currentFrame / totalFrames : 0;
    return progress * 360;
  });

  return (
    <div class="container">
      <div class="column">
        <h2>Signal Driven</h2>
        <div
          class="box signal-box"
          style={{ transform: `rotate(${rotation()}deg)` }}
        >
          Signal
        </div>
      </div>

      <div class="column">
        <h2>CSS Driven</h2>
        <div class="box css-box">
          CSS
        </div>
      </div>
    </div>
  );
}

export default App;
