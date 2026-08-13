import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Activity, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useActiveCheckins,
  useEndedCheckins,
  useEndCheckin,
  useOwnActiveCheckin,
  useUpdateCheckinCondition,
} from "@/api/checkins";
import { useQueuePatterns } from "@/api/patterns";
import { useAuth } from "@/lib/auth";
import { getCurrentWait, blendWithLiveCheckins, formatWaitTime } from "@/lib/predictions";
import { readActiveCheckin, rememberActiveCheckin, rememberWaitedMinutes } from "@/lib/activeVisit";
import { differenceInMinutes, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const ActiveVisit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fast path from local storage, authoritative path from the database. The
  // database lookup means a refresh (or a different tab) no longer loses the visit.
  const stored = readActiveCheckin();
  const { data: ownCheckin, isLoading: ownLoading } = useOwnActiveCheckin(user?.id);

  const checkinId = ownCheckin?.id ?? stored.checkinId ?? '';
  const deptId = ownCheckin?.department_id ?? stored.departmentId ?? '';

  // Keep local storage in step with whatever the server says is open.
  useEffect(() => {
    if (ownCheckin) rememberActiveCheckin(ownCheckin.id, ownCheckin.department_id);
  }, [ownCheckin]);

  const { data: checkins = [] } = useActiveCheckins(deptId || undefined);
  const { data: endedCheckins = [] } = useEndedCheckins(deptId || undefined);
  const { data: patterns = [] } = useQueuePatterns(deptId || undefined);
  const endCheckin = useEndCheckin();
  const updateCondition = useUpdateCheckinCondition();

  // The department feed refreshes on the 30s poll in useActiveCheckins.
  // Realtime postgres_changes is not used here: the anonymised-feed RLS means a
  // socket subscription would only ever deliver this user their own rows.

  // Re-render on a timer so elapsed time stays accurate. Elapsed is always
  // derived from created_at rather than seeded once into state, so it cannot
  // drift from the wall clock or reset when the component remounts.
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const now = new Date();
  const checkinTime = ownCheckin ? new Date(ownCheckin.created_at) : null;
  const minutesWaited = checkinTime ? Math.max(0, differenceInMinutes(now, checkinTime)) : 0;

  // Estimate comes from the real prediction engine (historical pattern for the
  // hour the visit started, blended with live reports) instead of a flat 60.
  const historicalWait = checkinTime && deptId ? getCurrentWait(patterns, deptId, checkinTime) : null;
  const estimatedTotal = deptId ? blendWithLiveCheckins(historicalWait, checkins, now) : null;
  const remaining = estimatedTotal !== null ? Math.max(0, estimatedTotal - minutesWaited) : null;
  const progress =
    estimatedTotal !== null && estimatedTotal > 0
      ? Math.min(100, (minutesWaited / estimatedTotal) * 100)
      : 0;

  // Patients who arrived before this visit and have since been seen.
  // This previously filtered the ACTIVE list for rows with ended_at set, which
  // is empty by construction, so the number was always zero.
  const finishedBefore = checkinTime
    ? endedCheckins.filter((c) => new Date(c.created_at) < checkinTime).length
    : 0;

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
    // Hand the measured wait to the feedback form so it opens on a real number.
    if (checkinTime) rememberWaitedMinutes(minutesWaited);
    try {
      await endCheckin.mutateAsync({ id: checkinId, departmentId: deptId });
      navigate('/feedback');
    } catch {
      toast.error('Could not end visit. Continuing to feedback.');
      navigate('/feedback');
    }
  };

  const handleUpdateCondition = async (condition: 'short' | 'medium' | 'long') => {
    if (!checkinId || !deptId) return;
    try {
      await updateCondition.mutateAsync({ id: checkinId, departmentId: deptId, queue_condition: condition });
      toast.success('Queue report updated!');
    } catch {
      toast.error('Could not update your report. Please try again.');
    }
  };

  // No visit to show — don't render a timer counting up from zero.
  if (!ownLoading && !checkinId) {
    return (
      <div className="container max-w-2xl py-16 text-center space-y-4">
        <h1 className="font-display font-bold text-2xl">No visit in progress</h1>
        <p className="text-sm text-muted-foreground">
          Check in when you arrive at the hospital and we'll track your wait.
        </p>
        <Button variant="ink" size="lg" onClick={() => navigate('/checkin')}>
          Check in now <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

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
          <TrendingUp className="h-4 w-4" />
          {remaining !== null
            ? `About ${formatWaitTime(remaining)} left, based on this department's pattern`
            : 'Tracking your wait'}
        </p>
      </div>

      <div className="card-surface p-4 flex items-center gap-3 bg-primary-soft border-primary/20">
        <Bell className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-foreground">
          Keep this page open to follow live updates from other patients in your department.
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
            <Button
              key={l}
              variant="outline"
              size="sm"
              className="capitalize"
              disabled={updateCondition.isPending}
              onClick={() => handleUpdateCondition(l)}
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        variant="ink"
        className="w-full"
        disabled={endCheckin.isPending}
        onClick={handleEndVisit}
      >
        {endCheckin.isPending ? 'Ending visit…' : 'End visit'} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ActiveVisit;
