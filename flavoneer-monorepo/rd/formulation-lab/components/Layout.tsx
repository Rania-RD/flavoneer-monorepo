import type React from "react";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => (
    <div className="min-h-screen bg-baby-pink font-inter text-charcoal transition-colors duration-300 dark:bg-[#0f172a] dark:text-slate-100">
      <Sidebar />

      {/* Main Content Wrapper */}
      {/* 
          md:ms-32: Adds margin-start (7rem) to clear the sidebar (w-20 + start-6). 
          Mirroring handles RTL automatically.
          pb-28: Adds bottom padding for mobile nav.
          md:pb-6: Reduces padding on desktop.
      */}
      <main className="min-h-screen flex-1 p-4 pb-28 text-gray-900 transition-all duration-300 md:ms-32 md:p-6 md:pb-6 dark:text-slate-100">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
);

export default Layout;
