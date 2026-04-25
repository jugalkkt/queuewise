import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowRight, Smile, Meh, Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth";
import { useCreateFeedback } from "@/api/feedback";
import { toast } from "sonner";

const Feedback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createFeedback = useCreateFeedback();

  const [wait, setWait] = useState([75]);
  const [doctorAvailable, setDoctorAvailable] = useState<boolean | null>(true);
  const [mood, setMood] = useState<'good' | 'neutral' | 'poor' | null>('good');
  const [submitting, setSubmitting] = useState(false);

  const checkinId = sessionStorage.getItem('active_checkin_id') ?? '';

  const formatWait = (m: number) => {
    if (m >= 240) return '4+ hours';
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
  };

  const handleSubmit = async () => {
    if (!user || !checkinId || doctorAvailable === null || !mood) {
      navigate('/dashboard');
      return;
    }
    setSubmitting(true);
    try {
      await createFeedback.mutateAsync({
        checkin_id: checkinId,
        user_id: user.id,
        actual_wait_minutes: wait[0],
        doctor_available: doctorAvailable,
        experience_rating: mood,
      });
      sessionStorage.removeItem('active_checkin_id');
      sessionStorage.removeItem('active_dept_id');
      toast.success('Thank you! Your feedback helps other patients.');
    } catch {
      toast.error('Could not save feedback, but your visit has been recorded.');
    } finally {
      setSubmitting(false);
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    sessionStorage.removeItem('active_checkin_id');
    sessionStorage.removeItem('active_dept_id');
    navigate('/dashboard');
  };

  return (
    <div className="container max-w-xl py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-full bg-primary-soft text-primary flex items-center justify-center mx-auto">
          <Heart className="h-6 w-6" />
        </div>
        <h1 className="font-display font-bold text-3xl">Thanks for visiting</h1>
        <p className="text-muted-foreground text-sm">
          A quick 30-second report makes predictions sharper for everyone.
        </p>
      </div>

      <div className="card-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">How long did you actually wait?</p>
          <p className="font-display font-bold text-2xl text-primary">{formatWait(wait[0])}</p>
        </div>
        <Slider value={wait} onValueChange={setWait} min={15} max={240} step={15} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>&lt; 30m</span><span>4+ hr</span>
        </div>
      </div>

      <div className="card-surface p-6 space-y-3">
        <p className="font-semibold">Was your doctor available?</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: true, label: 'Yes' },
            { v: false, label: 'No' },
          ].map((o) => (
            <button
              key={o.label}
              onClick={() => setDoctorAvailable(o.v)}
              className={`rounded-2xl border-2 p-4 font-semibold transition-all ${
                doctorAvailable === o.v
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border bg-surface hover:bg-surface-muted'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface p-6 space-y-3">
        <p className="font-semibold">Overall experience</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: 'poor',    icon: Frown, label: 'Poor', color: 'text-destructive' },
            { v: 'neutral', icon: Meh,   label: 'Okay', color: 'text-warning' },
            { v: 'good',    icon: Smile, label: 'Good', color: 'text-success' },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setMood(o.v as typeof mood)}
              className={`rounded-2xl border-2 p-4 flex flex-col items-center gap-1 transition-all ${
                mood === o.v
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-surface hover:bg-surface-muted'
              }`}
            >
              <o.icon className={`h-7 w-7 ${o.color}`} />
              <p className="text-xs font-medium">{o.label}</p>
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Your report helps improve predictions for{' '}
        <span className="font-semibold text-foreground">4,200+ patients</span> visiting tomorrow.
      </p>

      <div className="space-y-3">
        <Button
          size="lg"
          variant="ink"
          className="w-full"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Saving…' : 'Submit feedback'} <ArrowRight className="h-4 w-4" />
        </Button>
        <button
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={handleSkip}
        >
          Skip
        </button>
      </div>
    </div>
  );
};

export default Feedback;
