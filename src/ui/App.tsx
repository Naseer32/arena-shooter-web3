import { useEffect, useMemo, useRef, useState } from 'react'
import { ConnectButton } from '@web3modal/wagmi/react'
import { useAccount } from 'wagmi'
import { WEAPONS, WEAPON_ORDER } from '../game/loadout'
import type { Pickup, PlayerState, Projectile, WeaponId } from '../game/types'

type Screen = 'menu' | 'loadout' | 'character' | 'settings' | 'game' | 'results'
type MatchResult = 'victory' | 'defeat' | null

const W = 960
const H = 540
const GROUND = 470

function makePlayer(id: string, isBot = false): PlayerState {
  return {
    id,
    x: isBot ? 200 + Math.random() * 600 : 120,
    y: GROUND,
    vx: 0,
    vy: 0,
    hp: 100,
    jet: 100,
    facing: 1,
    onGround: true,
    kills: 0,
    deaths: 0,
    weapon: 'rifle',
    reload: 0,
    fireCooldown: 0,
    alive: true,
    isBot,
  }
}

export default function App() {
  const { isConnected } = useAccount()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animRef = useRef<number | null>(null)
  const lastRef = useRef<number>(0)

  const [screen, setScreen] = useState<Screen>('menu')
  const [result, setResult] = useState<MatchResult>(null)
  const [stats, setStats] = useState({ kills: 0, deaths: 0, accuracy: 0 })

  const playLocked = !isConnected

  const menuCards = useMemo(
    () => [
      { label: 'PLAY', onClick: () => startGame(), disabled: playLocked },
      { label: 'LOADOUT', onClick: () => setScreen('loadout') },
      { label: 'CHARACTER', onClick: () => setScreen('character') },
      { label: 'SETTINGS', onClick: () => setScreen('settings') },
    ],
    [playLocked]
  )

  const startGame = () => {
    setResult(null)
    setStats({ kills: 0, deaths: 0, accuracy: 0 })
    setScreen('game')
  }

  useEffect(() => {
    if (screen !== 'game') return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const player = makePlayer('player')
    const bots: PlayerState[] = Array.from({ length: 5 }, (_, i) => makePlayer(`bot-${i}`, true))
    const projectiles: Projectile[] = []
    const pickups: Pickup[] = [
      { x: 260, y: GROUND, kind: 'medkit', active: true },
      { x: 500, y: GROUND, kind: 'ammo', active: true },
      { x: 760, y: GROUND, kind: 'jet', active: true },
    ]

    let kills = 0
    let shots = 0
    let hits = 0
    let timeLeft = 5 * 60

    const keys = new Set<string>()
    const mouse = { x: W / 2, y: H / 2, down: false }

    const onKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase())
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    const onMouseDown = () => (mouse.down = true)
    const onMouseUp = () => (mouse.down = false)
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = ((e.clientX - r.left) / r.width) * W
      mouse.y = ((e.clientY - r.top) / r.height) * H
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mousemove', onMove)

    const shoot = (from: PlayerState, targetX: number, targetY: number) => {
      const stats = WEAPONS[from.weapon]
      if (from.fireCooldown > 0 || from.reload > 0 || !from.alive) return
      from.fireCooldown = stats.fireRate
      shots += 1
      const dx = targetX - from.x
      const dy = targetY - (from.y - 18)
      const len = Math.hypot(dx, dy) || 1
      const spread = (Math.random() - 0.5) * stats.spread
      const vx = (dx / len + spread) * stats.speed
      const vy = (dy / len + spread) * stats.speed
      projectiles.push({
        x: from.x,
        y: from.y - 18,
        vx,
        vy,
        life: 1400,
        ownerId: from.id,
        damage: stats.damage,
        radius: from.weapon === 'rocket' ? 7 : 3,
        isRocket: from.weapon === 'rocket',
      })
    }

    const resetEnd = (won: boolean) => {
      setStats({ kills, deaths: player.deaths, accuracy: shots ? Math.round((hits / shots) * 100) : 0 })
      setResult(won ? 'victory' : 'defeat')
      setScreen('results')
    }

    const tick = (t: number) => {
      const dt = Math.min(32, t - lastRef.current || 16)
      lastRef.current = t
      timeLeft -= dt / 1000

      const gravity = 1800
      const speed = 260
      const jump = 680

      player.vx = 0
      if (keys.has('a') || keys.has('arrowleft')) player.vx = -speed
      if (keys.has('d') || keys.has('arrowright')) player.vx = speed
      if (keys.has(' ') && player.jet > 0) {
        player.vy -= 24
        player.jet = Math.max(0, player.jet - dt * 0.03)
      } else {
        player.jet = Math.min(100, player.jet + dt * 0.02)
      }
      if ((keys.has('w') || keys.has('arrowup')) && player.onGround) {
        player.vy = -jump
        player.onGround = false
      }

      player.facing = mouse.x >= player.x ? 1 : -1
      if (mouse.down) shoot(player, mouse.x, mouse.y)

      ;[player, ...bots].forEach((p) => {
        p.fireCooldown = Math.max(0, p.fireCooldown - dt)
        p.reload = Math.max(0, p.reload - dt)
        if (!p.alive) return
        p.vy += gravity * (dt / 1000)
        p.x += p.vx * (dt / 1000)
        p.y += p.vy * (dt / 1000)
        if (p.y >= GROUND) {
          p.y = GROUND
          p.vy = 0
          p.onGround = true
        }
        p.x = Math.max(24, Math.min(W - 24, p.x))
      })

      bots.forEach((b) => {
        if (!b.alive) return
        const dx = player.x - b.x
        b.vx = Math.sign(dx) * 170
        b.facing = dx >= 0 ? 1 : -1
        if (Math.abs(dx) < 320 && Math.random() < 0.04) shoot(b, player.x, player.y - 18)
      })

      projectiles.forEach((p) => {
        p.life -= dt
        p.x += p.vx * (dt / 1000)
        p.y += p.vy * (dt / 1000)
      })

      for (const p of projectiles) {
        if (p.life <= 0) continue
        const targets = p.ownerId === 'player' ? bots : [player]
        for (const target of targets) {
          if (!target.alive) continue
          if (Math.hypot(target.x - p.x, target.y - p.y) < 18) {
            target.hp -= p.damage
            hits += 1
            p.life = 0
            if (target.hp <= 0) {
              target.alive = false
              target.deaths += 1
              if (p.ownerId === 'player') kills += 1
              setTimeout(() => {
                target.hp = 100
                target.alive = true
                target.x = target.isBot ? 160 + Math.random() * 700 : 120
                target.y = GROUND
                target.vx = 0
                target.vy = 0
              }, 900)
            }
            break
          }
        }
      }

      pickups.forEach((pick) => {
        if (!pick.active) return
        const d = Math.hypot(player.x - pick.x, player.y - pick.y)
        if (d < 26) {
          if (pick.kind === 'medkit') player.hp = Math.min(100, player.hp + 35)
          if (pick.kind === 'ammo') player.reload = 0
          if (pick.kind === 'jet') player.jet = 100
          pick.active = false
        }
      })

      if (keys.has('1')) player.weapon = WEAPON_ORDER[0]
      if (keys.has('2')) player.weapon = WEAPON_ORDER[1]
      if (keys.has('3')) player.weapon = WEAPON_ORDER[2]
      if (keys.has('r')) player.reload = 600

      ctx.clearRect(0, 0, W, H)

      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#183a24')
      grad.addColorStop(1, '#08110b')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      ctx.fillStyle = '#2c3d1f'
      ctx.fillRect(0, GROUND + 22, W, H - GROUND)
      ctx.fillStyle = '#6b4f2a'
      ctx.fillRect(140, 360, 160, 12)
      ctx.fillRect(390, 300, 140, 12)
      ctx.fillRect(650, 250, 180, 12)

      pickups.forEach((pick) => {
        if (!pick.active) return
        ctx.fillStyle = pick.kind === 'medkit' ? '#ff6b8a' : pick.kind === 'ammo' ? '#ffd45f' : '#67e8f9'
        ctx.beginPath()
        ctx.arc(pick.x, pick.y - 10, 10, 0, Math.PI * 2)
        ctx.fill()
      })

      const drawPlayer = (p: PlayerState, color: string) => {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(p.x, p.y - 30, 14, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillRect(p.x - 9, p.y - 24, 18, 30)
      }

      drawPlayer(player, '#7cff8f')
      bots.forEach((b) => drawPlayer(b, '#ff7e7e'))

      projectiles.forEach((p) => {
        if (p.life <= 0) return
        ctx.fillStyle = p.isRocket ? '#ffb347' : '#f8ff6a'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.fillStyle = '#eaffef'
      ctx.font = '16px sans-serif'
      ctx.fillText(`TIME ${Math.max(0, Math.ceil(timeLeft))}`, 18, 24)
      ctx.fillText(`KILLS ${kills}/15`, 18, 46)
      ctx.fillText(`HP ${Math.max(0, Math.round(player.hp))}`, 18, 68)
      ctx.fillText(`JET ${Math.max(0, Math.round(player.jet))}`, 18, 90)
      ctx.fillText(`WEAPON ${WEAPONS[player.weapon].name}`, 18, 112)

      if (kills >= 15) return resetEnd(true)
      if (timeLeft <= 0) return resetEnd(kills >= 15)

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mousemove', onMove)
    }
  }, [screen])

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
            <span>WASD + mouse</span>
            <span>Space jetpack</span>
            <span>1/2/3 weapons</span>
          </div>
          <canvas ref={canvasRef} width={W} height={H} className="arena" />
          <button onClick={() => setScreen('menu')}>Exit</button>
        </div>
      )}

      {screen === 'results' && (
        <div className="results">
          <h2>{result === 'victory' ? 'VICTORY' : 'DEFEAT'}</h2>
          <p>Kills: {stats.kills}</p>
          <p>Deaths: {stats.deaths}</p>
          <p>Accuracy: {stats.accuracy}%</p>
          <button onClick={() => setScreen('menu')}>Back to Menu</button>
          <button onClick={startGame}>Rematch</button>
        </div>
      )}

      {screen === 'loadout' && <div className="panel">Loadout screen next.</div>}
      {screen === 'character' && <div className="panel">Character screen next.</div>}
      {screen === 'settings' && <div className="panel">Settings screen next.</div>}
    </div>
  )
}
