import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDoctor, useReportDoctorStatus } from "@/api/doctors";
import { useDepartment } from "@/api/departments";
import { useHospital } from "@/api/hospitals";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import doctorPortrait from "@/assets/doctor-portrait.jpg";

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DoctorAvailability = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reporting, setReporting] = useState(false);

  const { data: doctor } = useDoctor(id);
  const { data: dept } = useDepartment(doctor?.department_id);
  const { data: hospital } = useHospital(doctor?.hospital_id);
  const reportStatus = useReportDoctorStatus();

  if (!doctor) {
    return (
      <div className="container max-w-3xl py-6 space-y-4">
        <div className="h-32 bg-surface-muted rounded-2xl animate-pulse" />
        <div className="h-48 bg-surface-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  const statusConfig = {
    on_duty:  { label: 'On Duty Today',      color: 'bg-success text-success-foreground' },
    on_leave: { label: 'On Leave',            color: 'bg-destructive text-destructive-foreground' },
    unknown:  { label: 'Status Not Updated',  color: 'bg-muted text-muted-foreground' },
  }[doctor.status];

  const schedule = doctor.typical_days ?? [];
  const updatedAgo = formatDistanceToNow(new Date(doctor.status_updated_at), { addSuffix: true });

  const handleReport = async () => {
    setReporting(true);
    const newStatus = doctor.status === 'on_duty' ? 'on_leave' : 'on_duty';
    try {
      await reportStatus.mutateAsync({ id: doctor.id, status: newStatus });
      toast.success('Status updated. Thank you for reporting!');
    } catch {
      toast.error('Failed to update status. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="card-surface p-6">
        <div className="flex flex-wrap items-start gap-5">
          <img
            src={doctorPortrait}
            alt={doctor.name}
            width={96}
            height={96}
            loading="lazy"
            className="h-24 w-24 rounded-2xl object-cover bg-primary-soft"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-3xl">{doctor.name}</h1>
            <p className="text-muted-foreground mt-1">
              {dept?.name ?? '…'} · {hospital?.name ?? '…'}, {hospital?.city ?? ''}
            </p>
            <span className={`pill mt-3 ${statusConfig.color} h-8 px-4`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      <div className="card-surface p-6">
        <p className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Typical weekly schedule
        </p>
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((d, i) => {
            const present = schedule.includes(i);
            return (
              <div
                key={d}
                className={`text-center rounded-xl py-3 ${present ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
              >
                <p className="text-[10px] uppercase tracking-wide opacity-80">{d}</p>
                <p className="text-xs font-semibold mt-1">{present ? 'Present' : 'Off'}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Last updated {updatedAgo}</p>
      </div>

      <div className="card-surface p-6">
        <p className="font-semibold flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-primary" /> How we know
        </p>
        <p className="text-sm text-muted-foreground">
          This status is sourced from the hospital's published schedule and recent verified reports from patients on-site. We mark it "Status Not Updated" when no fresh data has arrived in the last 6 hours.
        </p>
      </div>

      <Button
        variant="outline"
        className="w-full"
        size="lg"
        onClick={handleReport}
        disabled={reporting}
      >
        <AlertTriangle className="h-4 w-4" />
        {reporting ? 'Updating…' : 'Report incorrect status'}
      </Button>
    </div>
  );
};

export default DoctorAvailability;
