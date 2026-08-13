import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/api/departments";
import { useAuth } from "@/lib/auth";
import { useUpsertUserPrefs, useUserPrefs } from "@/api/userPrefs";
import { toast } from "sonner";

const OnboardingDepartment = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Router state is lost on refresh or direct navigation, which used to leave
  // this page permanently empty with no explanation. Fall back to the hospital
  // already saved in the user's preferences.
  const { data: prefs, isLoading: prefsLoading } = useUserPrefs(user?.id);
  const hospitalId: string | undefined = state?.hospitalId ?? prefs?.primary_hospital_id ?? undefined;

  const { data: departments = [], isLoading: deptsLoading } = useDepartments(hospitalId);
  const isLoading = prefsLoading || (!!hospitalId && deptsLoading);
  const upsertPrefs = useUpsertUserPrefs();

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleDone = async () => {
    if (!user || selected.length === 0) return;
    setSaving(true);
    try {
      await upsertPrefs.mutateAsync({
        user_id: user.id,
        primary_department_id: selected[0] ?? null,
        saved_department_ids: selected,
        onboarding_completed: true,
      });
      navigate("/dashboard");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    await upsertPrefs.mutateAsync({ user_id: user.id, onboarding_completed: true });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="container flex h-20 items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">Q</div>
          <span className="font-display font-bold text-xl">QueueWise</span>
        </Link>
      </header>

      <section className="container max-w-2xl py-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="text-primary">Step 2</span> of 2
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full w-full bg-primary rounded-full" />
          </div>
          <h1 className="font-display font-bold text-3xl md:text-4xl">Which department(s) do you usually visit?</h1>
          <p className="text-muted-foreground">Pick one or more. We'll show predictions and doctor availability for these from day one.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-surface-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !hospitalId ? (
          <div className="card-surface p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              We don't know which hospital you picked. Choose one to continue.
            </p>
            <Button variant="soft" onClick={() => navigate('/onboarding/hospital')}>
              Back to hospital selection
            </Button>
          </div>
        ) : departments.length === 0 ? (
          <div className="card-surface p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No departments are listed for this hospital yet.
            </p>
            <Button variant="soft" onClick={() => navigate('/onboarding/hospital')}>
              Pick a different hospital
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {departments.map((d) => {
              const active = selected.includes(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggle(d.id)}
                  className={`card-surface p-4 text-left flex items-center justify-between transition-all ${
                    active ? "ring-2 ring-primary bg-primary-soft" : "hover:bg-surface-muted"
                  }`}
                >
                  <span className="font-medium">{d.name}</span>
                  {active && (
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-4 pt-2 space-y-3">
          <Button
            size="lg"
            variant="ink"
            className="w-full"
            disabled={saving || selected.length === 0}
            onClick={handleDone}
          >
            {saving
              ? "Saving…"
              : selected.length === 0
              ? "Select at least one department"
              : "Done — take me to my dashboard"}{" "}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <button
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
          >
            Skip for now
          </button>
        </div>
      </section>
    </div>
  );
};

export default OnboardingDepartment;
