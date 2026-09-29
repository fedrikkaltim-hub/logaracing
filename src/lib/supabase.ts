import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)
export const supabase = isSupabaseConfigured ? createClient(url!, key!, {
  realtime: { params: { eventsPerSecond: 20 } },
}) : null

export async function verifyTeacher(username: string, password: string) {
  if (supabase) {
    const { data, error } = await supabase.rpc('logaracing_verify_teacher', {
      p_username: username,
      p_password: password,
    })
    if (error) return false
    return data === true
  }

  return false
}

export async function upsertSession(sessionId: string, startedAt?: string) {
  if (!supabase) return
  await supabase.functions.invoke('logaracing-events', {
    body: {
      event: 'session.upsert',
      sessionId,
      status: startedAt ? 'racing' : 'lobby',
      startedAt: startedAt ?? null,
    },
  })
}

export async function recordPlayer(payload: {
  sessionId: string
  playerId: string
  name: string
  color: string
}) {
  if (!supabase) return
  await supabase.functions.invoke('logaracing-events', {
    body: {
      event: 'player.upsert',
      sessionId: payload.sessionId,
      playerId: payload.playerId,
      name: payload.name,
      color: payload.color,
    },
  })
}
