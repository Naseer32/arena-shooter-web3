export function initGame(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let raf = 0

  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    const w = Math.min(window.innerWidth, 960)
    const h = Math.min(window.innerHeight, 540)

    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const draw = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    ctx.clearRect(0, 0, w, h)

    // sky
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#123a22')
    g.addColorStop(1, '#07130c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // ground
    ctx.fillStyle = '#203425'
    ctx.fillRect(0, h - 80, w, 80)

    // platforms
    ctx.fillStyle = '#314b35'
    ctx.fillRect(120, h - 180, 220, 18)
    ctx.fillRect(520, h - 260, 260, 18)
    ctx.fillRect(860, h - 150, 180, 18)

    // player
    ctx.fillStyle = '#3cff9a'
    ctx.fillRect(120, h - 140, 24, 40)

    // bot
    ctx.fillStyle = '#ff5d5d'
    ctx.fillRect(420, h - 140, 24, 40)

    // label
    ctx.fillStyle = '#fff'
    ctx.font = '16px system-ui'
    ctx.fillText('Arena prototype loaded', 16, 28)

    raf = requestAnimationFrame(draw)
  }

  resize()
  window.addEventListener('resize', resize)
  draw()

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
  }
}
