import type { WeaponId, WeaponStats } from './types'

export const WEAPONS: Record<WeaponId, WeaponStats> = {
  pistol: { name: 'Pistol', damage: 18, fireRate: 300, speed: 900, spread: 0.02 },
  shotgun: { name: 'Shotgun', damage: 10, fireRate: 700, speed: 780, spread: 0.18, pellets: 6 },
  rifle: { name: 'Assault Rifle', damage: 11, fireRate: 110, speed: 1100, spread: 0.05 },
  sniper: { name: 'Sniper', damage: 55, fireRate: 1100, speed: 1500, spread: 0.005 },
  rocket: { name: 'Rocket Launcher', damage: 85, fireRate: 1300, speed: 650, spread: 0.01 },
}

export const WEAPON_ORDER: WeaponId[] = ['pistol', 'shotgun', 'rifle', 'sniper', 'rocket']
