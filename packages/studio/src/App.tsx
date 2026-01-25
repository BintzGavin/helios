import { useState, useEffect, useRef } from 'react'
import '@helios-project/player'
import { StudioLayout } from './components/Layout/StudioLayout'
import { Panel } from './components/Layout/Panel'
import { Timeline } from './components/Timeline'
import { PropsEditor } from './components/PropsEditor'
import { StudioProvider, useStudio } from './context/StudioContext'
import { CompositionSwitcher } from './components/CompositionSwitcher'
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut'
import type { HeliosController } from '@helios-project/player'

// Helper type for the custom element
interface HeliosPlayerElement extends HTMLElement {
  getController(): HeliosController | null;
}

function AppContent() {
  const { activeComposition, setSwitcherOpen } = useStudio();
  const playerRef = useRef<HeliosPlayerElement>(null);
  const [controller, setController] = useState<HeliosController | null>(null);
  const [playerState, setPlayerState] = useState<any>({
    currentFrame: 0,
    duration: 0,
    fps: 30,
    isPlaying: false,
    inputProps: {}
  });

  const src = activeComposition?.url || '';

  // Open switcher with Cmd+K
  useKeyboardShortcut('k', (e) => {
    e.preventDefault();
    setSwitcherOpen(true);
  }, { ctrlOrCmd: true });

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
    const unsubscribe = controller.subscribe((state: any) => {
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
    <>
      <StudioLayout
        header={
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '0 16px', height: '100%' }}>
            <div style={{ fontWeight: 'bold' }}>Helios Studio</div>
            <button
              onClick={() => setSwitcherOpen(true)}
              style={{
                background: '#333',
                border: '1px solid #444',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '300px'
              }}
            >
              <span>{activeComposition?.name || 'Select Composition...'}</span>
              <span style={{ fontSize: '0.8em', color: '#888', marginLeft: 'auto' }}>⌘K</span>
            </button>
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
            {src ? (
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
            ) : (
              <div style={{ color: '#888' }}>No composition selected</div>
            )}
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
      <CompositionSwitcher />
    </>
  )
}

function App() {
  return (
    <StudioProvider>
      <AppContent />
    </StudioProvider>
  )
}

export default App
