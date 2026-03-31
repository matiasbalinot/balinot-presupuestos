import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Clock, History, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function fmtH(h: number | string): string {
  const v = parseFloat(String(h ?? 0));
  return isNaN(v) ? "0j" : `${v.toFixed(2)}j`;
}

const EFFICIENCY_CONFIG: Record<string, { label: string; classes: string }> = {
  efficient: { label: "Eficiente", classes: "bg-green-50 text-green-700 border-green-200" },
  correct:   { label: "Correcto",  classes: "bg-blue-50 text-blue-700 border-blue-200" },
  excess:    { label: "Exceso",    classes: "bg-red-50 text-red-700 border-red-200" },
};

export default function HistoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: history = [], refetch: refetchHistory, isLoading } = trpc.history.list.useQuery();
  const { data: projectTypes = [] } = trpc.projectTypes.list.useQuery();
  const updateTypeMutation = trpc.history.updateType.useMutation({
    onSuccess: () => { toast.success("Tipología actualizada y medias recalculadas"); refetchHistory(); },
    onError: (e) => toast.error(e.message),
  });
  const syncMutation = trpc.clockify.syncProjects.useMutation({
    onSuccess: (data) => {
      toast.success(`Sincronizados ${data.synced} proyectos de ${data.total}`);
      refetchHistory();
    },
    onError: (e) => toast.error(e.message ?? "Error al sincronizar"),
  });

  const totalProjects = (history as any[]).length;
  const avgTotalHours = totalProjects > 0
    ? (history as any[]).reduce((s: number, h: any) => s + parseFloat(h.realTotalDays ?? "0"), 0) / totalProjects
    : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Histórico de proyectos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalProjects} proyectos · Media {fmtH(avgTotalHours)} jornadas por proyecto
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => syncMutation.mutate({ projectTypeId: undefined })}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sincronizar Clockify
            </Button>
          )}
        </div>

        {/* Averages by type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {(projectTypes as any[]).map((type: any) => (
            <Card key={type.id} className="border-border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-foreground mb-3">{type.name}</p>
                <div className="space-y-1.5">
                  {[
                    { label: "SEO", hours: type.avgSeoDays, color: "bg-purple-400" },
                    { label: "Diseño", hours: type.avgDesignDays, color: "bg-pink-400" },
                    { label: "Dev", hours: type.avgDevDays, color: "bg-blue-400" },
                    { label: "Varios", hours: type.avgVariousDays, color: "bg-orange-400" },
                  ].map(({ label, hours, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                      <span className="text-xs text-muted-foreground flex-1">{label}</span>
                      <span className="text-xs font-medium">{fmtH(hours)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-border/50">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total medio</span>
                    <span className="font-semibold">
                      {fmtH(
                        parseFloat(type.avgSeoDays ?? "0") +
                        parseFloat(type.avgDesignDays ?? "0") +
                        parseFloat(type.avgDevDays ?? "0") +
                        parseFloat(type.avgVariousDays ?? "0")
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Basado en {type.sampleCount ?? 0} proyectos
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* History table */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              Proyectos registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (history as any[]).length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay proyectos en el histórico</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sincroniza con Clockify para importar los tiempos reales
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Proyecto</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Tipología</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">SEO (j)</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Diseño (j)</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Dev (j)</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Varios (j)</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Total (j)</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(history as any[]).map((h: any) => {
                      const eff = EFFICIENCY_CONFIG[h.efficiencyStatus ?? ""] ?? null;
                      return (
                        <tr key={h.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-foreground truncate max-w-[200px]">{h.projectName}</p>
                            {h.clockifyProjectId && (
                              <p className="text-xs text-muted-foreground">Clockify</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isAdmin ? (
                              <Select
                                value={h.projectTypeId ? String(h.projectTypeId) : "none"}
                                onValueChange={v => {
                                  if (v !== "none") {
                                    updateTypeMutation.mutate({ id: h.id, projectTypeId: parseInt(v) });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-6 text-xs w-36">
                                  <SelectValue placeholder="Asignar tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sin asignar</SelectItem>
                                  {(projectTypes as any[]).map((t: any) => (
                                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {(projectTypes as any[]).find((t: any) => t.id === h.projectTypeId)?.name ?? "—"}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtH(h.realSeoDays)}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtH(h.realDesignDays)}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtH(h.realDevDays)}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtH(h.realVariousDays)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">{fmtH(h.realTotalDays)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {eff ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs border ${eff.classes}`}>
                                {eff.label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
