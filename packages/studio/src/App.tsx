import { useState, useEffect, useRef } from 'react'
import '@helios-project/player'
import { StudioLayout } from './components/Layout/StudioLayout'
import { Panel } from './components/Layout/Panel'
import { Timeline } from './components/Timeline'
import { PropsEditor } from './components/PropsEditor'
import type { HeliosController } from '@helios-project/player'

// Helper type for the custom element
interface HeliosPlayerElement extends HTMLElement {
  getController(): HeliosController | null;
}

function App() {
  const playerRef = useRef<HeliosPlayerElement>(null);
  const [controller, setController] = useState<HeliosController | null>(null);
  const [playerState, setPlayerState] = useState<any>({
    currentFrame: 0,
    duration: 0,
    fps: 30,
    isPlaying: false,
    inputProps: {}
  });
  // Default to a likely port for examples if running locally
  const [src, setSrc] = useState('http://localhost:5173/examples/simple-canvas-animation/index.html');

  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;

    // Reset controller when src changes (element remounts)
    setController(null);

    // Poll for controller availability
    const interval = setInterval(() => {
      const ctrl = el.getController();
      if (ctrl) {
        setController(ctrl);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [src]);

  useEffect(() => {
    if (!controller) return;

    // Subscribe to state updates
    const unsubscribe = controller.subscribe((state) => {
      setPlayerState(state);
    });

    // Initial state
    const initialState = controller.getState();
    if (initialState) {
        setPlayerState(initialState);
    }

    return () => {
        unsubscribe();
    };
  }, [controller]);

  return (
    <StudioLayout
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '0 16px', height: '100%' }}>
          <div style={{ fontWeight: 'bold' }}>Helios Studio</div>
          <input
            value={src}
            onChange={e => setSrc(e.target.value)}
            style={{ width: '400px', padding: '4px' }}
            placeholder="Composition URL"
          />
        </div>
      }
      sidebar={
        <Panel title="Explorer">
          <div style={{ padding: '8px', fontSize: '0.9em' }}>
            <div>Assets</div>
            <div>Compositions</div>
          </div>
        </Panel>
      }
      stage={
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#333' }}>
          <helios-player
            ref={playerRef}
            key={src}
            src={src}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              maxHeight: '100%',
              maxWidth: '100%'
            }}
          ></helios-player>
        </div>
      }
      inspector={
        <Panel title="Properties">
          <PropsEditor controller={controller} inputProps={playerState.inputProps || {}} />
        </Panel>
      }
      timeline={
        <Panel title="Timeline">
          <Timeline controller={controller} state={playerState} />
        </Panel>
      }
    />
  )
}

export default App
