"use client";

import { signOut } from "next-auth/react";
import { Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  userName: string;
  companyName: string;
  userRole: string;
  onMenuToggle: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Gerente",
  VIEWER: "Visualizador",
};

export function Header({
  userName,
  companyName,
  userRole,
  onMenuToggle,
}: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuToggle}
        aria-label="Abrir menu de navegacao"
      >
        <Menu className="size-5" />
      </Button>

      {/* Company name */}
      <div className="flex-1">
        <h2 className="text-sm font-semibold truncate">{companyName}</h2>
      </div>

      {/* User area */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-primary">
            <User className="size-3.5 text-primary-foreground" />
          </div>
          <span className="hidden font-medium sm:inline-block">{userName}</span>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {ROLE_LABELS[userRole] ?? userRole}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[userRole] ?? userRole}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="size-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
