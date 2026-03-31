import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, CheckCircle2, Clock, Loader2, RefreshCw, Settings, XCircle } from "lucide-react";
import { toast } from "sonner";

function ConnectionBadge({ connected, lastTested }: { connected: boolean | null | undefined; lastTested?: Date | string | null }) {
  if (connected === null || connected === undefined) {
    return <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full bg-muted-foreground/40" />Sin configurar</span>;
  }
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${connected ? "text-green-600" : "text-red-500"}`}>
      {connected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {connected ? "Conectado" : "Error de conexión"}
      {lastTested && (
        <span className="text-muted-foreground font-normal ml-1">
          · Verificado {new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(lastTested))}
        </span>
      )}
    </span>
  );
}

export default function ConfigPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: fixedCosts = [], refetch: refetchFixed } = trpc.fixedCosts.list.useQuery();
  const { data: holdedConfig, refetch: refetchHolded } = trpc.holded.getConfig.useQuery();
  const { data: clockifyConfig, refetch: refetchClockify } = trpc.clockify.getConfig.useQuery();

  const syncHoldedMutation = trpc.holded.syncFixedCosts.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Sincronizados ${data.count ?? 0} documentos desde Holded`);
      refetchFixed();
      refetchHolded();
    },
    onError: (e: any) => toast.error(e.message ?? "Error al sincronizar con Holded"),
  });

  const syncClockifyMutation = trpc.clockify.syncProjects.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Sincronizados ${data.synced ?? 0} proyectos de Clockify`);
      refetchClockify();
    },
    onError: (e: any) => toast.error(e.message ?? "Error al sincronizar con Clockify"),
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Integraciones y ajustes del sistema</p>
        </div>

        {/* Holded */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Holded
              </CardTitle>
              <ConnectionBadge
                connected={(holdedConfig as any)?.isConnected}
                lastTested={(holdedConfig as any)?.lastTestedAt}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sincroniza los gastos fijos y nóminas de gestión desde Holded para mantener los costes imputables actualizados automáticamente. Los presupuestos se envían como documentos tipo <em>estimate</em>.
            </p>
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Nóminas de gestión:</strong> Fran, Matías, Antonio, Hidaya — se importan como gasto fijo mensual de gestión</p>
              <p><strong>Gastos fijos:</strong> Resto de gastos tras excluir nóminas del equipo y de gestión</p>
              <p><strong>Presupuestos:</strong> Se envían como <em>estimate</em> con búsqueda automática del contacto</p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => (syncHoldedMutation.mutate as any)()}
              disabled={syncHoldedMutation.isPending || !isAdmin}
            >
              {syncHoldedMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sincronizar gastos desde Holded
            </Button>
          </CardContent>
        </Card>

        {/* Clockify */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Clockify
              </CardTitle>
              <ConnectionBadge
                connected={(clockifyConfig as any)?.isConnected}
                lastTested={(clockifyConfig as any)?.lastTestedAt}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importa los tiempos reales registrados por el equipo en Clockify para actualizar las medias históricas por tipología de proyecto.
            </p>
            {(clockifyConfig as any)?.workspaceId && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">Workspace:</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">{(clockifyConfig as any).workspaceId}</span>
              </div>
            )}
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Asignación por departamento:</strong></p>
              <p>Enrique, Rafa → Diseño · Yaiza → SEO · Jose Luis, Ana, Ángel, Fran, Sergio → Desarrollo · Antonio → Varios</p>
              {(clockifyConfig as any)?.lastSyncedAt && (
                <p className="mt-1 text-green-600">
                  Última sincronización: {new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date((clockifyConfig as any).lastSyncedAt))}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => syncClockifyMutation.mutate({ projectTypeId: undefined })}
              disabled={syncClockifyMutation.isPending || !isAdmin}
            >
              {syncClockifyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sincronizar proyectos desde Clockify
            </Button>
          </CardContent>
        </Card>

        {/* Fixed costs summary */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              Gastos fijos actuales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(fixedCosts as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay gastos fijos configurados. Sincroniza desde Holded o añádelos manualmente en la sección de Equipo.
              </p>
            ) : (
              <div className="space-y-2">
                {(fixedCosts as any[]).map((fc: any) => (
                  <div key={fc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
                    <div>
                      <p className="text-sm font-medium text-foreground">{fc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {fc.holdedSource ? "Holded" : "Manual"} · {fc.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(parseFloat(fc.monthlyAmount))}/mes
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {parseFloat(fc.projectAllocationPct).toFixed(1)}% por proyecto
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border text-sm font-semibold">
                  <span>Total mensual</span>
                  <span>
                    {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
                      (fixedCosts as any[]).reduce((s: number, fc: any) => s + parseFloat(fc.monthlyAmount), 0)
                    )}/mes
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
