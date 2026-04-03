import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Euro,
  FileText,
  Plus,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

// ─── Date range helpers ────────────────────────────────────────────────────────
type RangeKey =
  | "today"
  | "yesterday"
  | "last7"
  | "current_month"
  | "prev_month"
  | "current_quarter"
  | "prev_quarter"
  | "current_year"
  | "prev_year";

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  last7: "Últimos 7 días",
  current_month: "Mes actual",
  prev_month: "Mes anterior",
  current_quarter: "Trimestre actual",
  prev_quarter: "Trimestre anterior",
  current_year: "Año actual",
  prev_year: "Año anterior",
};

function getRange(key: RangeKey): { from: Date; to: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (key) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y2 = new Date(now); y2.setDate(now.getDate() - 1);
      return { from: startOfDay(y2), to: endOfDay(y2) };
    }
    case "last7": {
      const d = new Date(now); d.setDate(now.getDate() - 6);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    case "current_month":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    case "prev_month":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0, 23, 59, 59, 999) };
    case "current_quarter": {
      const q = Math.floor(m / 3);
      return { from: new Date(y, q * 3, 1), to: new Date(y, q * 3 + 3, 0, 23, 59, 59, 999) };
    }
    case "prev_quarter": {
      const q = Math.floor(m / 3) - 1;
      const pqYear = q < 0 ? y - 1 : y;
      const pq = q < 0 ? 3 : q;
      return { from: new Date(pqYear, pq * 3, 1), to: new Date(pqYear, pq * 3 + 3, 0, 23, 59, 59, 999) };
    }
    case "current_year":
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59, 999) };
    case "prev_year":
      return { from: new Date(y - 1, 0, 1), to: new Date(y - 1, 11, 31, 23, 59, 59, 999) };
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatCurrency(val: number | string | null | undefined): string {
  const n = parseFloat(String(val ?? 0));
  if (isNaN(n)) return "0 €";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("current_month");

  const range = useMemo(() => getRange(rangeKey), [rangeKey]);

  const { data: stats, isLoading } = trpc.budgets.dashboard.useQuery(
    { from: range.from, to: range.to }
  );

  const statusCounts = stats?.statusCounts ?? [];
  const recentBudgets = stats?.recentBudgets ?? [];
  const totalInRange = stats?.totalInRange;

  const getCount = (status: string) => Number(statusCounts.find((s: any) => s.status === status)?.count ?? 0);

  const totalBudgets = statusCounts.reduce((sum: number, s: any) => sum + Number(s.count ?? 0), 0);
  const acceptedCount = getCount("accepted");
  const acceptanceRate = totalBudgets > 0 ? (acceptedCount / totalBudgets) * 100 : 0;

  const allMargins = recentBudgets
    .filter((b: any) => parseFloat(b.netMarginPct) > 0)
    .map((b: any) => parseFloat(b.netMarginPct));
  const avgMargin = allMargins.length > 0 ? allMargins.reduce((a: number, b: number) => a + b, 0) / allMargins.length : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visión general de presupuestos y rentabilidad</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Range selector */}
            <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {RANGE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link href="/presupuestos/nuevo">
              <Button className="gap-2 h-9" style={{ background: "var(--brand-darkest)", color: "white" }}>
                <Plus className="w-4 h-4" />
                Nuevo presupuesto
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Presupuestado</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {isLoading ? "—" : formatCurrency(totalInRange?.total)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isLoading ? "" : `${totalInRange?.count ?? 0} presupuestos`}
                  </p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "var(--brand-lightest)" }}>
                  <Euro className="w-5 h-5" style={{ color: "var(--brand-dark)" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Margen medio</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {isLoading ? "—" : `${avgMargin.toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {avgMargin >= 35 ? "Excelente" : avgMargin >= 20 ? "Ajustado" : "Bajo"}
                  </p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "var(--brand-lightest)" }}>
                  <TrendingUp className="w-5 h-5" style={{ color: "var(--brand-dark)" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tasa de aceptación</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {isLoading ? "—" : `${acceptanceRate.toFixed(0)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {acceptedCount} aceptados de {totalBudgets}
                  </p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "var(--brand-lightest)" }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: "var(--brand-dark)" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total presupuestos</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {isLoading ? "—" : totalBudgets}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getCount("draft")} borradores · {getCount("sent")} enviados
                  </p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "var(--brand-lightest)" }}>
                  <FileText className="w-5 h-5" style={{ color: "var(--brand-dark)" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status overview + Recent budgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status breakdown */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Estado de presupuestos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { status: "draft", label: "Borrador", icon: Clock, color: "#9a9ca8" },
                { status: "sent", label: "Enviado", icon: FileText, color: "#3b82f6" },
                { status: "accepted", label: "Aceptado", icon: CheckCircle2, color: "#22c55e" },
                { status: "rejected", label: "Rechazado", icon: XCircle, color: "#ef4444" },
              ].map(({ status, label, icon: Icon, color }) => {
                const count = getCount(status);
                const pct = totalBudgets > 0 ? (count / totalBudgets) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{label}</span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Recent budgets */}
          <Card className="border-border shadow-sm lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Presupuestos — <span className="font-normal text-muted-foreground">{RANGE_LABELS[rangeKey]}</span>
                </CardTitle>
                <Link href="/presupuestos" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  Ver todos <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : recentBudgets.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay presupuestos en este período</p>
                  <Link href="/presupuestos/nuevo">
                    <Button variant="outline" size="sm" className="mt-3 gap-1">
                      <Plus className="w-3 h-3" />
                      Crear el primero
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_90px_90px_100px_90px] gap-2 px-4 py-2 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proyecto</span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Subtotal</span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">IVA</span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right">Total</span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center">Estado</span>
                  </div>
                  {recentBudgets.map((budget: any) => {
                    const subtotal = parseFloat(String(budget.totalSale ?? 0));
                    const taxRate = parseFloat(String(budget.taxRate ?? 21));
                    const ivaAmount = subtotal * (taxRate / 100);
                    const total = subtotal + ivaAmount;
                    return (
                      <Link
                        key={budget.id}
                        href={`/presupuestos/${budget.id}`}
                        className="grid grid-cols-[1fr_90px_90px_100px_90px] gap-2 px-4 py-2.5 items-center hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{budget.projectName}</p>
                          <p className="text-xs text-muted-foreground truncate">{budget.clientName}</p>
                        </div>
                        <span className="text-sm text-muted-foreground text-right tabular-nums">{formatCurrency(subtotal)}</span>
                        <span className="text-sm text-muted-foreground text-right tabular-nums">{formatCurrency(ivaAmount)}</span>
                        <span className="text-sm font-semibold text-foreground text-right tabular-nums">{formatCurrency(total)}</span>
                        <div className="flex justify-center">
                          <StatusBadge status={budget.status} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
