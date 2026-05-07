import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useUserPrefs } from '@/api/userPrefs'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { data: prefs, isLoading: prefsLoading } = useUserPrefs(user?.id)

  useEffect(() => {
    if (loading || prefsLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (prefs?.primary_hospital_id) {
      navigate('/dashboard', { replace: true })
    } else {
      navigate('/onboarding/hospital', { replace: true })
    }
  }, [loading, prefsLoading, user, prefs, navigate])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export default AuthCallback
