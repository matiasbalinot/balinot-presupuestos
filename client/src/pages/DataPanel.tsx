import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, Euro, TrendingUp, Users, ChevronDown, ChevronRight } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DEPT_LABELS: Record<string, string> = {
  seo: "SEO",
  design: "Diseño",
  development: "Desarrollo",
  various: "Varios",
  management: "Gestión",
};

const DEPT_COLORS: Record<string, string> = {
  seo: "bg-violet-100 text-violet-700",
  design: "bg-pink-100 text-pink-700",
  development: "bg-blue-100 text-blue-700",
  various: "bg-amber-100 text-amber-700",
  management: "bg-slate-100 text-slate-700",
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtEur(n: number) {
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

// ─── Clockify tab ─────────────────────────────────────────────────────────────
function ClockifyTab() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState("2020-01-01");
  const [dateTo, setDateTo] = useState(today);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.clockify.getProjectHours.useQuery(
    { dateFrom: dateFrom + "T00:00:00Z", dateTo: dateTo + "T23:59:59Z" },
    { staleTime: 5 * 60 * 1000 }
  );

  const projects = useMemo(() => {
    if (!data?.projects) return [];
    if (!search.trim()) return data.projects;
    return data.projects.filter((p: any) =>
      p.projectName.toLowerCase().includes(search.toLowerCase())
    );
  }, [data?.projects, search]);

  const workers = data?.workers ?? [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-sm" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Buscar proyecto</Label>
              <Input placeholder="Nombre del proyecto..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Cargando datos de Clockify...</span>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          {projects.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Proyectos", value: String(projects.length), icon: <TrendingUp className="w-4 h-4" /> },
                { label: "Total horas", value: fmt(projects.reduce((s: number, p: any) => s + p.totalHours, 0), 1) + " h", icon: <Clock className="w-4 h-4" /> },
                { label: "Total jornadas", value: fmt(projects.reduce((s: number, p: any) => s + p.totalDays, 0), 1) + " j", icon: <Clock className="w-4 h-4" /> },
                { label: "Trabajadores", value: String(workers.length), icon: <Users className="w-4 h-4" /> },
              ].map(kpi => (
                <Card key={kpi.label}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      {kpi.icon}
                      <span className="text-xs uppercase tracking-wide">{kpi.label}</span>
                    </div>
                    <div className="text-xl font-semibold text-foreground">{kpi.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Projects table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Horas por proyecto y trabajador</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {projects.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No hay datos de proyectos en el rango seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8"></th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proyecto</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">SEO</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Diseño</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Desarrollo</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Varios</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total h</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total j</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((proj: any) => (
                        <>
                          <tr
                            key={proj.projectId}
                            className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
                            onClick={() => setExpandedProject(expandedProject === proj.projectId ? null : proj.projectId)}
                          >
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {expandedProject === proj.projectId
                                ? <ChevronDown className="w-3.5 h-3.5" />
                                : <ChevronRight className="w-3.5 h-3.5" />}
                            </td>
                            <td className="px-4 py-2.5 font-medium">{proj.projectName}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{proj.seoHours > 0 ? fmt(proj.seoHours, 1) + " h" : "—"}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{proj.designHours > 0 ? fmt(proj.designHours, 1) + " h" : "—"}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{proj.devHours > 0 ? fmt(proj.devHours, 1) + " h" : "—"}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{proj.variousHours > 0 ? fmt(proj.variousHours, 1) + " h" : "—"}</td>
                            <td className="px-4 py-2.5 text-right font-medium">{fmt(proj.totalHours, 1)} h</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-primary">{fmt(proj.totalDays, 2)} j</td>
                          </tr>
                          {expandedProject === proj.projectId && proj.workers.length > 0 && (
                            <tr key={proj.projectId + "-expanded"} className="bg-muted/10 border-b">
                              <td colSpan={8} className="px-8 py-3">
                                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Desglose por trabajador</div>
                                <div className="flex flex-wrap gap-2">
                                  {proj.workers.map((w: any) => (
                                    <div key={w.name} className="flex items-center gap-2 bg-background border rounded-md px-3 py-1.5 text-xs">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${DEPT_COLORS[w.dept] ?? "bg-gray-100 text-gray-600"}`}>
                                        {DEPT_LABELS[w.dept] ?? w.dept}
                                      </span>
                                      <span className="font-medium">{w.name}</span>
                                      <span className="text-muted-foreground">{fmt(w.hours, 1)} h</span>
                                      <span className="font-semibold text-primary">{fmt(w.days, 2)} j</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Worker averages */}
          {workers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Medias por trabajador</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Trabajador</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Departamento</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Proyectos</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total horas</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total jornadas</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Media h/proyecto</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Media j/proyecto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.map((w: any) => (
                        <tr key={w.name} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium">{w.name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${DEPT_COLORS[w.dept] ?? "bg-gray-100 text-gray-600"}`}>
                              {DEPT_LABELS[w.dept] ?? w.dept}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{w.projectCount}</td>
                          <td className="px-4 py-2.5 text-right">{fmt(w.totalHours, 1)} h</td>
                          <td className="px-4 py-2.5 text-right">{fmt(w.totalDays, 2)} j</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(w.avgHoursPerProject, 1)} h</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-primary">{fmt(w.avgDaysPerProject, 2)} j</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Holded tab ───────────────────────────────────────────────────────────────
function HoldedTab() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.holded.getExpenses.useQuery(
    { dateFrom, dateTo },
    { staleTime: 5 * 60 * 1000 }
  );

  const expenses = useMemo(() => {
    if (!data?.expenses) return [];
    if (!search.trim()) return data.expenses;
    return data.expenses.filter((e: any) =>
      e.concept.toLowerCase().includes(search.toLowerCase()) ||
      e.contactName.toLowerCase().includes(search.toLowerCase())
    );
  }, [data?.expenses, search]);

  const byCategory = data?.byCategory ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-sm" />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Buscar concepto o proveedor</Label>
              <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Cargando gastos de Holded...</span>
        </div>
      ) : (
        <>
          {/* Summary by category */}
          {byCategory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Gastos por categoría</CardTitle>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Total</div>
                    <div className="text-xl font-bold text-foreground">{fmtEur(total)}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {byCategory.map((cat: any) => {
                    const pct = total > 0 ? (cat.total / total) * 100 : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-3">
                        <div className="w-36 text-sm text-muted-foreground truncate flex-shrink-0">{cat.name}</div>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-24 text-right text-sm font-medium">{fmtEur(cat.total)}</div>
                        <div className="w-12 text-right text-xs text-muted-foreground">{fmt(pct, 1)}%</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expenses table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Detalle de gastos
                {expenses.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({expenses.length} documentos)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expenses.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No hay gastos en el rango seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nº Doc.</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Concepto</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proveedor</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Subtotal</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e: any) => (
                        <tr key={e.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{e.date ?? "—"}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{e.docNumber || "—"}</td>
                          <td className="px-4 py-2.5 font-medium max-w-[220px] truncate" title={e.concept}>{e.concept}</td>
                          <td className="px-4 py-2.5 text-muted-foreground max-w-[160px] truncate" title={e.contactName}>{e.contactName || "—"}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtEur(e.subtotal)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">{fmtEur(e.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/20">
                        <td colSpan={5} className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total filtrado</td>
                        <td className="px-4 py-2.5 text-right font-bold text-foreground">
                          {fmtEur(expenses.reduce((s: number, e: any) => s + e.total, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DataPanel() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Panel de datos</h1>
        <p className="text-muted-foreground text-sm mt-1">Datos en tiempo real de Clockify y Holded</p>
      </div>

      <Tabs defaultValue="clockify">
        <TabsList className="mb-6">
          <TabsTrigger value="clockify" className="gap-2">
            <Clock className="w-4 h-4" />
            Clockify — Horas
          </TabsTrigger>
          <TabsTrigger value="holded" className="gap-2">
            <Euro className="w-4 h-4" />
            Holded — Gastos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clockify">
          <ClockifyTab />
        </TabsContent>

        <TabsContent value="holded">
          <HoldedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
