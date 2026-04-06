"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface SellerParticipant {
  id: string;
  name: string;
  email: string | null;
  teamName: string | null;
  isParticipant: boolean;
}

export function ParticipantsTab({ campaignId }: { campaignId: string }) {
  const [sellers, setSellers] = useState<SellerParticipant[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/participants`);
      const json = await res.json();
      if (json.success) {
        setSellers(json.data);
        const initialSelected = new Set<string>(
          json.data
            .filter((s: SellerParticipant) => s.isParticipant)
            .map((s: SellerParticipant) => s.id)
        );
        setSelected(initialSelected);
        setHasChanges(false);
      }
    } catch {
      toast.error("Erro ao carregar participantes");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function toggleSeller(sellerId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sellerId)) {
        next.delete(sellerId);
      } else {
        next.add(sellerId);
      }
      return next;
    });
    setHasChanges(true);
  }

  function toggleAll() {
    if (selected.size === sellers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sellers.map((s) => s.id)));
    }
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/participants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Participantes atualizados");
        setHasChanges(false);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar participantes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Participantes</h3>
          <p className="text-sm text-muted-foreground">
            {selected.size} de {sellers.length} vendedor{sellers.length !== 1 ? "es" : ""} selecionado{selected.size !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
          <Save className="size-4" data-icon="inline-start" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  checked={sellers.length > 0 && selected.size === sellers.length}
                  onChange={toggleAll}
                  className="size-4 rounded border-input accent-primary"
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Equipe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : sellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum vendedor ativo encontrado
                </TableCell>
              </TableRow>
            ) : (
              sellers.map((seller) => (
                <TableRow
                  key={seller.id}
                  className="cursor-pointer"
                  onClick={() => toggleSeller(seller.id)}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(seller.id)}
                      onChange={() => toggleSeller(seller.id)}
                      className="size-4 rounded border-input accent-primary"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{seller.name}</TableCell>
                  <TableCell>{seller.email ?? "—"}</TableCell>
                  <TableCell>{seller.teamName ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
