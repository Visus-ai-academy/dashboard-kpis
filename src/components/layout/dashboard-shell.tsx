"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

interface DashboardShellProps {
  userName: string;
  companyName: string;
  userRole: string;
  children: React.ReactNode;
}

export function DashboardShell({
  userName,
  companyName,
  userRole,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden border-r border-sidebar-border md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={userName}
          companyName={companyName}
          userRole={userRole}
          onMenuToggle={handleMenuToggle}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
