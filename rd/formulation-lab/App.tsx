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
import Layout from "./components/Layout";
import { SettingsProvider } from "./context/SettingsContext";
import { TeamProvider } from "./context/TeamContext";
import { api } from "./convex/_generated/api";
import { authClient } from "./lib/auth-client";
import Dashboard from "./pages/dashboard";
import Formulation from "./pages/formulation";
import Login from "./pages/login";
import Materials from "./pages/materials";

import ReportDetails from "./pages/report-details";
import Reports from "./pages/reports";
import Runs from "./pages/runs";
import SensoryTest from "./pages/sensory-test";
import Settings from "./pages/settings";
import ShareTarget from "./pages/share-target";
import Signup from "./pages/signup";
import Team from "./pages/team";

// Component to handle user syncing
const UserSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);

  React.useEffect(() => {
    syncCurrentUser().catch(console.error);
  }, [syncCurrentUser]);

  return <>{children}</>;
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
    <TeamProvider>
      <UserSync>
        <Toaster position="bottom-right" richColors theme="system" />
        <Layout>
          <Routes>
            <Route element={<Dashboard />} path="/" />
            <Route element={<ShareTarget />} path="/share/:token" />
            <Route element={<Formulation />} path="/project/:id" />
            <Route element={<Runs />} path="/runs" />
            <Route element={<Runs />} path="/run/:id" />
            <Route element={<Navigate replace to="/" />} path="/formulations" />
            <Route element={<Materials />} path="/materials" />
            <Route element={<Reports />} path="/reports" />
            <Route element={<ReportDetails />} path="/reports/:id" />
            <Route element={<Navigate replace to="/" />} path="/schedule" />
            <Route element={<Team />} path="/team" />
            <Route element={<Settings />} path="/settings" />
            <Route element={<Navigate replace to="/" />} path="*" />
          </Routes>
        </Layout>
      </UserSync>
    </TeamProvider>
  ) : (
    authElement
  );

  return (
    <Router
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <SettingsProvider>
        {isPending ? (
          /* ─── Full-screen loading spinner ─── */
          <div className="flex min-h-screen items-center justify-center bg-[#FDFCF6] dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-slate-500" />
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
