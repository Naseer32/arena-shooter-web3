import { useState } from 'react'

type Screen = 'menu' | 'play' | 'results'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')

  if (screen === 'play') {
    return (
      <div className="app">
        <div className="topbar">
          <button onClick={() => setScreen('menu')}>Back</button>
        </div>
        <div className="game-stage">
          <canvas id="gameCanvas" width="960" height="540" />
        </div>
      </div>
    )
  }

  if (screen === 'results') {
    return (
      <div className="app center">
        <h1>Results</h1>
        <button onClick={() => setScreen('menu')}>Rematch</button>
      </div>
    )
  }

  return (
    <div className="app center">
      <h1>Arena Shooter</h1>
      <p>Connect Wallet → Play</p>
      <button onClick={() => setScreen('play')}>PLAY</button>
    </div>
  )
}
