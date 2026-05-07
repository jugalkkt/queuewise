import { useNavigate } from "react-router-dom";
import { Trash2, Star, Bell, History, Info, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useUserPrefs, useUpsertUserPrefs } from "@/api/userPrefs";
import { useHospital } from "@/api/hospitals";
import { supabase } from "@/lib/supabase";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: prefs } = useUserPrefs(user?.id);
  const { data: primaryHospital } = useHospital(prefs?.primary_hospital_id ?? undefined);
  const upsertPrefs = useUpsertUserPrefs();

  const displayName = user?.user_metadata?.full_name ?? 'User';
  const initial = displayName[0]?.toUpperCase() ?? 'U';
  const loginMethod =
    user?.app_metadata?.provider === 'google'
      ? `Google · ${user.email ?? ''}`
      : `Phone · ${user?.phone ?? ''}`;

  const handleToggle = async (key: keyof typeof prefs) => {
    if (!user || !prefs) return;
    await upsertPrefs.mutateAsync({ user_id: user.id, [key]: !prefs[key as keyof typeof prefs] });
  };

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const handleFeedbackSubmit = () => {
    const subject = encodeURIComponent('QueueWise Feedback');
    const body = encodeURIComponent(feedbackText);
    window.open(`mailto:jugalkakkat@gmail.com?subject=${subject}&body=${body}`);
    setFeedbackText('');
    setFeedbackOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const notifs = prefs
    ? [
        { key: 'notif_morning_digest',    label: 'Morning daily digest',          desc: "Tomorrow's best visit windows at 7am", on: prefs.notif_morning_digest },
        { key: 'notif_best_time',         label: 'Best-time alerts',              desc: 'When the queue is unusually short',    on: prefs.notif_best_time },
        { key: 'notif_live_queue',        label: 'Live queue change alerts',      desc: 'Sudden shifts at saved hospitals',      on: prefs.notif_live_queue },
        { key: 'notif_feedback_reminder', label: 'Post-visit feedback reminders', desc: 'Gentle nudge after a check-in',         on: prefs.notif_feedback_reminder },
      ]
    : [];

  return (
    <div className="container max-w-3xl py-6 space-y-6 pb-16">
      {/* User card */}
      <div className="card-surface p-6 flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xl">
          {initial}
        </div>
        <div className="flex-1">
          <h1 className="font-display font-bold text-2xl">{displayName}</h1>
          <p className="text-sm text-muted-foreground">Signed in via {loginMethod}</p>
        </div>
      </div>

      {/* Saved hospitals */}
      <section className="card-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Saved hospitals</p>
          <Button size="sm" variant="soft" onClick={() => navigate('/onboarding/hospital')}>
            Change
          </Button>
        </div>
        {primaryHospital ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                {primaryHospital.name}, {primaryHospital.city}
                <span className="pill bg-primary text-primary-foreground h-5">
                  <Star className="h-2.5 w-2.5" />Default
                </span>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hospital selected.{' '}
            <button className="text-primary underline" onClick={() => navigate('/onboarding/hospital')}>
              Add one
            </button>
          </p>
        )}
      </section>

      {/* Notifications */}
      <section className="card-surface p-6 space-y-4">
        <p className="font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Notification preferences
        </p>
        <div className="space-y-2">
          {notifs.map((n) => (
            <div key={n.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-muted">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch
                checked={n.on}
                onCheckedChange={() => handleToggle(n.key as keyof typeof prefs)}
              />
            </div>
          ))}
          {notifs.length === 0 && (
            <p className="text-sm text-muted-foreground">Loading preferences…</p>
          )}
        </div>
      </section>

      {/* Visit history (from sessionStorage checkins — real history would need a separate query) */}
      <section className="card-surface p-6 space-y-4">
        <p className="font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Visit history
        </p>
        <p className="text-sm text-muted-foreground">
          Your past check-ins are stored and help improve predictions. Full history view coming soon.
        </p>
      </section>

      {/* About */}
      <section className="card-surface p-6 space-y-3">
        <p className="font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" /> About
        </p>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>QueueWise · v0.1.0</p>
          <a className="text-primary hover:underline block" href="#">Privacy policy</a>
          <button
            className="text-primary hover:underline block text-left"
            onClick={() => setFeedbackOpen(true)}
          >
            Submit feedback
          </button>
        </div>
      </section>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit feedback</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="What's on your mind? Bug reports, suggestions, anything…"
            className="min-h-32 resize-none"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button onClick={handleFeedbackSubmit} disabled={!feedbackText.trim()}>
              Send feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Log out
        </Button>
        <Button variant="ghost" size="lg" className="text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <Trash2 className="h-4 w-4" /> Delete account
        </Button>
      </div>
    </div>
  );
};

export default Settings;
