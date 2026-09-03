import type { GameSnapshot, Vec2 } from './types'

type Entity = {
  pos: Vec2
  vel: Vec2
  radius: number
  color: string
}

export function createGame(
  canvas: HTMLCanvasElement,
  onFinish: (snapshot: GameSnapshot) => void,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  let running = true
  let last = performance.now()
  let startTime = performance.now()

  const player: Entity = {
    pos: { x: 180, y: 560 },
    vel: { x: 0, y: 0 },
    radius: 18,
    color: '#9be15d',
  }

  const bots: Entity[] = Array.from({ length: 5 }, (_, i) => ({
    pos: { x: 600 + i * 120, y: 560 - (i % 2) * 80 },
    vel: { x: 0, y: 0 },
    radius: 16,
    color: '#ff6b6b',
  }))

  let kills = 0
  let deaths = 0
  let shots = 0
  let hits = 0
  let shotCooldown = 0
  let gravity = 1800
  let playerOnGround = true
  let jetFuel = 100

  const keys = new Set<string>()
  let mouse = { x: 0, y: 0, down: false }

  const resize = () => {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    canvas.style.width = `${1280 * scale}px`
    canvas.style.height = `${720 * scale}px`
  }

  const respawnPlayer = () => {
    player.pos = { x: 180, y: 560 }
    player.vel = { x: 0, y: 0 }
    jetFuel = 100
    deaths += 1
  }

  const respawnBot = (bot: Entity, index: number) => {
    bot.pos = { x: 600 + index * 120, y: 560 - (index % 2) * 80 }
    bot.vel = { x: 0, y: 0 }
  }

  const drawEntity = (e: Entity) => {
    ctx.beginPath()
    ctx.fillStyle = e.color
    ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const update = (t: number) => {
    if (!running) return

    const dt = Math.min(0.032, (t - last) / 1000)
    last = t

    const elapsed = (t - startTime) / 1000
    const timeLeft = Math.max(0, 300 - elapsed)

    shotCooldown = Math.max(0, shotCooldown - dt)

    const speed = 260
    if (keys.has('a') || keys.has('ArrowLeft')) player.vel.x = -speed
    else if (keys.has('d') || keys.has('ArrowRight')) player.vel.x = speed
    else player.vel.x *= 0.8

    const jetting = keys.has(' ') && jetFuel > 0
    if (jetting) {
      player.vel.y -= 1100 * dt
      jetFuel = Math.max(0, jetFuel - 25 * dt)
    } else {
      jetFuel = Math.min(100, jetFuel + 12 * dt)
    }

    player.vel.y += gravity * dt
    player.pos.x += player.vel.x * dt
    player.pos.y += player.vel.y * dt

    if (player.pos.y >= 560) {
      player.pos.y = 560
      player.vel.y = 0
      playerOnGround = true
    } else {
      playerOnGround = false
    }

    player.pos.x = Math.max(40, Math.min(canvas.width - 40, player.pos.x))

    if (mouse.down && shotCooldown === 0) {
      shots += 1
      shotCooldown = 0.18
      const dx = mouse.x - player.pos.x
      const dy = mouse.y - player.pos.y
      const dist = Math.hypot(dx, dy) || 1
      const dirX = dx / dist
      const dirY = dy / dist

      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i]
        const bx = bot.pos.x - player.pos.x
        const by = bot.pos.y - player.pos.y
        const proj = bx * dirX + by * dirY
        const perp = Math.abs(bx * dirY - by * dirX)
        if (proj > 0 && proj < 900 && perp < bot.radius + 8) {
          hits += 1
          kills += 1
          respawnBot(bot, i)
          break
        }
      }
    }

    for (let i = 0; i < bots.length; i++) {
      const bot = bots[i]
      const dir = Math.sign(player.pos.x - bot.pos.x)
      bot.vel.x = dir * 140
      bot.pos.x += bot.vel.x * dt
      bot.pos.x = Math.max(40, Math.min(canvas.width - 40, bot.pos.x))

      if (Math.random() < 0.003) {
        bot.vel.y = -700
      }
      bot.vel.y += gravity * dt
      bot.pos.y += bot.vel.y * dt
      if (bot.pos.y >= 560) {
        bot.pos.y = 560
        bot.vel.y = 0
      }
    }

    if (kills >= 15 || timeLeft <= 0) {
      running = false
      const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0
      onFinish({
        winner: kills >= 15 ? 'player' : 'bots',
        kills,
        deaths,
        accuracy,
      })
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#07111f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#16311f'
    ctx.fillRect(0, 600, canvas.width, 120)

    ctx.strokeStyle = '#2f6f4e'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(0, 600)
    ctx.lineTo(canvas.width, 600)
    ctx.stroke()

    drawEntity(player)
    bots.forEach(drawEntity)

    ctx.fillStyle = '#ffffff'
    ctx.font = '20px sans-serif'
    ctx.fillText(`Time: ${timeLeft.toFixed(0)}s`, 40, 40)
    ctx.fillText(`Kills: ${kills}/15`, 40, 70)
    ctx.fillText(`Jet: ${Math.round(jetFuel)}%`, 40, 100)
    ctx.fillText(`Accuracy: ${shots ? Math.round((hits / shots) * 100) : 0}%`, 40, 130)

    ctx.fillStyle = '#9be15d'
    ctx.fillText('WASD/Arrows move • Space jetpack • Mouse aim/click shoot', 40, 680)
  }

  const onKeyDown = (e: KeyboardEvent) => keys.add(e.key)
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key)
  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width)
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height)
  }
  const onMouseDown = () => (mouse.down = true)
  const onMouseUp = () => (mouse.down = false)

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('resize', resize)
  resize()

  return {
    update,
    destroy() {
      running = false
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('resize', resize)
    },
  }
}
