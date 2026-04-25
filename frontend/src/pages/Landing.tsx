import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Clock, MapPin, Users, Sparkles, Activity, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heatmap } from "@/components/Heatmap";
import { STATS } from "@/lib/mockData";
import heroImg from "@/assets/hero-illustration.jpg";

const Landing = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("Govt. General Hospital, Thiruvananthapuram");

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="container flex h-20 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg">Q</div>
          <span className="font-display font-bold text-xl">QueueWise</span>
        </div>
        <Link to="/login" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
          Login
        </Link>
      </header>

      {/* Hero */}
      <section className="container pt-8 pb-20">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7 space-y-8">
            <div className="pill bg-primary-soft text-primary">
              <Sparkles className="h-3 w-3" /> Trusted by {STATS.patientsToday.toLocaleString()} patients today
            </div>
            <h1 className="font-display font-bold text-5xl md:text-7xl leading-[1.05] tracking-tight">
              Skip the wait at <span className="text-primary">government</span> hospitals.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Know exactly when to visit your local Kerala government hospital. Live OPD wait times, doctor availability, and crowd-sourced reports — before you leave home.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); navigate("/guest-result", { state: { query: searchQuery } }); }}
              className="card-surface p-2 flex items-center gap-2 max-w-xl"
            >
              <div className="flex items-center pl-3 text-muted-foreground"><Search className="h-5 w-5" /></div>
              <Input
                placeholder="Which hospital are you visiting?"
                className="border-0 focus-visible:ring-0 text-base h-12 bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" size="lg" variant="ink">
                Check wait <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" variant="hero" onClick={() => navigate("/login")}>
                Get free predictions <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/guest-result", { state: { query: searchQuery } })}>
                Try without signup
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 max-w-xl">
              {[
                { icon: Clock, t: "Save hours every visit", d: "Avoid peak OPD times" },
                { icon: Activity, t: "Live queue updates", d: "From real patients" },
                { icon: Bell, t: "Doctor availability", d: "Before you travel" },
              ].map((b) => (
                <div key={b.t} className="space-y-1">
                  <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center mb-2">
                    <b.icon className="h-4 w-4" />
                  </div>
                  <p className="font-semibold text-sm">{b.t}</p>
                  <p className="text-xs text-muted-foreground">{b.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Demo card */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="card-surface p-6 space-y-5 shadow-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Live demo</p>
                  <p className="font-display font-bold text-lg">Govt. General Hospital, TVM</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> General OPD · This week</p>
                </div>
                <span className="pill bg-success/15 text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" /> Live
                </span>
              </div>

              <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-5">
                <p className="text-xs opacity-80">Predicted wait now</p>
                <p className="font-display font-bold text-4xl mt-1">1h 25m</p>
                <p className="text-xs opacity-90 mt-2">Best time to visit today: <span className="font-semibold">3:30 PM</span> · ~25 min</p>
              </div>

              <Heatmap compact />

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <span className="flex items-center gap-2"><Users className="h-3 w-3" /> 12 reports today</span>
                <span>Updated 2 min ago</span>
              </div>
            </div>

            <img src={heroImg} alt="" className="absolute -z-10 opacity-20 blur-3xl" width={1280} height={960} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
