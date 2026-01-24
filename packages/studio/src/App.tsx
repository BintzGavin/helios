import { useState } from 'react'
import '@helios-project/player'
import { StudioLayout } from './components/Layout/StudioLayout'
import { Panel } from './components/Layout/Panel'

function App() {
  const [count, setCount] = useState(0)

  return (
    <StudioLayout
      header={
        <div style={{ fontWeight: 'bold' }}>Helios Studio</div>
      }
      sidebar={
        <Panel title="Explorer">
          <div>Assets</div>
          <div>Compositions</div>
        </Panel>
      }
      stage={
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           {/* @ts-ignore - custom element */}
          <helios-player
            src=""
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
          <div>Selection Properties</div>
          <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
        </Panel>
      }
      timeline={
        <Panel title="Timeline">
          <div>00:00:00</div>
        </Panel>
      }
    />
  )
}

export default App
