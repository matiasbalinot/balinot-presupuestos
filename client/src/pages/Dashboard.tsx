import AppLayout from "@/components/AppLayout";
import { MarginBadge } from "@/components/MarginBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Link } from "wouter";

function formatCurrency(val: number | string | null | undefined): string {
  const n = parseFloat(String(val ?? 0));
  if (isNaN(n)) return "0 €";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.budgets.dashboard.useQuery();

  const statusCounts = stats?.statusCounts ?? [];
  const recentBudgets = stats?.recentBudgets ?? [];
  const totalThisMonth = stats?.totalThisMonth;

  const getCount = (status: string) => statusCounts.find((s: any) => s.status === status)?.count ?? 0;
  const getAvgMargin = (status: string) => parseFloat(String(statusCounts.find((s: any) => s.status === status)?.avgMargin ?? "0"));

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visión general de presupuestos y rentabilidad</p>
          </div>
          <Link href="/presupuestos/nuevo">
            <Button className="gap-2" style={{ background: "var(--brand-darkest)", color: "white" }}>
              <Plus className="w-4 h-4" />
              Nuevo presupuesto
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Facturado este mes</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {isLoading ? "—" : formatCurrency(totalThisMonth?.total)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isLoading ? "" : `${totalThisMonth?.count ?? 0} presupuestos`}
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
                  Presupuestos recientes
                </CardTitle>
                <Link href="/presupuestos" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  Ver todos <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : recentBudgets.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay presupuestos aún</p>
                  <Link href="/presupuestos/nuevo">
                    <Button variant="outline" size="sm" className="mt-3 gap-1">
                      <Plus className="w-3 h-3" />
                      Crear el primero
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentBudgets.map((budget: any) => (
                    <Link key={budget.id} href={`/presupuestos/${budget.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{budget.projectName}</p>
                            <StatusBadge status={budget.status} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {budget.clientName} · {formatDate(budget.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {parseFloat(budget.netMarginPct) > 0 && (
                            <MarginBadge pct={parseFloat(budget.netMarginPct)} showLabel={false} />
                          )}
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(budget.totalSale)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
