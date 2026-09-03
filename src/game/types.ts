export type Vector2 = {
  x: number
  y: number
}

export type Player = {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  facing: -1 | 1
  hp: number
  maxHp: number
  fuel: number
  maxFuel: number
  isBot: boolean
  color: string
}
