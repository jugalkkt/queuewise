import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, ArrowRight, ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heatmap } from "@/components/Heatmap";
import { useHospitals } from "@/api/hospitals";
import { useDepartments } from "@/api/departments";
import { useQueuePatterns } from "@/api/patterns";
import { getHeatmapMatrix } from "@/lib/predictions";

const GuestResult = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const query: string = state?.query ?? 'General Hospital';

  const { data: hospitals = [] } = useHospitals(query);
  const hospital = hospitals[0] ?? null;

  const { data: departments = [] } = useDepartments(hospital?.id);
  const dept = departments.find((d) => d.name === 'General OPD') ?? departments[0] ?? null;

  const { data: patterns = [] } = useQueuePatterns(dept?.id);
  const heatmapData = dept ? getHeatmapMatrix(patterns, dept.id) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">Q</div>
          <span className="font-display font-bold text-xl">QueueWise</span>
        </Link>
        <Link to="/login" className="text-sm font-medium hover:text-primary">Login</Link>
      </header>

      <section className="container max-w-3xl py-10 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="card-surface p-6">
          <p className="text-xs text-muted-foreground">You searched</p>
          <h1 className="font-display font-bold text-2xl">
            {hospital ? `${hospital.name}, ${hospital.city}` : query}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" /> {dept?.name ?? 'General OPD'}
          </p>
          {!hospital && hospitals !== undefined && (
            <p className="text-sm text-muted-foreground mt-2">No matching hospital found. Try a different search.</p>
          )}
        </div>

        <div className="relative card-surface p-6 overflow-hidden">
          <div className="filter blur-[6px] select-none pointer-events-none">
            <p className="text-xs text-muted-foreground">Predicted wait now</p>
            <p className="font-display font-bold text-6xl text-primary mt-2">1h 25m</p>
            <p className="text-sm mt-3">Best time today: <span className="font-semibold">3:30 PM</span></p>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-background via-background/90 to-transparent">
            <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-3">
              <Lock className="h-6 w-6" />
            </div>
            <p className="font-display font-bold text-xl">Unlock your full prediction</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm text-center">
              Free forever. Takes under a minute. No password needed.
            </p>
            <Button size="lg" variant="hero" onClick={() => navigate("/login")}>
              Sign up to unlock <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="card-surface p-6">
          <p className="font-semibold mb-4">This week's busy hours</p>
          {heatmapData && patterns.length > 0 ? (
            <>
              <Heatmap blurred data={heatmapData} />
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Hour-by-hour breakdown unlocks after sign-up.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pattern data yet for this department.
            </p>
          )}
        </div>

        <div className="text-center pt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Or keep browsing the homepage
          </Link>
        </div>
      </section>
    </div>
  );
};

export default GuestResult;
