import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCreateFeedback() {
  return useMutation({
    mutationFn: async (payload: {
      checkin_id: string
      user_id: string
      actual_wait_minutes: number
      doctor_available: boolean
      experience_rating: 'poor' | 'neutral' | 'good'
    }) => {
      const { error } = await supabase.from('visit_feedback').insert(payload)
      if (error) throw error
    },
  })
}
