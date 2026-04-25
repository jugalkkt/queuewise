import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useUserPrefs } from "@/api/userPrefs";

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: prefs } = useUserPrefs(user?.id);

  const isAuthFlow = ["/login", "/otp", "/onboarding/hospital", "/onboarding/department"].includes(location.pathname);

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    {
      to: prefs?.primary_hospital_id ? `/hospital/${prefs.primary_hospital_id}` : "/dashboard",
      label: "Hospital",
    },
    { to: "/checkin", label: "Check-in" },
    { to: "/settings", label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold">Q</div>
            <span className="font-display font-bold text-lg tracking-tight">QueueWise</span>
          </Link>
          {!isAuthFlow && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((n) => (
                <NavLink
                  key={n.label}
                  to={n.to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="rounded-full bg-surface-muted h-10 w-10">
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full bg-surface-muted h-10 w-10"
              onClick={() => navigate("/settings")}
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="animate-fade-up">
        <Outlet />
      </main>
    </div>
  );
};
