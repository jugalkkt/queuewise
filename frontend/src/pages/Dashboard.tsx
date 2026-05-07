import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, MapPin, Clock, Sparkles, Users, RefreshCw, Plus, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heatmap } from "@/components/Heatmap";
import { useAuth } from "@/lib/auth";
import { useUserPrefs } from "@/api/userPrefs";
import { useHospital } from "@/api/hospitals";
import { useDepartment } from "@/api/departments";
import { useQueuePatterns } from "@/api/patterns";
import { useDoctors } from "@/api/doctors";
import { useActiveCheckins } from "@/api/checkins";
import { getCurrentWait, getBestTimeToVisit, getHeatmapMatrix, formatWaitTime, isWithinWorkingHours, getNextOpenInfo } from "@/lib/predictions";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { DAYS, HOURS } from "@/lib/mockData";

const HEATMAP_DAYS = [1, 2, 3, 4, 5, 6, 0];
const HEATMAP_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: prefs } = useUserPrefs(user?.id);
  const { data: hospital } = useHospital(prefs?.primary_hospital_id ?? undefined);
  const { data: dept } = useDepartment(prefs?.primary_department_id ?? undefined);
  const { data: patterns = [] } = useQueuePatterns(dept?.id);
  const { data: doctors = [] } = useDoctors(dept?.id);
  const { data: checkins = [], refetch } = useActiveCheckins(dept?.id);

  const [selectedCell, setSelectedCell] = useState<{ dayIdx: number; hourIdx: number } | null>(null);

  const now = new Date();
  const currentWait = dept ? getCurrentWait(patterns, dept.id, now) : null;
  const bestTime = dept ? getBestTimeToVisit(patterns, dept.id, now) : null;
  const withinHours = isWithinWorkingHours(now);
  const nextOpen = dept && (currentWait === null || !withinHours)
    ? getNextOpenInfo(patterns, dept.id, now)
    : null;
  const heatmapData = dept ? getHeatmapMatrix(patterns, dept.id) : undefined;

  const selectedWait = selectedCell && dept
    ? patterns.find(
        (p) =>
          p.department_id === dept.id &&
          p.day_of_week === HEATMAP_DAYS[selectedCell.dayIdx] &&
          p.hour === HEATMAP_HOURS[selectedCell.hourIdx]
      )?.avg_wait_minutes ?? null
    : null;

  // Realtime subscription for live check-in feed
  useEffect(() => {
    if (!dept?.id) return;
    const channel = supabase
      .channel(`checkins-dash-${dept.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'checkins', filter: `department_id=eq.${dept.id}` },
        () => qc.invalidateQueries({ queryKey: ['checkins', dept.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dept?.id, qc]);

  const statusColor = (s: string) =>
    s === 'on_duty' ? 'bg-success/15 text-success'
    : s === 'on_leave' ? 'bg-destructive/15 text-destructive'
    : 'bg-muted text-muted-foreground';

  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? (user?.phone ? 'there' : 'there');

  // Loading state — no prefs yet
  if (user && !prefs) {
    return (
      <div className="container py-6 space-y-6 pb-24">
        <div className="h-16 w-72 bg-surface-muted rounded-2xl animate-pulse" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-40 bg-surface-muted rounded-2xl animate-pulse" />
          <div className="h-40 bg-surface-muted rounded-2xl animate-pulse" />
        </div>
        <div className="h-64 bg-surface-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 pb-24">
      {/* Hospital switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          className="card-surface px-4 py-3 flex items-center gap-3 hover:bg-surface-muted"
          onClick={() => navigate('/settings')}
        >
          <div className="h-10 w-10 rounded-full bg-primary-soft text-primary flex items-center justify-center">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Hospital · Department</p>
            <p className="font-semibold text-sm">
              {hospital ? `${hospital.name}, ${hospital.city}` : 'Select hospital'}
              {dept ? ` · ${dept.name}` : ''}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
        </button>
        <div className="flex items-center gap-2">
          <span className="pill bg-success/15 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />Live data
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Setup prompt if onboarding incomplete */}
      {prefs && !prefs.onboarding_completed && (
        <div className="card-surface p-4 border-l-4 border-primary bg-primary-soft">
          <p className="text-sm font-medium">Complete your setup</p>
          <p className="text-xs text-muted-foreground mt-1">Select your hospital to see live wait predictions.</p>
          <Button size="sm" className="mt-3" onClick={() => navigate('/onboarding/hospital')}>
            Choose hospital
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <h1 className="font-display font-bold text-4xl md:text-5xl leading-tight">
            Welcome back, <span className="text-primary">{displayName}</span>
          </h1>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Wait now card */}
            <div className="card-surface p-6 bg-gradient-hero text-primary-foreground relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
              {currentWait !== null ? (
                <>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Wait time now
                  </p>
                  <p className="font-display font-bold text-5xl mt-2">~ {formatWaitTime(currentWait)}</p>
                  <p className="text-xs opacity-90 mt-3">
                    {checkins.length > 0
                      ? `${checkins.length} active ${checkins.length === 1 ? 'report' : 'reports'} · Updated just now`
                      : 'Based on historical patterns'}
                  </p>
                </>
              ) : nextOpen ? (
                <>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {withinHours ? 'Low activity right now' : 'OPD closed'}
                  </p>
                  <p className="font-display font-bold text-2xl mt-2">{nextOpen.label}</p>
                  {nextOpen.waitMinutes !== null && (
                    <p className="text-sm opacity-90 mt-2 font-medium">
                      Expected wait at opening: ~ {formatWaitTime(nextOpen.waitMinutes)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Wait time now
                  </p>
                  <p className="font-display font-bold text-3xl mt-2">Select dept</p>
                  <p className="text-xs opacity-70 mt-2">Choose a department to see wait times</p>
                </>
              )}
            </div>

            {/* Best time card */}
            <button
              onClick={() => navigate('/checkin')}
              className="card-surface p-6 text-left hover:bg-surface-muted transition-colors"
            >
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Best time to visit today
              </p>
              {bestTime ? (
                <>
                  <p className="font-display font-bold text-5xl mt-2">
                    {format(bestTime.date, 'h:mm')}{' '}
                    <span className="text-2xl text-muted-foreground">{format(bestTime.date, 'a').toUpperCase()}</span>
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-success font-medium">~{bestTime.waitMinutes}m wait</span>
                    <span className="pill bg-primary-soft text-primary">
                      <Calendar className="h-3 w-3" /> Set reminder
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-4">
                  {dept ? 'No future predictions available' : 'Select a department to see the best time'}
                </p>
              )}
            </button>
          </div>

          {/* Heatmap */}
          <div className="card-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold">Your daily wait forecast</p>
                <p className="text-xs text-muted-foreground">Tap any cell to see the predicted wait</p>
              </div>
              <span className="text-xs text-muted-foreground">This week</span>
            </div>
            {heatmapData ? (
              <>
                <Heatmap
                  data={heatmapData}
                  onCellClick={(dayIdx, hourIdx) => setSelectedCell({ dayIdx, hourIdx })}
                />
                {selectedCell && (
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-primary-soft px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {DAYS[selectedCell.dayIdx]} · {HOURS[selectedCell.hourIdx]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Predicted wait:{' '}
                        <span className="font-medium text-foreground">
                          {formatWaitTime(selectedWait)}
                        </span>
                      </p>
                    </div>
                    <button onClick={() => setSelectedCell(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">Not enough data yet for this department.</p>
                <p className="text-xs text-muted-foreground mt-1">Check back soon or be the first to report.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => navigate('/checkin')}>
                  Report queue now
                </Button>
              </div>
            )}
          </div>

          {/* Live patient feed */}
          <div className="card-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Live patient reports
              </p>
              <span className="text-xs text-muted-foreground">Anonymous</span>
            </div>
            {checkins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No reports yet today. Be the first to check in!
              </p>
            ) : (
              <div className="space-y-3">
                {checkins.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        c.queue_condition === 'short' ? 'bg-success'
                        : c.queue_condition === 'medium' ? 'bg-warning'
                        : 'bg-destructive'
                      }`} />
                      <p className="text-sm">1 user reported {c.queue_condition} wait</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="card-surface p-6">
            <p className="font-semibold mb-1">Doctors on duty</p>
            <p className="text-xs text-muted-foreground mb-4">
              {dept?.name ?? 'Select a department'}
            </p>
            {doctors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No doctor data available</p>
            ) : (
              <div className="space-y-3">
                {doctors.slice(0, 4).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/doctor/${d.id}`)}
                    className="w-full flex items-center justify-between py-2 hover:bg-surface-muted rounded-lg px-2 -mx-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold text-xs">
                        {d.name.split(' ').slice(1, 3).map((s) => s[0]).join('')}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{d.name}</p>
                      </div>
                    </div>
                    <span className={`pill ${statusColor(d.status)} capitalize`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {hospital && (
              <Button
                variant="soft"
                className="w-full mt-4"
                onClick={() => navigate(`/hospital/${hospital.id}`)}
              >
                See full hospital
              </Button>
            )}
          </div>

          <div className="card-surface p-6 bg-ink text-ink-foreground">
            <p className="text-xs opacity-70">Already at the hospital?</p>
            <p className="font-display font-bold text-2xl mt-1">Check in & help others</p>
            <p className="text-xs opacity-80 mt-2">
              Your anonymous report improves predictions for thousands of patients today.
            </p>
            <Button variant="hero" className="w-full mt-4" onClick={() => navigate('/checkin')}>
              Check in now <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/checkin')}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center hover:scale-105 transition-transform md:hidden"
        aria-label="Check in"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
};

export default Dashboard;
