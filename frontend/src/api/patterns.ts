import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { QueuePattern } from '@/types'

export function useQueuePatterns(departmentId: string | undefined) {
  return useQuery<QueuePattern[]>({
    queryKey: ['patterns', departmentId],
    enabled: !!departmentId,
    staleTime: 5 * 60 * 1000, // patterns don't change often
    queryFn: async () => {
      const { data, error } = await supabase
        .from('queue_patterns')
        .select('*')
        .eq('department_id', departmentId!)
      if (error) throw error
      return data ?? []
    },
  })
}
