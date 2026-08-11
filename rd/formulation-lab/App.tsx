import { api } from "@flavoneer/backend/api";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { Toaster } from "sonner";
import DashboardLayout from "./components/DashboardLayout";
import { OrganizationProvider } from "./context/OrganizationContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { authClient } from "./lib/auth-client";
import Dashboard from "./pages/dashboard";
import Formulation from "./pages/formulation";
import Invite from "./pages/invite";
import LabSampleSubmission from "./pages/lab-sample-submission";
import Login from "./pages/login";
import Materials from "./pages/materials";
import ProductionLineRecordDetail from "./pages/production-line-record-detail";
import ProductionLineRecords from "./pages/production-line-records";
import ReportDetails from "./pages/report-details";
import Reports from "./pages/reports";
import Runs from "./pages/runs";
import SensoryTest from "./pages/sensory-test";
import Settings from "./pages/settings";
import ShareTarget from "./pages/share-target";
import Signup from "./pages/signup";
import SuperAdmin from "./pages/super-admin";

// Component to handle user syncing
const UserSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);

  React.useEffect(() => {
    syncCurrentUser().catch(console.error);
  }, [syncCurrentUser]);

  return <>{children}</>;
};

const AppToaster = () => {
  const { darkMode } = useSettings();
  return (
    <Toaster
      position="bottom-right"
      richColors
      theme={darkMode ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border-[#1c4a3c]/15 !bg-[#fffdf4] !text-[#173e33] !shadow-[0_18px_45px_rgba(16,47,39,0.18)] dark:!border-[#d2f2d4]/10 dark:!bg-[#173e33] dark:!text-[#f7f4df]",
          description: "!text-[#527568] dark:!text-[#a9cbbb]",
          actionButton: "!bg-[#1c4a3c] !text-white",
          cancelButton:
            "!bg-[#d2f2d4] !text-[#173e33] dark:!bg-[#285b4d] dark:!text-[#f7f4df]",
        },
      }}
    />
  );
};

const App: React.FC = () => {
  const { data: session, isPending } = authClient.useSession();
  const [authPage, setAuthPage] = useState<"login" | "signup">("login");
  const authElement =
    authPage === "login" ? (
      <Login onNavigateToSignup={() => setAuthPage("signup")} />
    ) : (
      <Signup onNavigateToLogin={() => setAuthPage("login")} />
    );
  const appElement = session ? (
    <OrganizationProvider>
      <UserSync>
        <AppToaster />
        <DashboardLayout>
          <Routes>
            <Route element={<Dashboard />} path="/" />
            <Route element={<ShareTarget />} path="/share/:token" />
            <Route element={<Formulation />} path="/project/:id" />
            <Route element={<Invite />} path="/invite/:token" />
            <Route element={<Runs />} path="/runs" />
            <Route element={<Runs />} path="/run/:id" />
            <Route element={<Navigate replace to="/" />} path="/formulations" />
            <Route element={<Materials />} path="/materials" />
            <Route element={<Reports />} path="/reports" />
            <Route element={<ReportDetails />} path="/reports/:id" />
            <Route
              element={<LabSampleSubmission />}
              path="/quality/lab-samples"
            />
            <Route
              element={<ProductionLineRecords />}
              path="/quality/production-line-records"
            />
            <Route
              element={<ProductionLineRecordDetail />}
              path="/quality/production-line-records/:id"
            />
            <Route element={<Navigate replace to="/" />} path="/schedule" />
            <Route
              element={<Navigate replace to="/settings?scope=organization" />}
              path="/organization"
            />
            <Route element={<Settings />} path="/settings" />
            <Route element={<SuperAdmin />} path="/super-admin" />
            <Route element={<Navigate replace to="/" />} path="*" />
          </Routes>
        </DashboardLayout>
      </UserSync>
    </OrganizationProvider>
  ) : (
    authElement
  );

  return (
    <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <SettingsProvider>
        {isPending ? (
          /* ─── Full-screen loading spinner ─── */
          <div className="flex min-h-screen items-center justify-center bg-[#eef8eb] dark:bg-[#0d2b24]">
            <Loader2 className="h-8 w-8 animate-spin text-[#f5a623]" />
          </div>
        ) : (
          <Routes>
            {/* Public Unauthenticated Routes */}
            <Route element={<SensoryTest />} path="/evaluate/:token" />

            {/* Authenticated Dashboard Routes */}
            <Route element={appElement} path="*" />
          </Routes>
        )}
      </SettingsProvider>
    </Router>
  );
};

export default App;
