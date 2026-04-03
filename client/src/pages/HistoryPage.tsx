import AppLayout from "@/components/AppLayout";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Clock, History, Loader2, RefreshCw, Users, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

function fmtJ(v: number | string): string {
  const n = parseFloat(String(v ?? 0));
  return isNaN(n) ? "0.00j" : `${n.toFixed(2)}j`;
}

const DEPT_LABELS: Record<string, string> = {
  seo: "SEO",
  design: "Diseño",
  development: "Desarrollo",
  management: "Gestión",
  various: "Varios",
  external: "Externo",
};

const DEPT_COLORS: Record<string, string> = {
  seo: "bg-purple-50 text-purple-700 border-purple-200",
  design: "bg-pink-50 text-pink-700 border-pink-200",
  development: "bg-blue-50 text-blue-700 border-blue-200",
  management: "bg-gray-50 text-gray-600 border-gray-200",
  various: "bg-orange-50 text-orange-700 border-orange-200",
  external: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const EFFICIENCY_CONFIG: Record<string, { label: string; classes: string }> = {
  efficient: { label: "Eficiente", classes: "bg-green-50 text-green-700 border-green-200" },
  correct:   { label: "Correcto",  classes: "bg-blue-50 text-blue-700 border-blue-200" },
  excess:    { label: "Exceso",    classes: "bg-red-50 text-red-700 border-red-200" },
};

interface WorkerForm {
  id?: number;
  projectHistoryId: number;
  workerName: string;
  department: string;
  hoursFromClockify: string;
  hoursAdjustment: string;
  totalDays: string;
  isManual: boolean;
  notes: string;
}

function WorkerRow({
  w,
  isAdmin,
  onEdit,
  onDelete,
}: {
  w: any;
  isAdmin: boolean;
  onEdit: (w: any) => void;
  onDelete: (id: number) => void;
}) {
  const deptCls = DEPT_COLORS[w.department] ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <tr className="border-b border-border/30 hover:bg-muted/10 transition-colors">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{w.workerName}</span>
          {w.isManual && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200">Manual</span>
          )}
        </div>
      </td>
      <td className="py-2 px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${deptCls}`}>
          {DEPT_LABELS[w.department] ?? w.department}
        </span>
      </td>
      <td className="py-2 px-3 text-right text-sm text-muted-foreground">
        {parseFloat(w.hoursFromClockify ?? "0").toFixed(1)}h
      </td>
      <td className="py-2 px-3 text-right text-sm text-muted-foreground">
        {parseFloat(w.hoursAdjustment ?? "0") >= 0 ? "+" : ""}
        {parseFloat(w.hoursAdjustment ?? "0").toFixed(1)}h
      </td>
      <td className="py-2 px-3 text-right font-semibold text-sm">
        {fmtJ(w.totalDays)}
      </td>
      {isAdmin && (
        <td className="py-2 px-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(w)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(w.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  );
}

function ProjectRow({
  h,
  isAdmin,
  projectTypes,
  updateTypeMutation,
}: {
  h: any;
  isAdmin: boolean;
  projectTypes: any[];
  updateTypeMutation: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showWorkerDialog, setShowWorkerDialog] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerForm | null>(null);

  const { data: workers = [], refetch: refetchWorkers } = trpc.clockify.getProjectWorkers.useQuery(
    { projectHistoryId: h.id },
    { enabled: expanded }
  );

  const upsertWorkerMutation = trpc.clockify.upsertProjectWorker.useMutation({
    onSuccess: () => {
      toast.success("Trabajador guardado");
      setShowWorkerDialog(false);
      setEditingWorker(null);
      refetchWorkers();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteWorkerMutation = trpc.clockify.deleteProjectWorker.useMutation({
    onSuccess: () => { toast.success("Trabajador eliminado"); refetchWorkers(); },
    onError: (e) => toast.error(e.message),
  });

  const eff = EFFICIENCY_CONFIG[h.efficiencyStatus ?? ""] ?? null;

  const openAddWorker = () => {
    setEditingWorker({
      projectHistoryId: h.id,
      workerName: "",
      department: "various",
      hoursFromClockify: "0",
      hoursAdjustment: "0",
      totalDays: "0",
      isManual: true,
      notes: "",
    });
    setShowWorkerDialog(true);
  };

  const openEditWorker = (w: any) => {
    setEditingWorker({
      id: w.id,
      projectHistoryId: h.id,
      workerName: w.workerName,
      department: w.department,
      hoursFromClockify: String(w.hoursFromClockify ?? "0"),
      hoursAdjustment: String(w.hoursAdjustment ?? "0"),
      totalDays: String(w.totalDays ?? "0"),
      isManual: w.isManual ?? false,
      notes: w.notes ?? "",
    });
    setShowWorkerDialog(true);
  };

  const handleWorkerFormChange = (field: keyof WorkerForm, value: string | boolean) => {
    if (!editingWorker) return;
    const updated = { ...editingWorker, [field]: value };
    // Auto-calcular totalDays cuando cambian horas
    if (field === "hoursFromClockify" || field === "hoursAdjustment") {
      const base = parseFloat(String(updated.hoursFromClockify)) || 0;
      const adj = parseFloat(String(updated.hoursAdjustment)) || 0;
      updated.totalDays = ((base + adj) / 7).toFixed(2);
    }
    setEditingWorker(updated);
  };

  const handleSaveWorker = () => {
    if (!editingWorker) return;
    upsertWorkerMutation.mutate({
      ...editingWorker,
      department: editingWorker.department as any,
    });
  };

  return (
    <>
      <tr
        className="border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            <div>
              <p className="font-medium text-foreground truncate max-w-[200px]">{h.projectName}</p>
              {h.clockifyProjectId && (
                <p className="text-xs text-muted-foreground">Clockify</p>
              )}
            </div>
          </div>
        </td>
        <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
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
                {projectTypes.map((t: any) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground">
              {projectTypes.find((t: any) => t.id === h.projectTypeId)?.name ?? "—"}
            </span>
          )}
        </td>
        <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtJ(h.realSeoDays)}</td>
        <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtJ(h.realDesignDays)}</td>
        <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtJ(h.realDevDays)}</td>
        <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtJ(h.realVariousDays)}</td>
        <td className="py-2.5 px-3 text-right font-semibold">{fmtJ(h.realTotalDays)}</td>
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

      {/* Expanded: workers */}
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-muted/10 px-6 pb-4 pt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Jornadas por trabajador
                <span className="text-muted-foreground/60">(7h = 1 jornada)</span>
              </p>
              {isAdmin && (
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={openAddWorker}>
                  <Plus className="w-3 h-3" />
                  Añadir trabajador
                </Button>
              )}
            </div>
            {(workers as any[]).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Sin datos de trabajadores. Sincroniza con Clockify o añade manualmente.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-1.5 px-3 text-xs font-medium text-muted-foreground">Trabajador</th>
                    <th className="text-left py-1.5 px-3 text-xs font-medium text-muted-foreground">Dpto.</th>
                    <th className="text-right py-1.5 px-3 text-xs font-medium text-muted-foreground">H. Clockify</th>
                    <th className="text-right py-1.5 px-3 text-xs font-medium text-muted-foreground">Ajuste</th>
                    <th className="text-right py-1.5 px-3 text-xs font-medium text-muted-foreground">Total (j)</th>
                    {isAdmin && <th className="py-1.5 px-3" />}
                  </tr>
                </thead>
                <tbody>
                  {(workers as any[]).map((w: any) => (
                    <WorkerRow
                      key={w.id}
                      w={w}
                      isAdmin={isAdmin}
                      onEdit={openEditWorker}
                      onDelete={(id) => deleteWorkerMutation.mutate({ id, projectHistoryId: h.id })}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}

      {/* Worker dialog */}
      <Dialog open={showWorkerDialog} onOpenChange={setShowWorkerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWorker?.id ? "Editar trabajador" : "Añadir trabajador"}</DialogTitle>
          </DialogHeader>
          {editingWorker && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={editingWorker.workerName}
                    onChange={e => handleWorkerFormChange("workerName", e.target.value)}
                    placeholder="Nombre del trabajador"
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Departamento</Label>
                  <Select
                    value={editingWorker.department}
                    onValueChange={v => handleWorkerFormChange("department", v)}
                  >
                    <SelectTrigger className="h-8 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEPT_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">H. Clockify</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editingWorker.hoursFromClockify}
                    onChange={e => handleWorkerFormChange("hoursFromClockify", e.target.value)}
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Ajuste manual (h)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editingWorker.hoursAdjustment}
                    onChange={e => handleWorkerFormChange("hoursAdjustment", e.target.value)}
                    placeholder="+/- horas"
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Total jornadas (auto)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingWorker.totalDays}
                    onChange={e => handleWorkerFormChange("totalDays", e.target.value)}
                    className="h-8 text-sm mt-1 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    = (H.Clockify + Ajuste) ÷ 7
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Notas (opcional)</Label>
                  <Input
                    value={editingWorker.notes}
                    onChange={e => handleWorkerFormChange("notes", e.target.value)}
                    placeholder="Observaciones..."
                    className="h-8 text-sm mt-1"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowWorkerDialog(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveWorker}
              disabled={upsertWorkerMutation.isPending || !editingWorker?.workerName}
            >
              {upsertWorkerMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function HistoryPage() {
  
  const isAdmin = true; // auth removed

  const { data: history = [], refetch: refetchHistory, isLoading } = trpc.history.list.useQuery();
  const { data: projectTypes = [], refetch: refetchProjectTypes } = trpc.projectTypes.list.useQuery();
  const updateTypeMutation = trpc.history.updateType.useMutation({
    onSuccess: () => { toast.success("Tipología actualizada y medias recalculadas"); refetchHistory(); refetchProjectTypes(); },
    onError: (e) => toast.error(e.message),
  });
  const syncMutation = trpc.clockify.syncProjects.useMutation({
    onSuccess: (data) => {
      toast.success(`Sincronizados ${data.synced} proyectos de ${data.relevant} relevantes (${data.total} total)`);
      refetchHistory();
      refetchProjectTypes();
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
              {totalProjects} proyectos · Media {fmtJ(avgTotalHours)} por proyecto
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => syncMutation.mutate({})}
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
                      <span className="text-xs font-medium">{fmtJ(hours)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-border/50">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total medio</span>
                    <span className="font-semibold">
                      {fmtJ(
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
              <span className="text-xs font-normal text-muted-foreground ml-1">· Haz clic en un proyecto para ver/editar jornadas por trabajador</span>
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
                    {(history as any[]).map((h: any) => (
                      <ProjectRow
                        key={h.id}
                        h={h}
                        isAdmin={isAdmin}
                        projectTypes={projectTypes as any[]}
                        updateTypeMutation={updateTypeMutation}
                      />
                    ))}
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
