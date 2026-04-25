import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const OTP = () => {
  const navigate = useNavigate();
  const { phone, setPhone } = useAuth();
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setInterval(
      () => setSeconds((s) => (s > 0 ? s - 1 : 0)),
      1000
    );
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    setVerifying(false);
    if (error) {
      toast.error('Incorrect code — please try again.');
      setCode('');
      return;
    }
    navigate('/onboarding/hospital');
  };

  const handleResend = async () => {
    if (!phone) return;
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('New code sent!');
    setSeconds(30);
    setCode('');
  };

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    if (code.length === 6) handleVerify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const displayPhone = phone || '+91 XXXXXXXXXX';

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setPhone(''); navigate('/login'); }}
            className="self-start -ml-2"
          >
            <ArrowLeft className="h-4 w-4" /> Change phone number
          </Button>

          <div className="text-center space-y-2">
            <h1 className="font-display font-bold text-3xl">Enter the code</h1>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to{' '}
              <span className="font-semibold text-foreground">{displayPhone}</span>
            </p>
          </div>

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode} disabled={verifying}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-14 w-12 text-xl rounded-xl" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {seconds > 0 ? (
              <>
                Resend in{' '}
                <span className="font-semibold text-foreground">
                  0:{String(seconds).padStart(2, '0')}
                </span>
              </>
            ) : (
              <button
                className="text-primary font-semibold hover:underline"
                onClick={handleResend}
              >
                Resend OTP
              </button>
            )}
          </div>

          <Button
            size="lg"
            variant="ink"
            className="w-full"
            disabled={code.length !== 6 || verifying}
            onClick={handleVerify}
          >
            {verifying ? 'Verifying…' : 'Verify & continue'}{' '}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default OTP;
