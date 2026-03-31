import AppLayout from "@/components/AppLayout";
import { MarginBadge, MarginIndicator } from "@/components/MarginBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

type Area = "seo" | "design" | "development" | "various" | "management" | "commission" | "fixed";

interface BudgetLine {
  id?: number;
  tempId: string;
  workerId: number | null;
  area: Area;
  description: string;
  estimatedDays: string;
  costPerDay: string;
  salePricePerDay: string;
  lineCost: string;
  lineSale: string;
  isFixedPrice: boolean;
  fixedPrice: string;
  sortOrder: number;
}

const AREA_LABELS: Record<Area, string> = {
  seo: "SEO",
  design: "Diseño",
  development: "Desarrollo",
  various: "Varios",
  management: "Gestión",
  commission: "Comisión",
  fixed: "Gastos fijos",
};

const AREA_COLORS: Record<Area, string> = {
  seo:         "bg-purple-50 text-purple-700 border-purple-200",
  design:      "bg-pink-50 text-pink-700 border-pink-200",
  development: "bg-blue-50 text-blue-700 border-blue-200",
  various:     "bg-orange-50 text-orange-700 border-orange-200",
  management:  "bg-gray-50 text-gray-600 border-gray-200",
  commission:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  fixed:       "bg-red-50 text-red-600 border-red-200",
};

function uid() { return Math.random().toString(36).slice(2); }

function fmt(n: number | string): string {
  const v = parseFloat(String(n ?? 0));
  return isNaN(v) ? "0" : v.toFixed(2);
}

function fmtCurrency(n: number | string): string {
  const v = parseFloat(String(n ?? 0));
  if (isNaN(v)) return "0,00 €";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

function calcLine(line: BudgetLine): BudgetLine {
  if (line.isFixedPrice) {
    const fp = parseFloat(line.fixedPrice) || 0;
    return { ...line, lineCost: fmt(fp * 0.6), lineSale: fmt(fp) };
  }
  const hours = parseFloat(line.estimatedDays) || 0;
  const cost = parseFloat(line.costPerDay) || 0;
  const sale = parseFloat(line.salePricePerDay) || 0;
  return { ...line, lineCost: fmt(hours * cost), lineSale: fmt(hours * sale) };
}

export default function BudgetEditor() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const isNew = !params.id || params.id === "nuevo";
  const budgetId = isNew ? null : parseInt(params.id!);

  // Data queries
  const { data: workers = [] } = trpc.workers.listActive.useQuery();
  const { data: projectTypes = [] } = trpc.projectTypes.list.useQuery();
  const { data: fixedCosts = [] } = trpc.fixedCosts.list.useQuery();
  const { data: commissions = [] } = trpc.commissions.list.useQuery();
  const { data: existingBudget } = trpc.budgets.get.useQuery(
    { id: budgetId! },
    { enabled: !!budgetId }
  );

  // Form state
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectTypeId, setProjectTypeId] = useState<number | null>(null);
  const [managementPct, setManagementPct] = useState("40");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showHoldedModal, setShowHoldedModal] = useState(false);
  const [holdedContactId, setHoldedContactId] = useState("");

  // Load existing budget
  useEffect(() => {
    if (existingBudget) {
      setProjectName(existingBudget.projectName);
      setClientName(existingBudget.clientName);
      setClientEmail(existingBudget.clientEmail ?? "");
      setProjectTypeId(existingBudget.projectTypeId ?? null);
      setManagementPct(existingBudget.managementPct ?? "40");
      setNotes(existingBudget.notes ?? "");
      setInternalNotes(existingBudget.internalNotes ?? "");
      const existingLines: BudgetLine[] = ((existingBudget as any).lines ?? []).map((l: any) => ({
        ...l,
        tempId: uid(),
        estimatedDays: String(l.estimatedDays ?? "0"),
        costPerDay: String(l.costPerDay ?? "0"),
        salePricePerDay: String(l.salePricePerDay ?? "0"),
        lineCost: String(l.lineCost ?? "0"),
        lineSale: String(l.lineSale ?? "0"),
        fixedPrice: String(l.fixedPrice ?? "0"),
        isFixedPrice: l.isFixedPrice ?? false,
      }));
      setLines(existingLines);
    }
  }, [existingBudget]);

  // Apply project type suggestion
  const handleProjectTypeChange = (typeId: string) => {
    const id = parseInt(typeId);
    setProjectTypeId(id);
    const type = (projectTypes as any[]).find((t: any) => t.id === id);
    if (!type) return;

    const newLines: BudgetLine[] = [];

    // SEO workers
    const seoWorkers = workers.filter((w: any) => w.department === "seo");
    if (parseFloat(type.avgSeoDays) > 0 && seoWorkers.length > 0) {
      const w = seoWorkers[0];
      newLines.push(calcLine({
        tempId: uid(), workerId: w.id, area: "seo",
        description: `SEO — ${w.name}`,
        estimatedDays: fmt(parseFloat(type.avgSeoDays) / seoWorkers.length),
        costPerDay: String(w.costPerDay), salePricePerDay: String(w.salePricePerDay),
        lineCost: "0", lineSale: "0", isFixedPrice: false, fixedPrice: "0", sortOrder: newLines.length,
      }));
    }

    // Design workers — always generate TWO lines:
    // 1. Rafa: fase referencial (fixed 0.5j)
    // 2. Enrique: diseño web (jornadas del histórico)
    const designWorkers = workers.filter((w: any) => w.department === "design");
    const rafa = designWorkers.find((w: any) => w.name.toLowerCase().includes("rafa"));
    const enrique = designWorkers.find((w: any) => w.name.toLowerCase().includes("enrique"));
    const fallbackDesigner = designWorkers[0];
    // Line 1: Rafa — fase referencial (always 0.5j)
    if (rafa || fallbackDesigner) {
      const w = rafa ?? fallbackDesigner;
      newLines.push(calcLine({
        tempId: uid(), workerId: w.id, area: "design",
        description: `Fase referencial — ${w.name}`,
        estimatedDays: "0.5",
        costPerDay: String(w.costPerDay), salePricePerDay: String(w.salePricePerDay),
        lineCost: "0", lineSale: "0", isFixedPrice: false, fixedPrice: "0", sortOrder: newLines.length,
      }));
    }
    // Line 2: Enrique — diseño web (jornadas del histórico, or 0 if no data yet)
    if (enrique || fallbackDesigner) {
      const w = enrique ?? fallbackDesigner;
      const avgDays = parseFloat(type.avgDesignDays) || 0;
      newLines.push(calcLine({
        tempId: uid(), workerId: w.id, area: "design",
        description: `Diseño web — ${w.name}`,
        estimatedDays: fmt(avgDays),
        costPerDay: String(w.costPerDay), salePricePerDay: String(w.salePricePerDay),
        lineCost: "0", lineSale: "0", isFixedPrice: false, fixedPrice: "0", sortOrder: newLines.length,
      }));
    }

    // Dev workers
    const devWorkers = workers.filter((w: any) => w.department === "development");
    if (parseFloat(type.avgDevDays) > 0 && devWorkers.length > 0) {
      const w = devWorkers[0];
      newLines.push(calcLine({
        tempId: uid(), workerId: w.id, area: "development",
        description: `Desarrollo — ${w.name}`,
        estimatedDays: fmt(parseFloat(type.avgDevDays) / devWorkers.length),
        costPerDay: String(w.costPerDay), salePricePerDay: String(w.salePricePerDay),
        lineCost: "0", lineSale: "0", isFixedPrice: false, fixedPrice: "0", sortOrder: newLines.length,
      }));
    }

    if (newLines.length > 0) setLines(newLines);
    toast.info(`Jornadas sugeridas basadas en ${type.sampleCount ?? 0} proyectos similares`);
  };

  // Add line
  const addLine = (area: Area) => {
    const areaWorkers = workers.filter((w: any) => {
      if (area === "seo") return w.department === "seo";
      if (area === "design") return w.department === "design";
      if (area === "development") return w.department === "development";
      if (area === "various") return w.department === "various";
      return false;
    });
    const w = areaWorkers[0];
    const newLine: BudgetLine = calcLine({
      tempId: uid(), workerId: w?.id ?? null, area,
      description: `${AREA_LABELS[area]}${w ? ` — ${w.name}` : ""}`,
      estimatedDays: "0",
      costPerDay: String(w?.costPerDay ?? "0"),
      salePricePerDay: String(w?.salePricePerDay ?? "0"),
      lineCost: "0", lineSale: "0", isFixedPrice: false, fixedPrice: "0",
      sortOrder: lines.length,
    });
    setLines([...lines, newLine]);
  };

  const updateLine = (tempId: string, changes: Partial<BudgetLine>) => {
    setLines(prev => prev.map(l => {
      if (l.tempId !== tempId) return l;
      const updated = { ...l, ...changes };
      // Auto-fill rates when worker changes
      if (changes.workerId !== undefined) {
        const w = workers.find((w: any) => w.id === changes.workerId);
        if (w) {
          updated.costPerDay = String(w.costPerDay);
          updated.salePricePerDay = String(w.salePricePerDay);
          updated.description = `${AREA_LABELS[updated.area]} — ${w.name}`;
        }
      }
      return calcLine(updated);
    }));
  };

  const removeLine = (tempId: string) => {
    setLines(prev => prev.filter(l => l.tempId !== tempId));
  };

  // Calculations
  const totals = useMemo(() => {
    const workLines = lines.filter(l => !["management", "commission", "fixed"].includes(l.area));
    const subtotalCost = workLines.reduce((s, l) => s + parseFloat(l.lineCost || "0"), 0);
    const subtotalSale = workLines.reduce((s, l) => s + parseFloat(l.lineSale || "0"), 0);

    const mgmtPct = parseFloat(managementPct) / 100;
    const managementCost = subtotalCost * mgmtPct;
    const managementSale = subtotalSale * mgmtPct;

    const withMgmtCost = subtotalCost + managementCost;
    const withMgmtSale = subtotalSale + managementSale;

    // Commissions
    let totalCommissionSale = 0;
    for (const comm of commissions as any[]) {
      if (!comm.isActive) continue;
      const base = comm.appliesTo === "with_management" ? withMgmtSale : subtotalSale;
      totalCommissionSale += base * (parseFloat(comm.percentage) / 100);
    }

    // Fixed costs allocation
    const totalFixedMonthly = (fixedCosts as any[]).reduce((s: number, fc: any) => {
      return s + parseFloat(fc.monthlyAmount) * (parseFloat(fc.projectAllocationPct) / 100);
    }, 0);

    const totalSale = withMgmtSale + totalCommissionSale;
    const totalCost = withMgmtCost + totalFixedMonthly;
    const grossMargin = totalSale - withMgmtCost;
    const grossMarginPct = totalSale > 0 ? (grossMargin / totalSale) * 100 : 0;
    const netMargin = totalSale - totalCost;
    const netMarginPct = totalSale > 0 ? (netMargin / totalSale) * 100 : 0;

    return {
      subtotalCost, subtotalSale,
      managementCost, managementSale,
      withMgmtCost, withMgmtSale,
      totalCommissionSale, totalFixedMonthly,
      totalCost, totalSale,
      grossMargin, grossMarginPct,
      netMargin, netMarginPct,
    };
  }, [lines, managementPct, commissions, fixedCosts]);

  // Mutations
  const saveMutation = trpc.budgets.save.useMutation();
  const llmMutation = trpc.llm.recommend.useMutation();

  const handleSave = async (status?: "draft" | "sent") => {
    if (!projectName.trim() || !clientName.trim()) {
      toast.error("El nombre del proyecto y del cliente son obligatorios");
      return;
    }
    setIsSaving(true);
    try {
      const result = await saveMutation.mutateAsync({
        id: budgetId ?? undefined,
        projectName, clientName, clientEmail,
        projectTypeId,
        managementPct,
        status: status ?? "draft",
        totalCost: fmt(totals.totalCost),
        totalSale: fmt(totals.totalSale),
        grossMargin: fmt(totals.grossMargin),
        grossMarginPct: fmt(totals.grossMarginPct),
        fixedCostsAmount: fmt(totals.totalFixedMonthly),
        netMargin: fmt(totals.netMargin),
        netMarginPct: fmt(totals.netMarginPct),
        notes, internalNotes,
        holdedContactId: holdedContactId || undefined,
        lines: lines.map((l, i) => ({
          id: l.id,
          workerId: l.workerId,
          area: l.area,
          description: l.description,
          estimatedDays: l.estimatedDays,
          costPerDay: l.costPerDay,
          salePricePerDay: l.salePricePerDay,
          lineCost: l.lineCost,
          lineSale: l.lineSale,
          isFixedPrice: l.isFixedPrice,
          fixedPrice: l.fixedPrice,
          sortOrder: i,
        })),
      });
      toast.success("Presupuesto guardado");
      if (isNew) navigate(`/presupuestos/${result.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetRecommendations = async () => {
    const type = projectTypes.find((t: any) => t.id === projectTypeId);
    setShowRecommendations(true);
    setRecommendations("");
    try {
      const result = await llmMutation.mutateAsync({
        projectTypeSlug: (type as any)?.slug ?? "web-corporativa",
        projectName,
        currentLines: lines.map(l => ({ area: l.area, description: l.description, estimatedDays: l.estimatedDays })),
      });
      setRecommendations(String(result.recommendations ?? ""));
    } catch {
      setRecommendations("No se pudieron obtener recomendaciones en este momento.");
    }
  };

  const handleDownloadPdf = async (version: "client" | "internal") => {
    if (!budgetId) {
      toast.error("Guarda el presupuesto primero");
      return;
    }
    try {
      const res = await fetch(`/api/pdf/${budgetId}?version=${version}`);
      if (!res.ok) throw new Error("Error generando PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `presupuesto-${budgetId}-${version}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar el PDF");
    }
  };

  const areaGroups: Area[] = ["seo", "design", "development", "various"];
  const linesByArea = (area: Area) => lines.filter(l => l.area === area);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {isNew ? "Nuevo presupuesto" : `Presupuesto — ${existingBudget?.budgetNumber ?? ""}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isNew ? "Calcula costes, precio de venta y rentabilidad" : `${existingBudget?.projectName ?? ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleDownloadPdf("client")}>
                  <Download className="w-3.5 h-3.5" />
                  PDF cliente
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleDownloadPdf("internal")}>
                  <FileText className="w-3.5 h-3.5" />
                  PDF interno
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave("draft")}
              disabled={isSaving}
              className="gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar borrador
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave("sent")}
              disabled={isSaving}
              className="gap-1.5"
              style={{ background: "var(--brand-darkest)", color: "white" }}
            >
              <Send className="w-3.5 h-3.5" />
              Enviar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Left: form */}
          <div className="space-y-5">
            {/* Project info */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Datos del proyecto</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre del proyecto *</Label>
                  <Input
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="Ej: Web corporativa Empresa X"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipología</Label>
                  <Select
                    value={projectTypeId ? String(projectTypeId) : ""}
                    onValueChange={handleProjectTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipología..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(projectTypes as any[]).map((t: any) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                          {t.sampleCount > 0 && (
                            <span className="text-muted-foreground ml-1">({t.sampleCount} proyectos)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {projectTypeId && (
                    <p className="text-xs text-muted-foreground">
                      Jornadas sugeridas basadas en histórico real
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cliente *</Label>
                  <Input
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email del cliente</Label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="cliente@empresa.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">% Gestión (sobre subtotal)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={managementPct}
                      onChange={e => setManagementPct(e.target.value)}
                      className="w-24"
                      min="0" max="100" step="5"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <span className="text-xs text-muted-foreground">(habitualmente 40%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lines by area */}
            {areaGroups.map(area => (
              <Card key={area} className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${AREA_COLORS[area]}`}>
                        {AREA_LABELS[area]}
                      </span>
                      <span className="text-muted-foreground font-normal text-xs">
                        {fmtCurrency(linesByArea(area).reduce((s, l) => s + parseFloat(l.lineSale || "0"), 0))} venta
                      </span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => addLine(area)}
                    >
                      <Plus className="w-3 h-3" />
                      Añadir línea
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {linesByArea(area).length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-border rounded-lg">
                      <p className="text-xs text-muted-foreground">Sin líneas de {AREA_LABELS[area].toLowerCase()}</p>
                      <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs gap-1" onClick={() => addLine(area)}>
                        <Plus className="w-3 h-3" />
                        Añadir
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_100px_80px_80px_80px_80px_32px] gap-2 px-1">
                        <span className="text-xs text-muted-foreground">Descripción / Trabajador</span>
                        <span className="text-xs text-muted-foreground text-center">Jornadas</span>
                        <span className="text-xs text-muted-foreground text-right">€/j coste</span>
                        <span className="text-xs text-muted-foreground text-right">€/j venta</span>
                        <span className="text-xs text-muted-foreground text-right">Coste</span>
                        <span className="text-xs text-muted-foreground text-right">Venta</span>
                        <span />
                      </div>

                      {linesByArea(area).map(line => (
                        <div key={line.tempId} className="grid grid-cols-[1fr_100px_80px_80px_80px_80px_32px] gap-2 items-center bg-muted/20 rounded-lg px-2 py-2">
                          {/* Description + worker */}
                          <div className="space-y-1 min-w-0">
                            <Input
                              value={line.description}
                              onChange={e => updateLine(line.tempId, { description: e.target.value })}
                              className="h-7 text-xs"
                              placeholder="Descripción"
                            />
                            <Select
                              value={line.workerId ? String(line.workerId) : "none"}
                              onValueChange={v => updateLine(line.tempId, { workerId: v === "none" ? null : parseInt(v) })}
                            >
                              <SelectTrigger className="h-6 text-xs">
                                <SelectValue placeholder="Trabajador" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin asignar</SelectItem>
                                {(workers as any[])
                                  .filter((w: any) => w.department === area || w.department === "various")
                                  .map((w: any) => (
                                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Days */}
                          <Input
                            type="number"
                            value={line.estimatedDays}
                            onChange={e => updateLine(line.tempId, { estimatedDays: e.target.value })}
                            className="h-7 text-xs text-center"
                            min="0" step="0.5"
                            disabled={line.isFixedPrice}
                          />

                          {/* Cost/day */}
                          <Input
                            type="number"
                            value={line.costPerDay}
                            onChange={e => updateLine(line.tempId, { costPerDay: e.target.value })}
                            className="h-7 text-xs text-right"
                            min="0"
                            disabled={line.isFixedPrice}
                          />

                          {/* Sale/day */}
                          <Input
                            type="number"
                            value={line.salePricePerDay}
                            onChange={e => updateLine(line.tempId, { salePricePerDay: e.target.value })}
                            className="h-7 text-xs text-right"
                            min="0"
                            disabled={line.isFixedPrice}
                          />

                          {/* Line cost */}
                          <span className="text-xs text-right text-muted-foreground font-mono">
                            {fmtCurrency(line.lineCost)}
                          </span>

                          {/* Line sale */}
                          <span className="text-xs text-right font-semibold font-mono">
                            {fmtCurrency(line.lineSale)}
                          </span>

                          {/* Remove */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeLine(line.tempId)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Notes */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Notas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Notas para el cliente</Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Condiciones, plazos, alcance..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notas internas</Label>
                  <Textarea
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    placeholder="Notas solo visibles en PDF interno..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: summary panel */}
          <div className="space-y-4">
            {/* Margin indicator */}
            <Card className="border-border shadow-sm">
              <CardContent className="p-4">
                <MarginIndicator pct={totals.netMarginPct} />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Resumen económico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Subtotal trabajo</span>
                  <span className="font-medium">{fmtCurrency(totals.subtotalSale)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Gestión ({managementPct}%)</span>
                  <span className="font-medium">{fmtCurrency(totals.managementSale)}</span>
                </div>
                {(commissions as any[]).filter((c: any) => c.isActive).map((c: any) => (
                  <div key={c.id} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">{c.name} ({c.percentage}%)</span>
                    <span className="font-medium text-amber-600">
                      {fmtCurrency(
                        (c.appliesTo === "with_management" ? totals.withMgmtSale : totals.subtotalSale) *
                        (parseFloat(c.percentage) / 100)
                      )}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-b-2 border-border">
                  <span className="font-semibold text-foreground">Total venta</span>
                  <span className="font-bold text-lg">{fmtCurrency(totals.totalSale)}</span>
                </div>
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-muted-foreground">Coste total</span>
                  <span className="text-muted-foreground">{fmtCurrency(totals.totalCost)}</span>
                </div>
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-muted-foreground">Gastos fijos imputados</span>
                  <span className="text-red-500">−{fmtCurrency(totals.totalFixedMonthly)}</span>
                </div>
                <div className="flex justify-between py-1 pt-2 border-t border-border">
                  <span className="font-medium text-foreground">Margen bruto</span>
                  <div className="text-right">
                    <span className="font-semibold">{fmtCurrency(totals.grossMargin)}</span>
                    <span className="text-xs text-muted-foreground ml-1">({totals.grossMarginPct.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-medium text-foreground">Margen neto</span>
                  <div className="text-right">
                    <span className="font-semibold">{fmtCurrency(totals.netMargin)}</span>
                    <span className="text-xs text-muted-foreground ml-1">({totals.netMarginPct.toFixed(1)}%)</span>
                  </div>
                </div>

                {totals.netMarginPct < 20 && totals.totalSale > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mt-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">
                      Margen por debajo del 20%. Revisa las jornadas o ajusta el precio antes de enviar.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Area breakdown */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Desglose por área</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {areaGroups.map(area => {
                  const areaLines = linesByArea(area);
                  const totalH = areaLines.reduce((s, l) => s + parseFloat(l.estimatedDays || "0"), 0);
                  const totalS = areaLines.reduce((s, l) => s + parseFloat(l.lineSale || "0"), 0);
                  if (totalH === 0 && totalS === 0) return null;
                  return (
                    <div key={area} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          area === "seo" ? "bg-purple-500" :
                          area === "design" ? "bg-pink-500" :
                          area === "development" ? "bg-blue-500" : "bg-orange-500"
                        }`} />
                        <span className="text-muted-foreground">{AREA_LABELS[area]}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{fmtCurrency(totalS)}</span>
                        <span className="text-xs text-muted-foreground ml-1">({totalH.toFixed(1)}h)</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Recomendaciones IA
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleGetRecommendations}
                    disabled={llmMutation.isPending}
                  >
                    {llmMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Brain className="w-3 h-3" />
                    )}
                    Analizar
                  </Button>
                </div>
              </CardHeader>
              {showRecommendations && (
                <CardContent>
                  {llmMutation.isPending ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analizando histórico de proyectos...
                    </div>
                  ) : (
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {recommendations}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Save button */}
            <Button
              className="w-full gap-2"
              onClick={() => handleSave("draft")}
              disabled={isSaving}
              style={{ background: "var(--brand-darkest)", color: "white" }}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar presupuesto
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
