import { useMemo, useState } from 'react'
import { ConnectButton } from '@web3modal/wagmi/react'
import { useAccount } from 'wagmi'

type Screen = 'menu' | 'loadout' | 'character' | 'settings' | 'game' | 'results'

export default function App() {
  const { isConnected } = useAccount()
  const [screen, setScreen] = useState<Screen>('menu')
  const [result, setResult] = useState<'victory' | 'defeat' | null>(null)

  const playLocked = !isConnected

  const menuCards = useMemo(
    () => [
      { label: 'PLAY', onClick: () => setScreen('game'), disabled: playLocked },
      { label: 'LOADOUT', onClick: () => setScreen('loadout') },
      { label: 'CHARACTER', onClick: () => setScreen('character') },
      { label: 'SETTINGS', onClick: () => setScreen('settings') },
    ],
    [playLocked]
  )

  const startMatch = () => {
    setResult(null)
    setScreen('game')
    window.setTimeout(() => {
      setResult(Math.random() > 0.5 ? 'victory' : 'defeat')
      setScreen('results')
    }, 2500)
  }

  return (
    <div className="app">
      {screen === 'menu' && (
        <div className="menu">
          <h1>ARENA SHOOTER</h1>
          <p className="subtitle">2D jungle warfare</p>
          <ConnectButton />
          <div className="menu-grid">
            {menuCards.map((card) => (
              <button key={card.label} onClick={card.onClick} disabled={card.disabled}>
                {card.label}
              </button>
            ))}
          </div>
          {!isConnected && <p className="hint">Connect wallet to unlock PLAY.</p>}
        </div>
      )}

      {screen === 'game' && (
        <div className="game-shell">
          <div className="hud">
            <span>HP 100</span>
            <span>JET 100</span>
            <span>0 / 15</span>
          </div>
          <div className="arena">
            <button className="back" onClick={() => setScreen('menu')}>Exit</button>
            <p>Game canvas goes here next.</p>
            <button onClick={startMatch}>Simulate Match</button>
          </div>
        </div>
      )}

      {screen === 'results' && (
        <div className="results">
          <h2>{result === 'victory' ? 'VICTORY' : 'DEFEAT'}</h2>
          <p>Kills: 0</p>
          <p>Deaths: 0</p>
          <p>Accuracy: 0%</p>
          <button onClick={() => setScreen('menu')}>Back to Menu</button>
          <button onClick={startMatch}>Rematch</button>
        </div>
      )}

      {screen === 'loadout' && <div className="panel">Loadout screen next.</div>}
      {screen === 'character' && <div className="panel">Character screen next.</div>}
      {screen === 'settings' && <div className="panel">Settings screen next.</div>}
    </div>
  )
}
