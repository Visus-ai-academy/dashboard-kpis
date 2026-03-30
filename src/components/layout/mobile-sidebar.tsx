"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Menu de navegacao</SheetTitle>
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
