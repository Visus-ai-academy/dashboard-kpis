"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, LogOut, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface Unit {
  id: string;
  name: string;
}

interface HeaderProps {
  userName: string;
  companyName: string;
  userRole: string;
  onMenuToggle: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Gestor",
  MANAGER: "Gerente",
  VIEWER: "Visualizador",
  SELLER: "Usuário",
};

const UNIT_STORAGE_KEY = "visus-selected-unit";

export function Header({
  userName,
  companyName,
  userRole,
  onMenuToggle,
}: HeaderProps) {
  const pathname = usePathname();
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  // Load saved unit from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(UNIT_STORAGE_KEY);
    if (saved) setSelectedUnitId(saved);
  }, []);

  // Fetch units
  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch("/api/units");
      const json = await res.json();
      if (json.success) setUnits(json.data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnits();
    const handler = () => fetchUnits();
    window.addEventListener("units-updated", handler);
    return () => window.removeEventListener("units-updated", handler);
  }, [fetchUnits, pathname]);

  function handleUnitChange(value: string) {
    const newValue = value === "__all__" ? "" : value;
    setSelectedUnitId(newValue);
    if (newValue) {
      localStorage.setItem(UNIT_STORAGE_KEY, newValue);
    } else {
      localStorage.removeItem(UNIT_STORAGE_KEY);
    }
    // Dispatch event so all components on the page re-fetch
    window.dispatchEvent(new CustomEvent("unit-changed", { detail: newValue }));
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuToggle}
        aria-label="Abrir menu de navegação"
      >
        <Menu className="size-5" />
      </Button>

      {/* Company name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h2 className="text-sm font-semibold truncate">{companyName}</h2>

        {/* Unit selector (hidden on units config page) */}
        {units.length > 0 && pathname !== "/config/units" && (
          <div className="hidden sm:flex items-center gap-2">
            <Building2 className="size-3.5 text-muted-foreground shrink-0" />
            <Select
              value={selectedUnitId || "__all__"}
              onValueChange={(v) => v && handleUnitChange(v)}
            >
              <SelectTrigger className="h-7 w-[180px] text-xs">
                <span className="flex flex-1 text-left truncate">
                  {selectedUnitId
                    ? units.find((u) => u.id === selectedUnitId)?.name ?? "Todas as unidades"
                    : "Todas as unidades"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as unidades</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* User area */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary">
            <User className="size-3.5 text-primary-foreground" />
          </div>
          <span className="hidden font-medium sm:inline-block">{userName}</span>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {ROLE_LABELS[userRole] ?? userRole}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
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
