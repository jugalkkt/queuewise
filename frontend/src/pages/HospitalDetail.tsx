import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heatmap } from "@/components/Heatmap";
import { useState, useEffect } from "react";
import { useHospital } from "@/api/hospitals";
import { useDepartments } from "@/api/departments";
import { useQueuePatterns } from "@/api/patterns";
import { useDoctorsByHospital } from "@/api/doctors";
import { useActiveCheckins } from "@/api/checkins";
import { getHeatmapMatrix } from "@/lib/predictions";
import { formatDistanceToNow } from "date-fns";

const HospitalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: hospital } = useHospital(id);
  const { data: departments = [] } = useDepartments(id);
  const [activeDeptId, setActiveDeptId] = useState<string | undefined>();

  useEffect(() => {
    if (departments.length && !activeDeptId) setActiveDeptId(departments[0].id);
  }, [departments, activeDeptId]);

  const { data: patterns = [] } = useQueuePatterns(activeDeptId);
  const { data: doctors = [] } = useDoctorsByHospital(id);
  const { data: checkins = [] } = useActiveCheckins(activeDeptId);

  const heatmapData = activeDeptId ? getHeatmapMatrix(patterns, activeDeptId) : undefined;
  const activeDept = departments.find((d) => d.id === activeDeptId);
  const deptDoctors = doctors.filter((d) => d.department_id === activeDeptId);

  // Historical averages from patterns (avg per day across all hours)
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dailyAvgs = activeDeptId
    ? [1, 2, 3, 4, 5, 6, 0].map((day) => {
        const dayPats = patterns.filter((p) => p.department_id === activeDeptId && p.day_of_week === day);
        const avg = dayPats.length
          ? Math.round(dayPats.reduce((s, p) => s + p.avg_wait_minutes, 0) / dayPats.length)
          : 0;
        return { day: DAY_NAMES[day], avg };
      })
    : [];

  const maxAvg = Math.max(...dailyAvgs.map((d) => d.avg), 1);

  const statusColor = (s: string) =>
    s === 'on_duty' ? 'bg-success/15 text-success'
    : s === 'on_leave' ? 'bg-destructive/15 text-destructive'
    : 'bg-muted text-muted-foreground';

  return (
    <div className="container py-6 space-y-6 pb-16">
      <div className="card-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl md:text-4xl">
              {hospital ? `${hospital.name}, ${hospital.city}` : '…'}
            </h1>
            {hospital?.address && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {hospital.address}
              </p>
            )}
            {hospital?.phone && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {hospital.phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDeptId(d.id)}
              className={`pill h-9 px-4 ${
                activeDeptId === d.id
                  ? 'bg-ink text-ink-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-surface p-6">
            <p className="font-semibold mb-1">
              Full week heatmap · {activeDept?.name ?? ''}
            </p>
            <p className="text-xs text-muted-foreground mb-4">Tap any hour for a precise prediction</p>
            {heatmapData ? (
              <Heatmap data={heatmapData} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Not enough data yet for this department.
              </p>
            )}
          </div>

          {dailyAvgs.length > 0 && (
            <div className="card-surface p-6">
              <p className="font-semibold mb-4">Historical average wait by day</p>
              <div className="space-y-3">
                {dailyAvgs.map(({ day, avg }) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-muted-foreground">{day}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(avg / maxAvg) * 100}%` }}
                      />
                    </div>
                    <span className="w-14 text-sm font-medium text-right">{avg}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-surface p-6">
            <p className="font-semibold flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" /> Live reports for {activeDept?.name ?? ''}
            </p>
            {checkins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No live reports yet. Be the first!
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
            <Button variant="soft" className="w-full mt-4" onClick={() => navigate('/checkin')}>
              Add a report
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-surface p-6">
            <p className="font-semibold mb-4">All doctors · {activeDept?.name ?? ''}</p>
            {deptDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No doctor data available</p>
            ) : (
              <div className="space-y-3">
                {deptDoctors.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/doctor/${d.id}`)}
                    className="w-full flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-surface-muted"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalDetail;
