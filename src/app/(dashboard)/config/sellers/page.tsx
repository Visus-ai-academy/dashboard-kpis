"use client";

import { useState, useEffect, useCallback } from "react";
import { useUnitFilter } from "@/lib/hooks/use-unit-filter";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface Team {
  id: string;
  name: string;
  sector: { name: string };
}

interface Seller {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  accessCode: string;
  accessToken: string;
  isActive: boolean;
  teamId: string | null;
  team: Team | null;
}

export default function SellersPage() {
  const unitIdFilter = useUnitFilter();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [deleting, setDeleting] = useState<Seller | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [teamId, setTeamId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const unitParam = unitIdFilter ? `?unitId=${unitIdFilter}` : "";
      const [sellersRes, teamsRes] = await Promise.all([
        fetch(`/api/sellers${unitParam}`),
        fetch(`/api/teams${unitParam}`),
      ]);
      const [sellersJson, teamsJson] = await Promise.all([
        sellersRes.json(),
        teamsRes.json(),
      ]);
      if (sellersJson.success) setSellers(sellersJson.data);
      if (teamsJson.success) setTeams(teamsJson.data);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [unitIdFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setShowPassword(false);
    setTeamId("");
    setModalOpen(true);
  }

  function openEdit(seller: Seller) {
    setEditing(seller);
    setName(seller.name);
    setEmail(seller.email ?? "");
    setPhone(seller.phone ?? "");
    setPassword("");
    setShowPassword(false);
    setTeamId(seller.teamId ?? "");
    setModalOpen(true);
  }

  function openDelete(seller: Seller) {
    setDeleting(seller);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/sellers/${editing.id}` : "/api/sellers";
      const method = editing ? "PUT" : "POST";
      const payload: Record<string, unknown> = { name: name.trim() };
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (password.trim()) payload.password = password.trim();
      if (teamId) payload.teamId = teamId;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editing ? "Vendedor atualizado" : "Vendedor criado");
        setModalOpen(false);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar vendedor");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sellers/${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Vendedor excluído");
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao excluir vendedor");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(seller: Seller) {
    try {
      const res = await fetch(`/api/sellers/${seller.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !seller.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Vendedor ${seller.isActive ? "desativado" : "ativado"}`);
        fetchData();
      }
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  async function copyLaunchLink(seller: Seller) {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/launch/${seller.accessToken}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado para a area de transferencia");
    } catch {
      toast.error("Erro ao copiar link");
    }
  }

  async function regenerateCode(seller: Seller) {
    try {
      const res = await fetch(`/api/sellers/${seller.id}/regenerate`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Codigo de acesso regenerado");
        fetchData();
      } else {
        toast.error(json.error?.message ?? "Erro ao regenerar codigo");
      }
    } catch {
      toast.error("Erro ao regenerar codigo");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários e seus acessos
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" data-icon="inline-start" />
          Novo Vendedor
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Código de Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : sellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum vendedor cadastrado
                </TableCell>
              </TableRow>
            ) : (
              sellers.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell className="font-medium">{seller.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {seller.email ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {seller.phone ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {seller.accessCode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleStatus(seller)} className="cursor-pointer">
                      <Badge variant={seller.isActive ? "default" : "secondary"}>
                        {seller.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => window.open(`/launch/${seller.accessToken}`, "_blank")} title="Abrir lançamento">
                        <ExternalLink className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => copyLaunchLink(seller)} title="Copiar link">
                        <Copy className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => regenerateCode(seller)} title="Regenerar código">
                        <RefreshCw className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(seller)} title="Editar">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => openDelete(seller)} title="Excluir">
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Vendedor" : "Novo Vendedor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seller-name">Nome *</Label>
              <Input
                id="seller-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do vendedor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-email">Email</Label>
              <Input
                id="seller-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-phone">Telefone</Label>
              <Input
                id="seller-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9() \-+]/g, "");
                  setPhone(v);
                }}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-password">
                {editing ? "Nova Senha (deixe vazio para manter)" : "Senha *"}
              </Label>
              <div className="relative">
                <Input
                  id="seller-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? "••••••••" : "Senha do usuário"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select value={teamId} onValueChange={(v) => v && setTeamId(v)}>
                <SelectTrigger className="w-full">
                  <span className="flex flex-1 text-left truncate">
                    {teamId ? (teams.find((t) => t.id === teamId)?.name ?? "Selecione uma equipe (opcional)") : "Selecione uma equipe (opcional)"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Vendedor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o vendedor{" "}
            <strong>{deleting?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
