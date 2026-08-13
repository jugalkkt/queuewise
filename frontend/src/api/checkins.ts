import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Checkin, OwnCheckin } from '@/types'

const ACTIVE_WINDOW_MS = 4 * 60 * 60 * 1000

/**
 * Live anonymous feed for a department.
 * Reads the `public_checkins` view rather than the base table — the view omits
 * user_id, so the "Anonymous" label in the UI is actually true.
 */
export function useActiveCheckins(departmentId: string | undefined) {
  return useQuery<Checkin[]>({
    queryKey: ['checkins', departmentId],
    enabled: !!departmentId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString()
      const { data, error } = await supabase
        .from('public_checkins')
        .select('*')
        .eq('department_id', departmentId!)
        .is('ended_at', null)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * Check-ins in the same department that have already ended, used to tell a
 * waiting patient how many people ahead of them have been seen.
 */
export function useEndedCheckins(departmentId: string | undefined) {
  return useQuery<Checkin[]>({
    queryKey: ['checkins-ended', departmentId],
    enabled: !!departmentId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString()
      const { data, error } = await supabase
        .from('public_checkins')
        .select('*')
        .eq('department_id', departmentId!)
        .not('ended_at', 'is', null)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * The caller's own open visit, if any.
 *
 * ActiveVisit previously relied solely on sessionStorage, so a refresh in a new
 * tab (or any session-storage loss) orphaned the visit and reset the elapsed
 * timer to zero. Recovering it from the database makes the visit durable.
 */
export function useOwnActiveCheckin(userId: string | undefined) {
  return useQuery<OwnCheckin | null>({
    queryKey: ['own-checkin', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', userId!)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
  })
}

export function useCreateCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      department_id: string
      doctor_id?: string | null
      queue_condition: 'short' | 'medium' | 'long'
      user_id: string
    }) => {
      const { data, error } = await supabase
        .from('checkins')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as OwnCheckin
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['checkins', data.department_id] })
      qc.invalidateQueries({ queryKey: ['own-checkin'] })
    },
  })
}

export function useEndCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, departmentId }: { id: string; departmentId: string }) => {
      const { error } = await supabase
        .from('checkins')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return departmentId
    },
    onSuccess: (_data, { departmentId }) => {
      qc.invalidateQueries({ queryKey: ['checkins', departmentId] })
      qc.invalidateQueries({ queryKey: ['checkins-ended', departmentId] })
      qc.invalidateQueries({ queryKey: ['own-checkin'] })
    },
  })
}

export function useUpdateCheckinCondition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      queue_condition,
    }: {
      id: string
      departmentId: string
      queue_condition: 'short' | 'medium' | 'long'
    }) => {
      const { error } = await supabase
        .from('checkins')
        .update({ queue_condition })
        .eq('id', id)
      if (error) throw error
    },
    // Without this the UI kept showing the old condition after reporting a change.
    onSuccess: (_data, { departmentId }) => {
      qc.invalidateQueries({ queryKey: ['checkins', departmentId] })
      qc.invalidateQueries({ queryKey: ['own-checkin'] })
    },
  })
}
