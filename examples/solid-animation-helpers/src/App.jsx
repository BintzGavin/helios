import { createHeliosSignal } from './lib/createHeliosSignal';
import { Sequence } from './lib/Sequence';
import { Series } from './lib/Series';
import { Helios } from '@helios-project/core';

// Initialize Helios
if (!window.helios) {
  window.helios = new Helios({
    fps: 30,
    duration: 5,
    width: 1920,
    height: 1080,
    autoSyncAnimations: false, // We control timing manually via Signals
  });
}

function App() {
  const frame = createHeliosSignal(window.helios); // returns accessor

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      "justify-content": 'center',
      "align-items": 'center',
      background: '#1a1a1a',
      color: 'white',
      "font-family": 'sans-serif',
      "font-size": '48px',
      "flex-direction": 'column',
      gap: '20px',
      overflow: 'hidden'
    }}>
      <h1>SolidJS Helpers</h1>
      <div>Frame: {frame().currentFrame}</div>

      {/* Manual Sequence */}
      <div style={{ position: 'relative', width: '400px', height: '200px', background: '#333' }}>
        <Sequence frame={frame} from={0} durationInFrames={30}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#ff4444',
            display: 'flex',
            "justify-content": 'center',
            "align-items": 'center'
          }}>
            Step 1 (0-30)
          </div>
        </Sequence>

        <Sequence frame={frame} from={30} durationInFrames={30}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#4444ff',
            display: 'flex',
            "justify-content": 'center',
            "align-items": 'center'
          }}>
            Step 2 (30-60)
          </div>
        </Sequence>

        <Sequence frame={frame} from={60}>
           <div style={{
            position: 'absolute',
            inset: 0,
            background: '#44ff44',
            color: 'black',
            display: 'flex',
            "justify-content": 'center',
            "align-items": 'center'
          }}>
            Step 3 (60+)
          </div>
        </Sequence>
      </div>

      <h2>Series Demo</h2>
      <div style={{ position: 'relative', width: '400px', height: '200px', background: '#222' }}>
        <Series>
            <Sequence frame={frame} durationInFrames={30}>
                <div style={{ background: '#ff4444', inset: 0, position: 'absolute', display: 'flex', "justify-content": 'center', "align-items": 'center' }}>Item 1 (0-30)</div>
            </Sequence>
            <Sequence frame={frame} durationInFrames={30}>
                <div style={{ background: '#4444ff', inset: 0, position: 'absolute', display: 'flex', "justify-content": 'center', "align-items": 'center' }}>Item 2 (30-60)</div>
            </Sequence>
            <Sequence frame={frame} durationInFrames={30}>
                <div style={{ background: '#44ff44', inset: 0, position: 'absolute', display: 'flex', "justify-content": 'center', "align-items": 'center', color: 'black' }}>Item 3 (60-90)</div>
            </Sequence>
        </Series>
      </div>
    </div>
  );
}

export default App;
