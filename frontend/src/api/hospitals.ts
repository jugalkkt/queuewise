import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Hospital } from '@/types'

export function useHospitals(search?: string) {
  return useQuery<Hospital[]>({
    queryKey: ['hospitals', search ?? ''],
    queryFn: async () => {
      let q = supabase.from('hospitals').select('*').order('name')
      if (search) q = q.ilike('name', `%${search}%`)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

export function useHospital(id: string | undefined) {
  return useQuery<Hospital | null>({
    queryKey: ['hospital', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
  })
}
