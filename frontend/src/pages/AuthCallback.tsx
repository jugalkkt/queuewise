import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { useUserPrefs } from '@/api/userPrefs'

/**
 * Reads an OAuth error from the callback URL.
 *
 * Supabase returns failures either as query params or in the URL fragment,
 * depending on the provider and flow, so both have to be checked.
 */
function readAuthError(): string | null {
  const fromQuery = new URLSearchParams(window.location.search)
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  const code = fromQuery.get('error') ?? fromHash.get('error')
  if (!code) return null

  const description =
    fromQuery.get('error_description') ?? fromHash.get('error_description')

  return description ? decodeURIComponent(description.replace(/\+/g, ' ')) : code
}

const AuthCallback = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { data: prefs, isLoading: prefsLoading } = useUserPrefs(user?.id)

  // Captured once on mount: Supabase strips the fragment after parsing it.
  const [authError] = useState(readAuthError)
  const [timedOut, setTimedOut] = useState(false)

  // If no session materialises, say so rather than bouncing to /login with no
  // explanation — the usual cause is the redirect URL not being allow-listed.
  useEffect(() => {
    if (authError) return
    const t = setTimeout(() => setTimedOut(true), 10_000)
    return () => clearTimeout(t)
  }, [authError])

  useEffect(() => {
    if (authError || loading || prefsLoading || !user) return
    navigate(prefs?.primary_hospital_id ? '/dashboard' : '/onboarding/hospital', {
      replace: true,
    })
  }, [authError, loading, prefsLoading, user, prefs, navigate])

  if (authError || timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card-surface p-8 max-w-md w-full space-y-4 text-center">
          <h1 className="font-display font-bold text-2xl">Sign-in didn't complete</h1>
          <p className="text-sm text-muted-foreground">
            {authError ?? "We didn't get a session back from the sign-in provider."}
          </p>
          <p className="text-xs text-muted-foreground">
            If this keeps happening, this site's address may not be on the
            allowed redirect list for the auth provider.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="ink" onClick={() => navigate('/login', { replace: true })}>
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Go home</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export default AuthCallback
