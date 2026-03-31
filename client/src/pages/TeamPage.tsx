import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Edit, Loader2, Plus, Settings2, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DEPT_LABELS: Record<string, string> = {
  seo: "SEO",
  design: "Diseño",
  development: "Desarrollo",
  management: "Gestión",
  various: "Varios",
};

const DEPT_COLORS: Record<string, string> = {
  seo: "bg-purple-50 text-purple-700 border-purple-200",
  design: "bg-pink-50 text-pink-700 border-pink-200",
  development: "bg-blue-50 text-blue-700 border-blue-200",
  management: "bg-gray-50 text-gray-600 border-gray-200",
  various: "bg-orange-50 text-orange-700 border-orange-200",
};

function fmtCurrency(n: number | string): string {
  const v = parseFloat(String(n ?? 0));
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

function WorkerDialog({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: any;
  onSave: (data: any) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [dept, setDept] = useState(initial?.department ?? "development");
  const [cost, setCost] = useState(String(initial?.costPerDay ?? ""));
  const [sale, setSale] = useState(String(initial?.salePricePerDay ?? ""));
  const [clockifyEmail, setClockifyEmail] = useState(initial?.clockifyUserEmail ?? "");

  const multiplier = cost && sale ? (parseFloat(sale) / parseFloat(cost)).toFixed(2) : "—";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar trabajador" : "Nuevo trabajador"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Departamento *</Label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEPT_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Coste/jornada (€) *</Label>
              <Input type="number" value={cost} onChange={e => setCost(e.target.value)} min="0" step="0.5" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Precio venta/hora (€) *</Label>
              <Input type="number" value={sale} onChange={e => setSale(e.target.value)} min="0" step="0.5" />
            </div>
          </div>
          {cost && sale && (
            <p className="text-xs text-muted-foreground">
              Multiplicador: <strong>{multiplier}x</strong> — margen bruto por hora: <strong>{fmtCurrency(parseFloat(sale) - parseFloat(cost))}</strong>
            </p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Email en Clockify (para sincronización)</Label>
            <Input
              type="email"
              value={clockifyEmail}
              onChange={e => setClockifyEmail(e.target.value)}
              placeholder="trabajador@balinot.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!name.trim() || !cost || !sale) {
                toast.error("Rellena todos los campos obligatorios");
                return;
              }
              onSave({ id: initial?.id, name, department: dept, costPerDay: cost, salePricePerDay: sale, clockifyUserEmail: clockifyEmail || undefined });
            }}
            style={{ background: "var(--brand-darkest)", color: "white" }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommissionDialog({ open, onClose, initial, onSave }: any) {
  const [name, setName] = useState(initial?.name ?? "");
  const [pct, setPct] = useState(String(initial?.percentage ?? "10"));
  const [appliesTo, setAppliesTo] = useState(initial?.appliesTo ?? "with_management");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar comisión" : "Nueva comisión"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Comisión Luis" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Porcentaje (%)</Label>
            <Input type="number" value={pct} onChange={e => setPct(e.target.value)} min="0" max="100" step="0.5" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Se aplica sobre</Label>
            <Select value={appliesTo} onValueChange={setAppliesTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="with_management">Total con gestión</SelectItem>
                <SelectItem value="subtotal">Subtotal sin gestión</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => onSave({ id: initial?.id, name, percentage: pct, appliesTo, isActive: true })}
            style={{ background: "var(--brand-darkest)", color: "white" }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: workers = [], refetch: refetchWorkers } = trpc.workers.list.useQuery();
  const { data: commissions = [], refetch: refetchCommissions } = trpc.commissions.list.useQuery();
  const { data: fixedCosts = [], refetch: refetchFixed } = trpc.fixedCosts.list.useQuery();

  const upsertWorker = trpc.workers.upsert.useMutation({
    onSuccess: () => { toast.success("Trabajador guardado"); refetchWorkers(); setWorkerDialog(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteWorker = trpc.workers.delete.useMutation({
    onSuccess: () => { toast.success("Trabajador desactivado"); refetchWorkers(); },
    onError: (e) => toast.error(e.message),
  });
  const upsertCommission = trpc.commissions.upsert.useMutation({
    onSuccess: () => { toast.success("Comisión guardada"); refetchCommissions(); setCommDialog(null); },
    onError: (e) => toast.error(e.message),
  });
  const upsertFixedCost = trpc.fixedCosts.upsert.useMutation({
    onSuccess: () => { toast.success("Gasto fijo guardado"); refetchFixed(); },
    onError: (e) => toast.error(e.message),
  });

  const [workerDialog, setWorkerDialog] = useState<any>(null);
  const [commDialog, setCommDialog] = useState<any>(null);

  const depts = ["seo", "design", "development", "various", "management"];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Equipo y tarifas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona trabajadores, tarifas y comisiones</p>
        </div>

        {/* Workers */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Trabajadores
              </CardTitle>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setWorkerDialog({})}
                >
                  <Plus className="w-3 h-3" />
                  Añadir
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {depts.map(dept => {
              const deptWorkers = (workers as any[]).filter((w: any) => w.department === dept);
              if (deptWorkers.length === 0) return null;
              return (
                <div key={dept} className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${DEPT_COLORS[dept]}`}>
                      {DEPT_LABELS[dept]}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {deptWorkers.map((w: any) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{w.name}</p>
                          {w.clockifyUserEmail && (
                            <p className="text-xs text-muted-foreground">{w.clockifyUserEmail}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Coste/h</p>
                            <p className="font-medium">{fmtCurrency(w.costPerDay)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Venta/h</p>
                            <p className="font-semibold">{fmtCurrency(w.salePricePerDay)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Mult.</p>
                            <p className="font-medium text-muted-foreground">
                              {(parseFloat(w.salePricePerDay) / parseFloat(w.costPerDay)).toFixed(1)}x
                            </p>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setWorkerDialog(w)}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`¿Desactivar a ${w.name}?`)) deleteWorker.mutate({ id: w.id });
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Commissions */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                Comisiones
              </CardTitle>
              {isAdmin && (
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setCommDialog({})}>
                  <Plus className="w-3 h-3" />
                  Añadir
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(commissions as any[]).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Sobre: {c.appliesTo === "with_management" ? "total con gestión" : "subtotal"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-foreground">{parseFloat(c.percentage).toFixed(1)}%</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${c.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    {c.isActive ? "Activa" : "Inactiva"}
                  </span>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCommDialog(c)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fixed costs */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Gastos fijos imputables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(fixedCosts as any[]).map((fc: any) => (
              <div key={fc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
                <div>
                  <p className="text-sm font-medium text-foreground">{fc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fc.holdedSource ? "Sincronizado desde Holded" : "Manual"} · Categoría: {fc.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{fmtCurrency(fc.monthlyAmount)}/mes</p>
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(fc.projectAllocationPct).toFixed(1)}% imputado por proyecto
                    → {fmtCurrency(parseFloat(fc.monthlyAmount) * parseFloat(fc.projectAllocationPct) / 100)}/proyecto
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {workerDialog !== null && (
        <WorkerDialog
          open
          onClose={() => setWorkerDialog(null)}
          initial={workerDialog.id ? workerDialog : undefined}
          onSave={(data) => upsertWorker.mutate(data)}
        />
      )}
      {commDialog !== null && (
        <CommissionDialog
          open
          onClose={() => setCommDialog(null)}
          initial={commDialog.id ? commDialog : undefined}
          onSave={(data: any) => upsertCommission.mutate(data)}
        />
      )}
    </AppLayout>
  );
}
