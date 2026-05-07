import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import GuestResult from "./pages/GuestResult";
import Login from "./pages/Login";
import OTP from "./pages/OTP";
import AuthCallback from "./pages/AuthCallback";
import OnboardingHospital from "./pages/OnboardingHospital";
import OnboardingDepartment from "./pages/OnboardingDepartment";
import Dashboard from "./pages/Dashboard";
import HospitalDetail from "./pages/HospitalDetail";
import DoctorAvailability from "./pages/DoctorAvailability";
import CheckIn from "./pages/CheckIn";
import ActiveVisit from "./pages/ActiveVisit";
import Feedback from "./pages/Feedback";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/guest-result" element={<GuestResult />} />
            <Route path="/login" element={<Login />} />
            <Route path="/otp" element={<OTP />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding/hospital" element={<OnboardingHospital />} />
              <Route path="/onboarding/department" element={<OnboardingDepartment />} />
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/hospital/:id" element={<HospitalDetail />} />
                <Route path="/doctor/:id" element={<DoctorAvailability />} />
                <Route path="/checkin" element={<CheckIn />} />
                <Route path="/visit" element={<ActiveVisit />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
