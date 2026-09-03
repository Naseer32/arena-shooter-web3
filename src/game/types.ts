export type Vec2 = { x: number; y: number }

export type WeaponId = 'pistol' | 'shotgun' | 'rifle' | 'sniper' | 'rocket'

export type WeaponStats = {
  name: string
  damage: number
  fireRate: number
  speed: number
  spread: number
  pellets?: number
}

export type PlayerState = {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  jet: number
  facing: 1 | -1
  onGround: boolean
  kills: number
  deaths: number
  weapon: WeaponId
  reload: number
  fireCooldown: number
  alive: boolean
  isBot?: boolean
}

export type Projectile = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  ownerId: string
  damage: number
  radius: number
  isRocket?: boolean
}

export type Pickup = {
  x: number
  y: number
  kind: 'medkit' | 'ammo' | 'jet'
  active: boolean
}
