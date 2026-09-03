// src/game/Game.ts
import { DEFAULT_WEAPON, WEAPONS } from './loadout'
import type { GameSnapshot, Pickup, PlayerState, Projectile, Vec2, WeaponId } from './types'

type Platform = { x: number; y: number; w: number; h: number }

export class Game {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  running = true

  width = 0
  height = 0
  timeLeft = 300000
  killLimit = 15

  player: PlayerState
  bots: PlayerState[] = []
  projectiles: Projectile[] = []
  pickups: Pickup[] = []
  platforms: Platform[] = []

  keys = new Set<string>()
  mouse = { x: 0, y: 0, down: false }

  stats = {
    shots: 0,
    hits: 0,
  }

  lastTs = 0
  winner: 'player' | 'bots' | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    this.ctx = ctx

    this.player = this.makePlayer('player', false, 180, 300)
    this.bots = Array.from({ length: 5 }, (_, i) => this.makePlayer(`bot-${i + 1}`, true, 500 + i * 120, 300))
    this.platforms = this.makeMap()
    this.pickups = this.makePickups()

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    canvas.addEventListener('mousemove', this.onMouseMove)
    canvas.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
  }

  makePlayer(id: string, isBot: boolean, x: number, y: number): PlayerState {
    return {
      id,
      isBot,
      x,
      y,
      vx: 0,
      vy: 0,
      facing: 1,
      health: 100,
      maxHealth: 100,
      jet: 100,
      maxJet: 100,
      weapon: DEFAULT_WEAPON,
      kills: 0,
      deaths: 0,
      alive: true,
      respawnAt: 0,
      shootCooldown: 0,
    }
  }

  makeMap(): Platform[] {
    return [
      { x: 0, y: 560, w: 1600, h: 40 },
      { x: 120, y: 450, w: 240, h: 22 },
      { x: 420, y: 390, w: 180, h: 22 },
      { x: 680, y: 460, w: 220, h: 22 },
      { x: 980, y: 360, w: 220, h: 22 },
      { x: 1280, y: 470, w: 200, h: 22 },
    ]
  }

  makePickups(): Pickup[] {
    return [
      { x: 260, y: 410, type: 'health', value: 35, active: true },
      { x: 520, y: 350, type: 'jet', value: 50, active: true },
      { x: 820, y: 420, type: 'ammo', value: 1, active: true },
      { x: 1100, y: 320, type: 'health', value: 35, active: true },
    ]
  }

  onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase())
  onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase())
  onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width)
    this.mouse.y = (e.clientY - rect.top) * (this.canvas.height / rect.height)
  }
  onMouseDown = () => (this.mouse.down = true)
  onMouseUp = () => (this.mouse.down = false)

  getSnapshot(): GameSnapshot {
    return {
      winner: this.winner,
      kills: this.player.kills,
      deaths: this.player.deaths,
      accuracy: this.stats.shots ? this.stats.hits / this.stats.shots : 0,
    }
  }

  update(ts: number) {
    const dt = this.lastTs ? Math.min((ts - this.lastTs) / 1000, 0.033) : 0.016
    this.lastTs = ts
    if (!this.running) return

    this.timeLeft -= dt * 1000
    if (this.timeLeft <= 0) {
      this.finish(this.player.kills >= this.bots.reduce((a, b) => a + b.kills, 0) ? 'player' : 'bots')
      return
    }

    this.updatePlayer(this.player, dt, false)
    for (const bot of this.bots) this.updatePlayer(bot, dt, true)
    this.updateProjectiles(dt)
    this.updatePickups()
    this.draw()

    if (this.player.kills >= this.killLimit) this.finish('player')
    if (this.bots.some((b) => b.kills >= this.killLimit)) this.finish('bots')
  }

  finish(winner: 'player' | 'bots') {
    this.running = false
    this.winner = winner
  }

  updatePlayer(p: PlayerState, dt: number, isBot: boolean) {
    if (!p.alive) {
      if (performance.now() >= p.respawnAt) {
        p.alive = true
        p.health = p.maxHealth
        p.jet = p.maxJet
        p.x = isBot ? 600 + Math.random() * 500 : 180
        p.y = 200
      } else return
    }

    p.vy += 1800 * dt

    const left = isBot ? false : this.keys.has('a') || this.keys.has('arrowleft')
    const right = isBot ? false : this.keys.has('d') || this.keys.has('arrowright')
    const jump = isBot ? false : this.keys.has(' ')
    const shoot = isBot ? Math.random() < 0.04 : this.mouse.down

    if (!isBot) {
      if (left) p.vx = -260
      else if (right) p.vx = 260
      else p.vx *= 0.84
      if (jump && p.jet > 0) {
        p.vy -= 950 * dt
        p.jet = Math.max(0, p.jet - 30 * dt)
      } else p.jet = Math.min(p.maxJet, p.jet + 18 * dt)
      p.facing = this.mouse.x >= p.x ? 1 : -1
      if (shoot) this.tryShoot(p, this.mouse)
    } else {
      const target = this.player.alive ? this.player : this.bots.find((b) => b.alive) || this.player
      p.facing = target.x >= p.x ? 1 : -1
      p.vx += (target.x > p.x ? 1 : -1) * 12
      if (Math.abs(target.y - p.y) > 80 && p.jet > 0 && Math.random() < 0.02) {
        p.vy -= 850 * dt
        p.jet -= 20 * dt
      }
      if (Math.random() < 0.02) this.tryShoot(p, { x: target.x, y: target.y })
    }

    p.x += p.vx * dt
    p.y += p.vy * dt
    this.resolvePlatforms(p)
    p.shootCooldown = Math.max(0, p.shootCooldown - dt * 1000)
  }

  tryShoot(p: PlayerState, target: Vec2) {
    if (p.shootCooldown > 0) return
    const w = WEAPONS[p.weapon]
    p.shootCooldown = w.fireRate
    this.stats.shots++

    const dx = target.x - p.x
    const dy = target.y - p.y
    const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * w.spread
    const speed = w.speed

    const count = w.pellets ?? 1
    for (let i = 0; i < count; i++) {
      const spread = count > 1 ? (i - (count - 1) / 2) * 0.06 : 0
      this.projectiles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(ang + spread) * speed,
        vy: Math.sin(ang + spread) * speed,
        ownerId: p.id,
        damage: w.damage,
        life: 1.4,
        radius: w.id === 'rocket' ? 7 : 3,
      })
    }
  }

  resolvePlatforms(p: PlayerState) {
    for (const plat of this.platforms) {
      const onTop =
        p.x > plat.x - 18 &&
        p.x < plat.x + plat.w + 18 &&
        p.y + 20 > plat.y &&
        p.y + 20 < plat.y + plat.h &&
        p.vy >= 0
      if (onTop) {
        p.y = plat.y - 20
        p.vy = 0
      }
    }
    if (p.y > this.height + 300) this.kill(p)
  }

  updateProjectiles(dt: number) {
    for (const pr of this.projectiles) {
      pr.life -= dt
      pr.x += pr.vx * dt
      pr.y += pr.vy * dt
      for (const target of [this.player, ...this.bots]) {
        if (!target.alive || target.id === pr.ownerId) continue
        const dx = target.x - pr.x
        const dy = target.y - pr.y
        if (Math.hypot(dx, dy) < 18 + pr.radius) {
          this.stats.hits++
          target.health -= pr.damage
          pr.life = 0
          if (target.health <= 0) this.kill(target, pr.ownerId)
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0)
  }

  updatePickups() {
    for (const pk of this.pickups) {
      if (!pk.active) continue
      const dx = this.player.x - pk.x
      const dy = this.player.y - pk.y
      if (Math.hypot(dx, dy) < 30) {
        if (pk.type === 'health') this.player.health = Math.min(this.player.maxHealth, this.player.health + pk.value)
        if (pk.type === 'jet') this.player.jet = Math.min(this.player.maxJet, this.player.jet + pk.value)
        pk.active = false
      }
    }
  }

  kill(p: PlayerState, killerId?: string) {
    p.alive = false
    p.deaths++
    p.respawnAt = performance.now() + 1800
    if (killerId) {
      const killer = [this.player, ...this.bots].find((x) => x.id === killerId)
      if (killer) killer.kills++
    }
    if (p.id === this.player.id && this.player.deaths >= 15) this.finish('bots')
  }

  draw() {
    const ctx = this.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const scaleX = this.canvas.width / 960
    const scaleY = this.canvas.height / 640
    ctx.scale(scaleX, scaleY)

    ctx.fillStyle = '#08131f'
    ctx.fillRect(0, 0, 960, 640)

    for (const plat of this.platforms) {
      ctx.fillStyle = '#19324a'
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h)
      ctx.fillStyle = '#2f6b48'
      ctx.fillRect(plat.x, plat.y - 8, plat.w, 8)
    }

    for (const pk of this.pickups) {
      if (!pk.active) continue
      ctx.fillStyle = pk.type === 'health' ? '#ff5b7a' : pk.type === 'jet' ? '#5bf7ff' : '#ffd95b'
      ctx.beginPath()
      ctx.arc(pk.x, pk.y, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const pr of this.projectiles) {
      ctx.strokeStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(pr.x, pr.y)
      ctx.lineTo(pr.x - pr.vx * 0.01, pr.y - pr.vy * 0.01)
      ctx.stroke()
    }

    this.drawPlayer(this.player, '#7cf7c5')
    for (const bot of this.bots) this.drawPlayer(bot, '#ff7b7b')

    ctx.fillStyle = '#fff'
    ctx.font = '16px Inter, sans-serif'
    ctx.fillText(`Time: ${Math.max(0, Math.ceil(this.timeLeft / 1000))}`, 20, 28)
    ctx.fillText(`Kills: ${this.player.kills} / ${this.killLimit}`, 20, 50)
    ctx.fillText(`Health: ${Math.max(0, Math.floor(this.player.health))}`, 20, 72)
    ctx.fillText(`Jet: ${Math.floor(this.player.jet)}`, 20, 94)
  }

  drawPlayer(p: PlayerState, color: string) {
    if (!p.alive) return
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.fillRect(p.x - 10, p.y - 20, 20, 28)
    ctx.fillStyle = '#000'
    ctx.fillRect(p.x + (p.facing > 0 ? 2 : -8), p.y - 14, 5, 5)
  }
}
