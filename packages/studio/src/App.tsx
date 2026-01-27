import { useEffect } from 'react'
import '@helios-project/player'
import { StudioLayout } from './components/Layout/StudioLayout'
import { Panel } from './components/Layout/Panel'
import { Timeline } from './components/Timeline'
import { PropsEditor } from './components/PropsEditor'
import { PlaybackControls } from './components/Controls/PlaybackControls'
import { StudioProvider, useStudio } from './context/StudioContext'
import { CompositionSwitcher } from './components/CompositionSwitcher'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut'
import { Stage } from './components/Stage/Stage'
import { Sidebar } from './components/Sidebar/Sidebar'

function AppContent() {
  const {
    activeComposition,
    setSwitcherOpen,
    setHelpOpen,
    controller,
    playerState,
    setPlayerState,
    loop
  } = useStudio();

  const src = activeComposition?.url || '';

  // Open switcher with Cmd+K
  useKeyboardShortcut('k', (e) => {
    e.preventDefault();
    setSwitcherOpen(true);
  }, { ctrlOrCmd: true });

  // Open Help with ?
  useKeyboardShortcut('?', (e) => {
    e.preventDefault();
    setHelpOpen(true);
  }, { ignoreInput: true });

  // Playback Shortcuts
  useKeyboardShortcut(' ', () => {
    if (!controller) return;
    if (playerState.isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }
  }, { ignoreInput: true, preventDefault: true });

  useKeyboardShortcut('ArrowLeft', (e) => {
    if (!controller) return;
    const amount = e.shiftKey ? 10 : 1;
    controller.seek(Math.max(0, playerState.currentFrame - amount));
  }, { ignoreInput: true, preventDefault: true });

  useKeyboardShortcut('ArrowRight', (e) => {
    if (!controller) return;
    const amount = e.shiftKey ? 10 : 1;
    controller.seek(playerState.currentFrame + amount);
  }, { ignoreInput: true, preventDefault: true });

  useKeyboardShortcut('Home', () => {
    if (!controller) return;
    controller.seek(0);
  }, { ignoreInput: true, preventDefault: true });

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
  }, [controller, setPlayerState]);

  // Loop logic
  useEffect(() => {
    if (!loop || !controller) return;

    const { isPlaying, currentFrame, duration, fps } = playerState;
    if (!isPlaying) return;

    const totalFrames = duration * fps;
    if (currentFrame >= totalFrames - 1) {
      // Seek to 0 and play to loop
      controller.seek(0);
      controller.play();
    }
  }, [playerState, loop, controller]);


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
        sidebar={<Sidebar />}
        stage={<Stage src={src} />}
        inspector={
          <Panel title="Properties">
            <PropsEditor />
          </Panel>
        }
        timeline={
          <Panel title="Timeline">
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px', paddingRight: '16px' }}>
                <PlaybackControls />
                <Timeline />
            </div>
          </Panel>
        }
      />
      <CompositionSwitcher />
      <KeyboardShortcutsModal />
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
