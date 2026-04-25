import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserPreferences } from '@/types'

export function useUserPrefs(userId: string | undefined) {
  return useQuery<UserPreferences | null>({
    queryKey: ['userPrefs', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId!)
        .single()
      // PGRST116 = no rows found — normal for new users
      if (error && error.code !== 'PGRST116') throw error
      return data ?? null
    },
  })
}

export function useUpsertUserPrefs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (prefs: Partial<UserPreferences> & { user_id: string }) => {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(prefs, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['userPrefs', vars.user_id] })
    },
  })
}
