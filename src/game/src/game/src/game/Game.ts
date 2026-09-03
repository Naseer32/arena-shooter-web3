import { DEFAULT_WEAPON, WEAPONS } from './loadout'
import type { GameSnapshot, Pickup, PlayerState, Projectile, WeaponId } from './types'

type InputState = {
  left: boolean
  right: boolean
  jump: boolean
  shoot: boolean
  reload: boolean
  grenade: boolean
  weapon1: boolean
  weapon2: boolean
  weapon3: boolean
  aimX: number
  aimY: number
}

type BotBrain = {
  think: number
  shootTimer: number
  strafeDir: 1 | -1
}

const GRAVITY = 1800
const MOVE_SPEED = 260
const JUMP_SPEED = 560
const JET_FORCE = 950
const MAX_JET = 100
const MATCH_TIME = 300
const WIN_KILLS = 15

export class Game {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number

  player: PlayerState
  bots: PlayerState[]
  bullets: Projectile[] = []
  pickups: Pickup[] = []
  botBrains = new Map<string, BotBrain>()

  timeLeft = MATCH_TIME
  running = true
  winner: GameSnapshot['winner'] | null = null

  kills = 0
  deaths = 0
  shots = 0
  hits = 0

  lastTs = 0

  input: InputState = {
    left: false,
    right: false,
    jump: false,
    shoot: false,
    reload: false,
    grenade: false,
    weapon1: false,
    weapon2: false,
    weapon3: false,
    aimX: 0,
    aimY: 0,
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')
    this.ctx = ctx
    this.width = canvas.width
    this.height = canvas.height

    this.player = this.spawnPlayer('player', false)
    this.bots = Array.from({ length: 5 }, (_, i) => this.spawnPlayer(`bot-${i + 1}`, true))
    for (const bot of this.bots) {
      this.botBrains.set(bot.id, {
        think: 0,
        shootTimer: 0,
        strafeDir: Math.random() < 0.5 ? -1 : 1,
      })
    }

    this.seedPickups()
  }

  spawnPlayer(id: string, isBot: boolean): PlayerState {
    return {
      id,
      x: 120 + Math.random() * (this.width - 240),
      y: 120,
      vx: 0,
      vy: 0,
      hp: 100,
      jet: MAX_JET,
      facing: 1,
      onGround: false,
      kills: 0,
      deaths: 0,
      weapon: DEFAULT_WEAPON,
      reload: 0,
      fireCooldown: 0,
      alive: true,
      isBot,
    }
  }

  seedPickups() {
    this.pickups = [
      { x: 220, y: this.height - 120, kind: 'medkit', active: true },
      { x: this.width / 2, y: this.height - 180, kind: 'ammo', active: true },
      { x: this.width - 220, y: this.height - 120, kind: 'jet', active: true },
    ]
  }

  update(ts: number) {
    if (!this.running) return
    const dt = this.lastTs ? Math.min((ts - this.lastTs) / 1000, 0.033) : 0.016
    this.lastTs = ts

    this.timeLeft = Math.max(0, this.timeLeft - dt)
    if (this.timeLeft <= 0) {
      this.finish(this.player.kills >= this.bots.reduce((a, b) => a + b.kills, 0) ? 'player' : 'bots')
      return
    }

    this.stepPlayer(this.player, dt, true)
    for (const bot of this.bots) this.stepBot(bot, dt)

    this.updateProjectiles(dt)
    this.handlePickups()
    this.checkWin()
    this.draw()
  }

  finish(winner: GameSnapshot['winner']) {
    this.running = false
    this.winner = winner
  }

  checkWin() {
    if (this.player.kills >= WIN_KILLS) this.finish('player')
    if (this.bots.some((b) => b.kills >= WIN_KILLS)) this.finish('bots')
  }

  stepPlayer(p: PlayerState, dt: number, isHuman = false) {
    if (!p.alive) return

    p.reload = Math.max(0, p.reload - dt * 1000)
    p.fireCooldown = Math.max(0, p.fireCooldown - dt * 1000)

    const weapon = WEAPONS[p.weapon]
    let move = 0
    if (isHuman) {
      if (this.input.left) move -= 1
      if (this.input.right) move += 1
      if (this.input.weapon1) p.weapon = 'pistol'
      if (this.input.weapon2) p.weapon = 'shotgun'
      if (this.input.weapon3) p.weapon = 'rifle'
      if (this.input.reload) p.reload = 700
    }

    p.vx = move * MOVE_SPEED
    if (move !== 0) p.facing = move > 0 ? 1 : -1

    if (this.input.jump && p.onGround) {
      p.vy = -JUMP_SPEED
      p.onGround = false
    }

    if (this.input.shoot) this.fire(p, this.input.aimX, this.input.aimY)

    p.vy += GRAVITY * dt
    p.x += p.vx * dt
    p.y += p.vy * dt

    if (p.y >= this.height - 40) {
      p.y = this.height - 40
      p.vy = 0
      p.onGround = true
      p.jet = Math.min(MAX_JET, p.jet + 20 * dt)
    }
    p.x = Math.max(30, Math.min(this.width - 30, p.x))
    void weapon
  }

  stepBot(bot: PlayerState, dt: number) {
    const brain = this.botBrains.get(bot.id)
    if (!brain || !bot.alive) return

    brain.think -= dt
    brain.shootTimer -= dt

    const target = this.player.alive ? this.player : bot
    const dx = target.x - bot.x
    const dy = target.y - bot.y

    bot.facing = dx >= 0 ? 1 : -1
    bot.vx = Math.sign(dx) * MOVE_SPEED * 0.7
    if (Math.abs(dx) < 120) bot.vx = 0

    if (bot.onGround && Math.random() < 0.01) bot.vy = -JUMP_SPEED * 0.85
    if (bot.jet > 5 && Math.abs(dy) > 80 && Math.random() < 0.02) {
      bot.vy -= JET_FORCE * dt
      bot.jet -= 35 * dt
    }

    bot.vy += GRAVITY * dt
    bot.x += bot.vx * dt
    bot.y += bot.vy * dt

    if (bot.y >= this.height - 40) {
      bot.y = this.height - 40
      bot.vy = 0
      bot.onGround = true
      bot.jet = Math.min(MAX_JET, bot.jet + 16 * dt)
    }
    bot.x = Math.max(30, Math.min(this.width - 30, bot.x))

    if (brain.shootTimer <= 0 && Math.abs(dx) < 700) {
      this.fire(bot, target.x, target.y)
      brain.shootTimer = 0.45 + Math.random() * 0.7
    }
  }

  fire(shooter: PlayerState, tx: number, ty: number) {
    if (shooter.fireCooldown > 0 || shooter.reload > 0 || !shooter.alive) return
    const weapon = WEAPONS[shooter.weapon]
    shooter.fireCooldown = weapon.fireRate
    this.shots++

    const ang = Math.atan2(ty - shooter.y, tx - shooter.x)
    const count = weapon.pellets ?? 1
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread
      const a = ang + spread
      this.bullets.push({
        x: shooter.x,
        y: shooter.y - 10,
        vx: Math.cos(a) * weapon.speed,
        vy: Math.sin(a) * weapon.speed,
        life: 1.8,
        ownerId: shooter.id,
        damage: weapon.damage,
        radius: weapon.name.includes('Rocket') ? 8 : 3,
        isRocket: shooter.weapon === 'rocket',
      })
    }
  }

  updateProjectiles(dt: number) {
    for (const b of this.bullets) {
      b.life -= dt
      b.x += b.vx * dt
      b.y += b.vy * dt
    }
    this.bullets = this.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < this.width && b.y > 0 && b.y < this.height)

    for (const b of this.bullets) {
      const targets = [this.player, ...this.bots].filter((p) => p.alive && p.id !== b.ownerId)
      for (const t of targets) {
        const dx = t.x - b.x
        const dy = t.y - b.y
        if (dx * dx + dy * dy < (18 + b.radius) ** 2) {
          t.hp -= b.damage
          this.hits++
          b.life = 0
          if (t.hp <= 0) this.kill(t, b.ownerId)
          break
        }
      }
    }
  }

  kill(victim: PlayerState, killerId: string) {
    victim.alive = false
    victim.deaths++
    if (victim.id === this.player.id) this.deaths++

    const killer = [this.player, ...this.bots].find((p) => p.id === killerId)
    if (killer) killer.kills++

    setTimeout(() => this.respawn(victim), 1800)
  }

  respawn(p: PlayerState) {
    p.x = 120 + Math.random() * (this.width - 240)
    p.y = 120
    p.vx = 0
    p.vy = 0
    p.hp = 100
    p.jet = MAX_JET
    p.alive = true
    p.reload = 0
    p.fireCooldown = 0
  }

  handlePickups() {
    for (const p of [this.player, ...this.bots]) {
      if (!p.alive) continue
      for (const item of this.pickups) {
        if (!item.active) continue
        const dx = p.x - item.x
        const dy = p.y - item.y
        if (dx * dx + dy * dy < 40 * 40) {
          item.active = false
          if (item.kind === 'medkit') p.hp = Math.min(100, p.hp + 40)
          if (item.kind === 'jet') p.jet = Math.min(MAX_JET, p.jet + 50)
        }
      }
    }
  }

  getSnapshot(): GameSnapshot {
    const totalKills = this.player.kills
    const accuracy = this.shots > 0 ? this.hits / this.shots : 0
    return {
      winner: this.winner ?? (this.player.kills >= WIN_KILLS ? 'player' : 'bots'),
      kills: totalKills,
      deaths: this.deaths,
      accuracy,
    }
  }

  draw() {
    const g = this.ctx
    g.clearRect(0, 0, this.width, this.height)

    g.fillStyle = '#0b1220'
    g.fillRect(0, 0, this.width, this.height)
    g.fillStyle = '#1f2937'
    g.fillRect(0, this.height - 40, this.width, 40)

    const drawChar = (p: PlayerState, color: string) => {
      if (!p.alive) return
      g.fillStyle = color
      g.beginPath()
      g.arc(p.x, p.y, 14, 0, Math.PI * 2)
      g.fill()
    }

    drawChar(this.player, '#22c55e')
    for (const bot of this.bots) drawChar(bot, '#ef4444')

    g.fillStyle = '#fbbf24'
    for (const b of this.bullets) {
      g.beginPath()
      g.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
      g.fill()
    }

    g.fillStyle = '#60a5fa'
    for (const p of this.pickups) {
      if (!p.active) continue
      g.fillRect(p.x - 8, p.y - 8, 16, 16)
    }
  }
}
