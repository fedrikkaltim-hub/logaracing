export type Role = 'student' | 'teacher'
export type RaceStatus = 'lobby' | 'racing' | 'finished'

export type PlayerPresence = {
  playerId: string
  name: string
  color: string
  ready: boolean
  score: number
  answered: number
  finished: boolean
  onlineAt: string
}

