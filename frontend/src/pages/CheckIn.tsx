import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ChevronDown, ArrowRight, UserCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useUserPrefs } from "@/api/userPrefs";
import { useHospital } from "@/api/hospitals";
import { useDepartment } from "@/api/departments";
import { useQueuePatterns } from "@/api/patterns";
import { useDoctors } from "@/api/doctors";
import { useCreateCheckin } from "@/api/checkins";
import { getCurrentWait, formatWaitTime, isWithinWorkingHours, getNextOpenInfo } from "@/lib/predictions";
import { toast } from "sonner";

const queueOptions = [
  { id: 'short',  label: 'Short',  desc: 'Under 30 min',    color: 'border-success bg-success/10 text-success' },
  { id: 'medium', label: 'Medium', desc: '30 min – 1.5 hr', color: 'border-warning bg-warning/10 text-warning' },
  { id: 'long',   label: 'Long',   desc: 'Over 1.5 hr',     color: 'border-destructive bg-destructive/10 text-destructive' },
] as const;

const statusColor = (s: string) =>
  s === 'on_duty' ? 'text-success' : s === 'on_leave' ? 'text-destructive' : 'text-muted-foreground';

const CheckIn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState<'short' | 'medium' | 'long' | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: prefs } = useUserPrefs(user?.id);
  const { data: hospital } = useHospital(prefs?.primary_hospital_id ?? undefined);
  const { data: dept } = useDepartment(prefs?.primary_department_id ?? undefined);
  const { data: patterns = [] } = useQueuePatterns(dept?.id);
  const { data: doctors = [] } = useDoctors(dept?.id);
  const createCheckin = useCreateCheckin();

  const now = new Date();
  const estimatedWait = dept ? getCurrentWait(patterns, dept.id, now) : null;
  const withinHours = isWithinWorkingHours(now);
  const nextOpen = (!withinHours || estimatedWait === null) && dept
    ? getNextOpenInfo(patterns, dept.id, now)
    : null;

  const handleSubmit = async () => {
    if (!selected || !user || !dept) return;
    setSubmitting(true);
    try {
      const checkin = await createCheckin.mutateAsync({
        department_id: dept.id,
        queue_condition: selected,
        user_id: user.id,
        doctor_id: selectedDoctorId ?? undefined,
      });
      sessionStorage.setItem('active_checkin_id', checkin.id);
      sessionStorage.setItem('active_dept_id', dept.id);
      navigate('/visit');
    } catch {
      toast.error('Check-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <h1 className="font-display font-bold text-3xl md:text-4xl">Check in to your visit</h1>

      <button className="w-full card-surface p-4 flex items-center justify-between hover:bg-surface-muted">
        <div className="flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded-full bg-primary-soft text-primary flex items-center justify-center">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {hospital ? `${hospital.name}, ${hospital.city}` : 'Loading…'}
            </p>
            <p className="text-xs text-muted-foreground">
              {dept?.name ?? 'Select department'} · Change
            </p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {estimatedWait !== null ? (
        <div className="card-surface p-6 bg-gradient-hero text-primary-foreground">
          <p className="text-xs opacity-80">Your estimated wait from now</p>
          <p className="font-display font-bold text-5xl mt-2">~ {formatWaitTime(estimatedWait)}</p>
          <p className="text-xs opacity-80 mt-2">Based on historical patterns for this department</p>
        </div>
      ) : nextOpen ? (
        <div className="card-surface p-6 bg-gradient-hero text-primary-foreground">
          <p className="text-xs opacity-80 flex items-center gap-1">
            {withinHours ? 'Low activity right now' : 'OPD is currently closed'}
          </p>
          <p className="font-display font-bold text-3xl mt-2">{nextOpen.label}</p>
          {nextOpen.waitMinutes !== null && (
            <p className="text-sm opacity-90 mt-2 font-medium">
              Expected wait at opening: ~ {formatWaitTime(nextOpen.waitMinutes)}
            </p>
          )}
          <p className="text-xs opacity-70 mt-1">{nextOpen.sublabel}</p>
        </div>
      ) : (
        <div className="card-surface p-6 bg-gradient-hero text-primary-foreground">
          <p className="text-xs opacity-80">Your estimated wait from now</p>
          <p className="font-display font-bold text-3xl mt-2">Select a department</p>
          <p className="text-xs opacity-70 mt-2">Choose your department above to see wait times</p>
        </div>
      )}

      <div className="card-surface p-6">
        <p className="font-semibold mb-1">How does the queue feel right now?</p>
        <p className="text-xs text-muted-foreground mb-4">
          Your anonymous report helps every patient planning their visit today.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {queueOptions.map((o) => {
            const active = selected === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setSelected(o.id)}
                className={`rounded-2xl border-2 p-4 text-center transition-all ${
                  active
                    ? `${o.color} ring-2 ring-offset-2 ring-current`
                    : 'border-border bg-surface hover:bg-surface-muted text-foreground'
                }`}
              >
                <p className="font-display font-bold text-lg">{o.label}</p>
                <p className="text-[11px] opacity-80 mt-1">{o.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-surface p-6">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" /> Doctor you're waiting for
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </p>
        {doctors.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">No doctors listed for this department.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {doctors.map((d) => {
              const active = selectedDoctorId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDoctorId(active ? null : d.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    active
                      ? 'border-primary bg-primary-soft'
                      : 'border-border bg-surface hover:bg-surface-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                      {d.name.split(' ').slice(1, 3).map((s) => s[0]).join('')}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className={`text-xs capitalize ${statusColor(d.status)}`}>
                        {d.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  {active && (
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Button
        size="lg"
        variant="ink"
        className="w-full"
        disabled={!selected || submitting || !dept}
        onClick={handleSubmit}
      >
        {submitting ? 'Checking in…' : 'Confirm check-in'} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default CheckIn;
