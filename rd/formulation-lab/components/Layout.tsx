import type React from "react";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => (
  <div className="enterprise-page font-inter">
    <Sidebar />

    <main className="min-h-screen flex-1 p-3 pb-24 text-slate-900 md:ms-28 md:p-4 md:pb-4 dark:text-slate-100">
      <div className="mx-auto max-w-[1760px]">{children}</div>
    </main>
  </div>
);

export default Layout;
