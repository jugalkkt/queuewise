import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Activity, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveCheckins, useEndCheckin, useUpdateCheckinCondition } from "@/api/checkins";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { differenceInMinutes, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const ActiveVisit = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkinId = sessionStorage.getItem('active_checkin_id') ?? '';
  const deptId = sessionStorage.getItem('active_dept_id') ?? '';

  const { data: checkins = [] } = useActiveCheckins(deptId || undefined);
  const endCheckin = useEndCheckin();
  const updateCondition = useUpdateCheckinCondition();

  // Simulated progress (for UX — increments as time passes)
  const myCheckin = checkins.find((c) => c.id === checkinId);
  const checkinTime = myCheckin ? new Date(myCheckin.created_at) : new Date();
  const minutesWaited = differenceInMinutes(new Date(), checkinTime);

  // Remaining estimate: use 60 min as baseline if no pattern data available
  const [remaining, setRemaining] = useState(Math.max(0, 60 - minutesWaited));
  const progress = Math.min(100, (minutesWaited / Math.max(minutesWaited + remaining, 1)) * 100);

  useEffect(() => {
    const i = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 60_000);
    return () => clearInterval(i);
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!deptId) return;
    const channel = supabase
      .channel(`active-visit-${deptId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkins', filter: `department_id=eq.${deptId}` },
        () => qc.invalidateQueries({ queryKey: ['checkins', deptId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deptId, qc]);

  const finishedBefore = checkins.filter(
    (c) => c.ended_at && new Date(c.created_at) < checkinTime
  ).length;

  const recentReports = checkins
    .filter((c) => c.id !== checkinId)
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      text: `1 user reported ${c.queue_condition} wait`,
      ago: formatDistanceToNow(new Date(c.created_at), { addSuffix: true }),
    }));

  const staticUpdates = finishedBefore > 0
    ? [{ id: 'finished', text: `${finishedBefore} patient${finishedBefore > 1 ? 's' : ''} who checked in before you have now left`, ago: 'Just now' }]
    : [];

  const allUpdates = [...staticUpdates, ...recentReports];

  const handleEndVisit = async () => {
    if (!checkinId || !deptId) { navigate('/feedback'); return; }
    try {
      await endCheckin.mutateAsync({ id: checkinId, departmentId: deptId });
      navigate('/feedback');
    } catch {
      toast.error('Could not end visit. Continuing to feedback.');
      navigate('/feedback');
    }
  };

  const handleUpdateCondition = async (condition: 'short' | 'medium' | 'long') => {
    if (!checkinId) return;
    await updateCondition.mutateAsync({ id: checkinId, queue_condition: condition });
    toast.success('Queue report updated!');
  };

  return (
    <div className="container max-w-2xl py-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Active visit</p>
          <h1 className="font-display font-bold text-2xl">Visit in progress</h1>
        </div>
        <span className="pill bg-success/15 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" /> Tracking
        </span>
      </div>

      {/* Progress ring */}
      <div className="card-surface p-8 flex flex-col items-center text-center bg-gradient-hero text-primary-foreground">
        <div className="relative h-48 w-48">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(0 0% 100% / 0.2)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke="hsl(0 0% 100%)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${progress * 2.76} 999`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs opacity-80">Waited so far</p>
            <p className="font-display font-bold text-5xl">
              {minutesWaited}<span className="text-lg ml-1">min</span>
            </p>
          </div>
        </div>
        <p className="text-sm opacity-90 mt-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Tracking your position in real time
        </p>
      </div>

      <div className="card-surface p-4 flex items-center gap-3 bg-primary-soft border-primary/20">
        <Bell className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-foreground">
          We'll notify you when you're within <span className="font-semibold">15 minutes</span> of being seen.
        </p>
      </div>

      <div className="card-surface p-6">
        <p className="font-semibold flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" /> Live updates
        </p>
        {allUpdates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Waiting for live updates from other patients…
          </p>
        ) : (
          <div className="space-y-3">
            {allUpdates.map((u) => (
              <div key={u.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                <p className="text-sm">{u.text}</p>
                <span className="text-xs text-muted-foreground shrink-0">{u.ago}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-surface p-6">
        <p className="font-semibold mb-3">Update your queue report</p>
        <div className="grid grid-cols-3 gap-2">
          {(['short', 'medium', 'long'] as const).map((l) => (
            <Button key={l} variant="outline" size="sm" className="capitalize" onClick={() => handleUpdateCondition(l)}>
              {l}
            </Button>
          ))}
        </div>
      </div>

      <Button size="lg" variant="ink" className="w-full" onClick={handleEndVisit}>
        End visit <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ActiveVisit;
