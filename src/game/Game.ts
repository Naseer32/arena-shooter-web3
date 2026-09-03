import type { GameSnapshot } from './types'

export function createGame(
  canvas: HTMLCanvasElement,
  onFinish: (snapshot: GameSnapshot) => void,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  let running = true
  let startTime = performance.now()
  let kills = 0
  let deaths = 0
  let shots = 0
  let hits = 0

  const update = (t: number) => {
    if (!running) return

    const elapsed = (t - startTime) / 1000
    const timeLeft = Math.max(0, 300 - elapsed)

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#07111f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#9be15d'
    ctx.font = '32px sans-serif'
    ctx.fillText('Arena active', 40, 60)
    ctx.font = '18px sans-serif'
    ctx.fillText(`Time left: ${timeLeft.toFixed(0)}s`, 40, 100)
    ctx.fillText(`Kills: ${kills}`, 40, 130)
    ctx.fillText(`Deaths: ${deaths}`, 40, 160)

    if (timeLeft <= 0) {
      running = false
      const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0
      onFinish({
        winner: kills >= 15 ? 'player' : 'bots',
        kills,
        deaths,
        accuracy,
      })
    }
  }

  return {
    update,
    destroy() {
      running = false
    },
  }
}
