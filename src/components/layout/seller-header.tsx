"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SellerHeaderProps {
  userName: string;
  teamName?: string;
}

export function SellerHeader({ userName, teamName }: SellerHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-[#112622] px-4 md:px-6">
      {/* Logo + brand */}
      <div className="flex items-center gap-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-white">
          <span className="text-xs font-bold text-[#112622]">V</span>
        </div>
        <span className="text-lg font-bold tracking-tight text-white">
          Visus
        </span>
      </div>

      {/* User area */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-white">
          <div className="flex size-7 items-center justify-center rounded-full bg-[#34594F]">
            <User className="size-3.5 text-white" />
          </div>
          <div className="hidden sm:flex sm:flex-col sm:items-start">
            <span className="font-medium text-sm">{userName}</span>
            {teamName && (
              <span className="text-xs text-[#C1D9D4]">{teamName}</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-[#C1D9D4] hover:text-white hover:bg-[#214037]"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sair"
        >
          <LogOut className="size-3.5 mr-1" />
          Sair
        </Button>
      </div>
    </header>
  );
}
