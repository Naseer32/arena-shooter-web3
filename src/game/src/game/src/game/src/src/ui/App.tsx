import { useEffect, useRef, useState } from 'react'
import { hasWalletConnectProjectId } from '../web3'
import { initGame } from '../game/Game'

type Screen = 'menu' | 'play' | 'results'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (screen !== 'play') return
    if (!canvasRef.current) return
    return initGame(canvasRef.current)
  }, [screen])

  if (screen === 'play') {
    return (
      <div className="app">
        <div className="topbar">
          <button onClick={() => setScreen('menu')}>Back</button>
        </div>
        <div className="game-stage">
          <canvas ref={canvasRef} />
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
      <p>{hasWalletConnectProjectId() ? 'Connect Wallet → Play' : 'Set wallet env var → Play'}</p>
      <button onClick={() => setScreen('play')} disabled={!hasWalletConnectProjectId()}>
        PLAY
      </button>
    </div>
  )
}
