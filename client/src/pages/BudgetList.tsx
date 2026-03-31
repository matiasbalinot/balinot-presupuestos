import AppLayout from "@/components/AppLayout";
import { MarginBadge } from "@/components/MarginBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Copy,
  Edit,
  FileText,
  Plus,
  Search,
  Send,
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
            <div className="grid grid-cols-[1fr_160px_120px_100px_100px_120px] gap-4 px-4 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proyecto</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Total</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">Margen</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Acciones</span>
            </div>

            {filtered.map((budget: any, idx: number) => (
              <div
                key={budget.id}
                className={`grid grid-cols-[1fr_160px_120px_100px_100px_120px] gap-4 px-4 py-3.5 items-center hover:bg-muted/20 transition-colors ${
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

                {/* Total */}
                <span className="text-sm font-semibold text-foreground text-right">{formatCurrency(budget.totalSale)}</span>

                {/* Margin */}
                <div className="flex justify-center">
                  {parseFloat(budget.netMarginPct) > 0 ? (
                    <MarginBadge pct={parseFloat(budget.netMarginPct)} showLabel={false} />
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Duplicar"
                    onClick={() => duplicateMutation.mutate({ id: budget.id })}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  {budget.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Marcar como enviado"
                      onClick={() => updateStatusMutation.mutate({ id: budget.id, status: "sent" })}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
