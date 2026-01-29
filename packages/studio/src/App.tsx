import { useEffect } from 'react'
import '@helios-project/player'
import { StudioLayout } from './components/Layout/StudioLayout'
import { Panel } from './components/Layout/Panel'
import { Timeline } from './components/Timeline'
import { PropsEditor } from './components/PropsEditor'
import { PlaybackControls } from './components/Controls/PlaybackControls'
import { StudioProvider, useStudio } from './context/StudioContext'
import { CompositionSwitcher } from './components/CompositionSwitcher'
import { CreateCompositionModal } from './components/CreateCompositionModal'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
import { DiagnosticsModal } from './components/DiagnosticsModal'
import { SystemPromptModal } from './components/SystemPromptModal'
import { GlobalShortcuts } from './components/GlobalShortcuts'
import { Stage } from './components/Stage/Stage'
import { Sidebar } from './components/Sidebar/Sidebar'

function AppContent() {
  const {
    activeComposition,
    setSwitcherOpen,
    setCreateOpen,
    controller,
    playerState,
    setPlayerState,
    loop,
    inPoint,
    outPoint
  } = useStudio();

  const src = activeComposition?.url || '';

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
    const loopEnd = outPoint > 0 ? outPoint : totalFrames;

    if (currentFrame >= loopEnd - 1) {
      // Seek to inPoint and play to loop
      controller.seek(inPoint);
      controller.play();
    }
  }, [playerState, loop, controller, inPoint, outPoint]);


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
            <button
              onClick={() => setCreateOpen(true)}
              title="New Composition"
              style={{
                background: '#333',
                border: '1px solid #444',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}
            >
              +
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
      <CreateCompositionModal />
      <KeyboardShortcutsModal />
      <DiagnosticsModal />
      <SystemPromptModal />
      <GlobalShortcuts />
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
