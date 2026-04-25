import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Checkin } from '@/types'

export function useActiveCheckins(departmentId: string | undefined) {
  return useQuery<Checkin[]>({
    queryKey: ['checkins', departmentId],
    enabled: !!departmentId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('checkins')
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
      return data as Checkin
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['checkins', data.department_id] })
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
    },
  })
}

export function useUpdateCheckinCondition() {
  return useMutation({
    mutationFn: async ({
      id,
      queue_condition,
    }: {
      id: string
      queue_condition: 'short' | 'medium' | 'long'
    }) => {
      const { error } = await supabase
        .from('checkins')
        .update({ queue_condition })
        .eq('id', id)
      if (error) throw error
    },
  })
}
