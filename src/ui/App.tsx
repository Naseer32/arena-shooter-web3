import { useEffect, useRef, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { Game } from '../game/Game'
import type { GameSnapshot } from '../game/types'

type Screen = 'menu' | 'game' | 'results'

export default function App() {
  const { isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<Game | null>(null)

  const [screen, setScreen] = useState<Screen>('menu')
  const [result, setResult] = useState<GameSnapshot | null>(null)

  useEffect(() => {
    if (screen !== 'game') return
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = Math.min(window.innerWidth, 960)
      const h = Math.min(window.innerHeight, 640)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
    }

    resize()
    window.addEventListener('resize', resize)

    gameRef.current = new Game(canvas)

    let raf = 0
    const loop = (ts: number) => {
      gameRef.current?.update(ts)
      const snap = gameRef.current?.getSnapshot()
      if (snap && gameRef.current && !gameRef.current.running) {
        setResult(snap)
        setScreen('results')
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
      gameRef.current = null
    }
  }, [screen])

  return (
    <div style={{ color: '#fff', background: '#06111f', minHeight: '100vh', padding: 16 }}>
      {screen === 'menu' && (
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <h1>Mini Arena</h1>
          <p>2D arena shooter with wallet-gated play.</p>

          {!isConnected ? (
            <button onClick={() => connect({ connector: connectors[0] })}>Connect Wallet</button>
          ) : (
            <button onClick={() => setScreen('game')}>PLAY</button>
          )}
        </div>
      )}

      {screen === 'game' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={() => setScreen('menu')}>Back</button>
            <div>WASD / Mouse / Space / R / 1-3</div>
          </div>
          <canvas ref={canvasRef} />
        </div>
      )}

      {screen === 'results' && result && (
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <h1>{result.winner === 'player' ? 'VICTORY' : 'DEFEAT'}</h1>
          <p>Kills: {result.kills}</p>
          <p>Deaths: {result.deaths}</p>
          <p>Accuracy: {(result.accuracy * 100).toFixed(1)}%</p>
          <button onClick={() => setScreen('menu')}>Rematch</button>
        </div>
      )}
    </div>
  )
}
