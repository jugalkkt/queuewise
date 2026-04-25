import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

type Mode = 'phone' | 'email';

const Login = () => {
  const navigate = useNavigate();
  const { setPhone } = useAuth();
  const [mode, setMode] = useState<Mode>('email');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding/hospital` },
    });
    if (error) toast.error('Google sign-in failed: ' + error.message);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: `${window.location.origin}/onboarding/hospital` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmailSent(true);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneInput.replace(/\s/g, '');
    if (!digits.match(/^[0-9]{10}$/)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    const fullPhone = `+91${digits}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPhone(fullPhone);
    navigate('/otp');
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="container flex h-20 items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">Q</div>
            <span className="font-display font-bold text-xl">QueueWise</span>
          </Link>
        </header>
        <section className="container flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-md card-surface p-8 space-y-4 text-center">
            <div className="h-14 w-14 rounded-full bg-primary-soft text-primary flex items-center justify-center mx-auto">
              <Mail className="h-7 w-7" />
            </div>
            <h1 className="font-display font-bold text-2xl">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to <span className="font-semibold text-foreground">{emailInput}</span>.
              Click the link in the email to sign in.
            </p>
            <p className="text-xs text-muted-foreground">
              No email?{' '}
              <button className="text-primary underline" onClick={() => setEmailSent(false)}>
                Try again
              </button>
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container flex h-20 items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">Q</div>
          <span className="font-display font-bold text-xl">QueueWise</span>
        </Link>
      </header>

      <section className="container flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md card-surface p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-display font-bold text-3xl">Welcome</h1>
            <p className="text-sm text-muted-foreground">Sign in or create an account in seconds. No password needed.</p>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogle}
          >
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Mode switcher */}
          <div className="flex rounded-xl bg-surface-muted p-1 gap-1">
            <button
              onClick={() => setMode('email')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'email' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Email
            </button>
            <button
              onClick={() => setMode('phone')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'phone' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Phone (OTP)
            </button>
          </div>

          {mode === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Email address</label>
              <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 h-14">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="border-0 focus-visible:ring-0 bg-transparent text-base"
                />
              </div>
              <Button type="submit" size="lg" variant="ink" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send magic link'} <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePhoneSubmit} className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Phone number</label>
              <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 h-14">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">+91</span>
                <Input
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="border-0 focus-visible:ring-0 bg-transparent text-base"
                />
              </div>
              <Button type="submit" size="lg" variant="ink" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send OTP'} <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            By continuing, you agree to our <a className="underline" href="#">Terms</a> and <a className="underline" href="#">Privacy Policy</a>.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
