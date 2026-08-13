import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowRight, Smile, Meh, Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth";
import { useCreateFeedback } from "@/api/feedback";
import { readActiveCheckin, clearActiveCheckin } from "@/lib/activeVisit";
import { toast } from "sonner";

const Feedback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createFeedback = useCreateFeedback();

  const { checkinId: storedCheckinId, waitedMinutes } = readActiveCheckin();
  const checkinId = storedCheckinId ?? '';

  // Seed the slider from the wait we actually measured. Feedback now feeds the
  // prediction model, so an untouched arbitrary default would be fabricated data.
  const measuredWait =
    waitedMinutes !== null ? Math.min(240, Math.max(15, Math.round(waitedMinutes / 15) * 15)) : null;

  const [wait, setWait] = useState([measuredWait ?? 60]);
  const [waitTouched, setWaitTouched] = useState(measuredWait !== null);
  const [doctorAvailable, setDoctorAvailable] = useState<boolean | null>(null);
  const [mood, setMood] = useState<'good' | 'neutral' | 'poor' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = waitTouched && doctorAvailable !== null && mood !== null;

  const formatWait = (m: number) => {
    if (m >= 240) return '4+ hours';
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
  };

  const handleSubmit = async () => {
    if (!user || !canSubmit || doctorAvailable === null || !mood) return;

    // Without a check-in to attach to, the report cannot be tied to a time slot
    // and so cannot improve any prediction. Say so instead of dropping it silently.
    if (!checkinId) {
      toast.error("We couldn't find your visit, so this feedback can't be saved.");
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
      clearActiveCheckin();
      toast.success('Thank you! Your report just improved this hour’s prediction.');
      navigate('/dashboard');
    } catch (err) {
      // One feedback per visit — a duplicate means it already went through.
      if ((err as { code?: string })?.code === '23505') {
        clearActiveCheckin();
        toast.info('You have already submitted feedback for this visit.');
        navigate('/dashboard');
        return;
      }
      toast.error('Could not save feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    clearActiveCheckin();
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
          <p className={`font-display font-bold text-2xl ${waitTouched ? 'text-primary' : 'text-muted-foreground'}`}>
            {waitTouched ? formatWait(wait[0]) : '—'}
          </p>
        </div>
        <Slider
          value={wait}
          onValueChange={(v) => { setWait(v); setWaitTouched(true); }}
          min={15}
          max={240}
          step={15}
        />
        {measuredWait !== null && (
          <p className="text-xs text-muted-foreground">
            We measured about {formatWait(measuredWait)} — adjust if that's not right.
          </p>
        )}
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
          disabled={submitting || !canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? 'Saving…' : canSubmit ? 'Submit feedback' : 'Answer all three to submit'}{' '}
          <ArrowRight className="h-4 w-4" />
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
