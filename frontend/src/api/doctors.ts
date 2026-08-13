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

/**
 * Files a crowdsourced report about a doctor's status.
 *
 * This used to UPDATE `doctors` straight from the client. Once RLS was enabled
 * without an UPDATE policy that matched zero rows and returned no error, so the
 * app showed a success toast while nothing changed. Reports now go to
 * `doctor_status_reports`; a trigger republishes `doctors.status` only when two
 * distinct users agree within the six-hour window.
 */
export function useReportDoctorStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
      userId,
    }: {
      id: string
      status: 'on_duty' | 'on_leave'
      userId: string
    }) => {
      const { error } = await supabase
        .from('doctor_status_reports')
        .insert({ doctor_id: id, user_id: userId, reported_status: status })
      if (error) {
        // Unique violation = this user already reported this doctor this hour.
        if (error.code === '23505') {
          throw new Error('You have already reported this doctor recently.')
        }
        throw error
      }
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['doctor', id] })
      qc.invalidateQueries({ queryKey: ['doctors'] })
      qc.invalidateQueries({ queryKey: ['doctors-hospital'] })
    },
  })
}
