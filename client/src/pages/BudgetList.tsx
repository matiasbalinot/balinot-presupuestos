import AppLayout from "@/components/AppLayout";
import { MarginBadge } from "@/components/MarginBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Check,
  Copy,
  Edit,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

function formatCurrency(val: number | string | null | undefined): string {
  const n = parseFloat(String(val ?? 0));
  if (isNaN(n)) return "0 €";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

export default function BudgetList() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const { data: budgets = [], isLoading, refetch } = trpc.budgets.list.useQuery();
  const duplicateMutation = trpc.budgets.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Presupuesto duplicado");
      refetch();
      navigate(`/presupuestos/${data.id}`);
    },
    onError: () => toast.error("Error al duplicar el presupuesto"),
  });
  const updateStatusMutation = trpc.budgets.updateStatus.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); refetch(); },
    onError: () => toast.error("Error al actualizar el estado"),
  });
  const deleteMutation = trpc.budgets.delete.useMutation({
    onSuccess: () => {
      toast.success("Presupuesto eliminado");
      setDeleteTarget(null);
      refetch();
    },
    onError: () => toast.error("Error al eliminar el presupuesto"),
  });

  const filtered = useMemo(() => {
    return budgets.filter((b: any) => {
      const matchSearch = search === "" ||
        b.projectName.toLowerCase().includes(search.toLowerCase()) ||
        b.clientName.toLowerCase().includes(search.toLowerCase()) ||
        b.budgetNumber.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [budgets, search, statusFilter]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Presupuestos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{budgets.length} presupuestos en total</p>
          </div>
          <Link href="/presupuestos/nuevo">
            <Button className="gap-2" style={{ background: "var(--brand-darkest)", color: "white" }}>
              <Plus className="w-4 h-4" />
              Nuevo presupuesto
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por proyecto, cliente o número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="accepted">Aceptado</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                {search || statusFilter !== "all" ? "No hay resultados" : "Aún no hay presupuestos"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search || statusFilter !== "all" ? "Prueba con otros filtros" : "Crea tu primer presupuesto"}
              </p>
              {!search && statusFilter === "all" && (
                <Link href="/presupuestos/nuevo">
                  <Button variant="outline" size="sm" className="mt-4 gap-1">
                    <Plus className="w-3 h-3" />
                    Nuevo presupuesto
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_150px_110px_85px_85px_95px_90px_110px] gap-3 px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proyecto</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Subtotal</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">IVA</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Total</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">Margen</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Acciones</span>
            </div>

            {filtered.map((budget: any, idx: number) => {
              const subtotal = parseFloat(String(budget.totalSale ?? 0));
              const taxRate = parseFloat(String(budget.taxRate ?? 21));
              const ivaAmount = subtotal * (taxRate / 100);
              const total = subtotal + ivaAmount;
              return (
              <div
                key={budget.id}
                className={`grid grid-cols-[1fr_150px_110px_85px_85px_95px_90px_110px] gap-3 px-4 py-3.5 items-center hover:bg-muted/20 transition-colors ${
                  idx < filtered.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                {/* Project */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/presupuestos/${budget.id}`} className="text-sm font-medium text-foreground hover:underline truncate">{budget.projectName}</Link>
                    <StatusBadge status={budget.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{budget.budgetNumber}</p>
                </div>

                {/* Client */}
                <span className="text-sm text-foreground truncate">{budget.clientName}</span>

                {/* Date */}
                <span className="text-sm text-muted-foreground">{formatDate(budget.createdAt)}</span>

                {/* Subtotal */}
                <span className="text-sm text-muted-foreground text-right tabular-nums">{formatCurrency(subtotal)}</span>

                {/* IVA */}
                <span className="text-sm text-muted-foreground text-right tabular-nums">{formatCurrency(ivaAmount)}</span>

                {/* Total */}
                <span className="text-sm font-semibold text-foreground text-right tabular-nums">{formatCurrency(total)}</span>

                {/* Margin */}
                <div className="flex justify-center">
                  {parseFloat(budget.netMarginPct) > 0 ? (
                    <MarginBadge pct={parseFloat(budget.netMarginPct)} showLabel={true} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <Link href={`/presupuestos/${budget.id}`}>
                    <button className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors" title="Ver / Editar">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => duplicateMutation.mutate({ id: budget.id })}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      {budget.status === "draft" && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: budget.id, status: "sent" })}
                        >
                          <Send className="w-3.5 h-3.5 mr-2" />
                          Marcar como enviado
                        </DropdownMenuItem>
                      )}
                      {(budget.status === "sent" || budget.status === "draft") && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: budget.id, status: "accepted" })}
                        >
                          <Check className="w-3.5 h-3.5 mr-2 text-green-600" />
                          Marcar como aceptado
                        </DropdownMenuItem>
                      )}
                      {(budget.status === "sent" || budget.status === "draft") && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ id: budget.id, status: "rejected" })}
                        >
                          <X className="w-3.5 h-3.5 mr-2 text-red-500" />
                          Marcar como rechazado
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget({ id: budget.id, name: budget.projectName })}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar presupuesto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar el presupuesto <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
