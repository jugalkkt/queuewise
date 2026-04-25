import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Doctor } from '@/types'

export function useDoctors(departmentId: string | undefined) {
  return useQuery<Doctor[]>({
    queryKey: ['doctors', departmentId],
    enabled: !!departmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('department_id', departmentId!)
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useDoctorsByHospital(hospitalId: string | undefined) {
  return useQuery<Doctor[]>({
    queryKey: ['doctors-hospital', hospitalId],
    enabled: !!hospitalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('hospital_id', hospitalId!)
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useDoctor(id: string | undefined) {
  return useQuery<Doctor | null>({
    queryKey: ['doctor', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useReportDoctorStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Doctor['status'] }) => {
      const { error } = await supabase
        .from('doctors')
        .update({ status, status_updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['doctor', id] })
      qc.invalidateQueries({ queryKey: ['doctors'] })
      qc.invalidateQueries({ queryKey: ['doctors-hospital'] })
    },
  })
}
