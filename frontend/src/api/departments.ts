import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Department } from '@/types'

export function useDepartments(hospitalId: string | undefined) {
  return useQuery<Department[]>({
    queryKey: ['departments', hospitalId],
    enabled: !!hospitalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('hospital_id', hospitalId!)
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useDepartment(id: string | undefined) {
  return useQuery<Department | null>({
    queryKey: ['department', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
  })
}
