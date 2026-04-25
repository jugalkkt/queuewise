import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHospitals } from "@/api/hospitals";
import { useAuth } from "@/lib/auth";
import { useUpsertUserPrefs } from "@/api/userPrefs";
import { toast } from "sonner";

const OnboardingHospital = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: hospitals = [], isLoading } = useHospitals(query || undefined);
  const upsertPrefs = useUpsertUserPrefs();

  const handleNext = async () => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      await upsertPrefs.mutateAsync({
        user_id: user.id,
        primary_hospital_id: selected,
      });
      navigate("/onboarding/department", { state: { hospitalId: selected } });
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
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
            <span className="text-primary">Step 1</span> of 2
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full" />
          </div>
          <h1 className="font-display font-bold text-3xl md:text-4xl">Which hospital do you visit most often?</h1>
          <p className="text-muted-foreground">We'll personalise everything for that location. You can change this anytime in settings.</p>
        </div>

        <div className="card-surface p-2 flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground ml-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hospitals across Kerala…"
            className="border-0 focus-visible:ring-0 bg-transparent h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-surface-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && hospitals.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hospitals found. Try a different search.
            </p>
          )}
          {hospitals.map((h) => {
            const active = selected === h.id;
            return (
              <button
                key={h.id}
                onClick={() => setSelected(h.id)}
                className={`w-full text-left card-surface p-4 flex items-center justify-between transition-all ${active ? "ring-2 ring-primary" : "hover:bg-surface-muted"}`}
              >
                <div>
                  <p className="font-semibold">{h.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {h.city}
                  </p>
                </div>
                {active && (
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="sticky bottom-4 pt-2">
          <Button
            size="lg"
            variant="ink"
            className="w-full"
            disabled={!selected || saving}
            onClick={handleNext}
          >
            {saving ? "Saving…" : "Next: pick a department"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default OnboardingHospital;
