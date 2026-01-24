import { useState } from 'react'
import '@helios-project/player'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <h1>Helios Studio</h1>
      <p>Welcome to the Helios Studio.</p>

      <div style={{ margin: '20px 0', border: '1px solid #ccc', padding: '10px' }}>
        <h3>Preview</h3>
        <div style={{ maxWidth: '800px' }}>
          {/* @ts-ignore - custom element */}
          <helios-player src="" style={{ width: '100%', display: 'block' }}></helios-player>
        </div>
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  )
}

export default App
