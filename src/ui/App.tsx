import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { createGame } from '../game/Game'
import type { GameSnapshot } from '../game/types'

type Screen = 'menu' | 'game' | 'results'

export default function App() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null)
  const rafRef = useRef<number | null>(null)

  const [screen, setScreen] = useState<Screen>('menu')
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)

  const connectedLabel = useMemo(() => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address])

  const startGame = () => {
    if (!isConnected) return
    setScreen('game')
  }

  const backToMenu = () => {
    setScreen('menu')
    setSnapshot(null)
  }

  useEffect(() => {
    if (screen !== 'game') return
    const canvas = canvasRef.current
    if (!canvas) return

    const game = createGame(canvas, (nextSnapshot) => {
      setSnapshot(nextSnapshot)
      setScreen('results')
    })

    gameRef.current = game

    const loop = (t: number) => {
      game.update(t)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      game.destroy()
      gameRef.current = null
    }
  }, [screen])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Arena Shooter Web3</div>
        <div className="wallet-row">
          {!isConnected ? (
            <button onClick={() => connect({ connector: injected() })}>
              Connect Wallet
            </button>
          ) : (
            <>
              <span className="wallet-address">{connectedLabel}</span>
              <button onClick={() => disconnect()}>Disconnect</button>
            </>
          )}
        </div>
      </header>

      {screen === 'menu' && (
        <main className="menu">
          <h1>Mini Militia-style Arena</h1>
          <p>5 bots. 5 minutes. First to 15 kills.</p>
          <button onClick={startGame} disabled={!isConnected}>
            PLAY
          </button>
        </main>
      )}

      {screen === 'game' && (
        <main className="game-wrap">
          <canvas ref={canvasRef} width={1280} height={720} />
        </main>
      )}

      {screen === 'results' && (
        <main className="results">
          <h2>{snapshot?.winner === 'player' ? 'VICTORY' : 'DEFEAT'}</h2>
          <p>Kills: {snapshot?.kills ?? 0}</p>
          <p>Deaths: {snapshot?.deaths ?? 0}</p>
          <p>Accuracy: {snapshot?.accuracy ?? 0}%</p>
          <button onClick={backToMenu}>Rematch</button>
        </main>
      )}
    </div>
  )
}
