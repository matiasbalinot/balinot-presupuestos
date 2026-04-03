import AppLayout from "@/components/AppLayout";
import { MarginBadge, MarginIndicator } from "@/components/MarginBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Brain,
  Building2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

type Area = "seo" | "design" | "development" | "various" | "branding" | "management" | "commission" | "fixed";

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
  branding: "Branding",
  management: "Gestión",
  commission: "Comisión",
  fixed: "Gastos fijos",
};

const AREA_COLORS: Record<Area, string> = {
  seo:         "bg-purple-50 text-purple-700 border-purple-200",
  design:      "bg-pink-50 text-pink-700 border-pink-200",
  development: "bg-blue-50 text-blue-700 border-blue-200",
  various:     "bg-orange-50 text-orange-700 border-orange-200",
  branding:    "bg-emerald-50 text-emerald-700 border-emerald-200",
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
    // Use costPerDay as the actual cost when it's set, otherwise fallback to 60% of fixed price
    const cost = parseFloat(line.costPerDay);
    const actualCost = !isNaN(cost) && cost > 0 ? cost : fp * 0.6;
    return { ...line, lineCost: fmt(actualCost), lineSale: fmt(fp) };
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
  const { data: existingBudget } = trpc.budgets.get.useQuery(
    { id: budgetId! },
    { enabled: !!budgetId }
  );

  // Holded contact search
  const [holdedSearchQuery, setHoldedSearchQuery] = useState("");
  const [holdedSearchOpen, setHoldedSearchOpen] = useState(false);
  const [holdedDebouncedQuery, setHoldedDebouncedQuery] = useState("");
  const holdedDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: holdedContacts = [], isFetching: isSearchingHolded } = trpc.holded.searchContacts.useQuery(
    { query: holdedDebouncedQuery },
    { enabled: holdedDebouncedQuery.length >= 2 }
  );
  const createContactMutation = trpc.holded.createContact.useMutation();

  // Holded services
  const { data: holdedServices = [] } = trpc.holded.listServices.useQuery();

  const handleHoldedSearchChange = (val: string) => {
    setHoldedSearchQuery(val);
    if (holdedDebounceRef.current) clearTimeout(holdedDebounceRef.current);
    holdedDebounceRef.current = setTimeout(() => setHoldedDebouncedQuery(val), 400);
  };

  const applyHoldedContact = (c: any) => {
    setClientName(c.name ?? "");
    setClientEmail(c.email ?? "");
    setClientNif(c.vatnumber ?? "");
    setClientType(c.type === "person" ? "person" : "company");
    setClientAddress(c.address ?? "");
    setClientCity(c.city ?? "");
    setClientPostalCode(c.postalCode ?? "");
    setClientProvince(c.province ?? "");
    setClientCountry(c.country ?? "España");
    // Móvil preferente, si no hay móvil usar teléfono
    setClientPhone(c.mobile || c.phone || "");
    setClientWebsite(c.website ?? "");
    setHoldedContactId(c.id ?? "");
    setHoldedSearchOpen(false);
    setHoldedSearchQuery("");
    setHoldedDebouncedQuery("");
    toast.success(`Cliente "${c.name}" cargado desde Holded`);
  };

  // Form state
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [clientType, setClientType] = useState<"company" | "person">("company");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientPostalCode, setClientPostalCode] = useState("");
  const [clientProvince, setClientProvince] = useState("");
  const [clientCountry, setClientCountry] = useState("España");
  const [clientPhone, setClientPhone] = useState("");
  const [clientWebsite, setClientWebsite] = useState("");
  const [projectTypeId, setProjectTypeId] = useState<number | null>(null);
  const [managementPct, setManagementPct] = useState("40");
  const [commissionType, setCommissionType] = useState<"none" | "luis" | "commercial">("none");
  const [commissionPct, setCommissionPct] = useState("10");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showHoldedModal, setShowHoldedModal] = useState(false);
  const [holdedContactId, setHoldedContactId] = useState("");
  const [holdedServiceId, setHoldedServiceId] = useState("");
  const [holdedServiceName, setHoldedServiceName] = useState("");
  const [holdedServiceDesc, setHoldedServiceDesc] = useState("");
  const [holdedServicePrice, setHoldedServicePrice] = useState("");
  const [taxKey, setTaxKey] = useState("s_iva_21");
  const [taxRate, setTaxRate] = useState("21");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load existing budget
  useEffect(() => {
    if (existingBudget) {
      setProjectName(existingBudget.projectName);
      setClientName(existingBudget.clientName);
      setClientEmail(existingBudget.clientEmail ?? "");
      setClientNif((existingBudget as any).clientNif ?? "");
      setClientType((existingBudget as any).clientType ?? "company");
      setClientAddress((existingBudget as any).clientAddress ?? "");
      setClientCity((existingBudget as any).clientCity ?? "");
      setClientPostalCode((existingBudget as any).clientPostalCode ?? "");
      setClientProvince((existingBudget as any).clientProvince ?? "");
      setClientCountry((existingBudget as any).clientCountry ?? "España");
      setClientPhone((existingBudget as any).clientPhone ?? "");
      setClientWebsite((existingBudget as any).clientWebsite ?? "");
      setHoldedContactId((existingBudget as any).holdedContactId ?? "");
      setHoldedServiceId((existingBudget as any).holdedServiceId ?? "");
      setHoldedServiceName((existingBudget as any).holdedServiceName ?? "");
      setHoldedServiceDesc((existingBudget as any).holdedServiceDesc ?? "");
      setHoldedServicePrice((existingBudget as any).holdedServicePrice ?? "");
      setTaxKey((existingBudget as any).taxKey ?? "s_iva_21");
      setTaxRate((existingBudget as any).taxRate ?? "21");
      setProjectTypeId(existingBudget.projectTypeId ?? null);
      setManagementPct(existingBudget.managementPct ?? "40");
      setCommissionType((existingBudget as any).commissionType ?? "none");
      setCommissionPct((existingBudget as any).commissionPct ?? "10");
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
    if (area === "branding") {
      // Branding is a fixed-price service (not per-worker)
      const newLine: BudgetLine = calcLine({
        tempId: uid(), workerId: null, area,
        description: "Branding",
        estimatedDays: "1",
        costPerDay: "1300",
        salePricePerDay: "2500",
        lineCost: "0", lineSale: "0",
        isFixedPrice: true,
        fixedPrice: "2500",
        sortOrder: lines.length,
      });
      setLines([...lines, newLine]);
      return;
    }
    const areaWorkers = workers.filter((w: any) => {
      if (area === "seo") return w.department === "seo";
      if (area === "design") return w.department === "design";
      if (area === "development") return w.department === "development" || w.department === "external";
      if (area === "various") return !w.isExternal;
      return false;
    });
    const w = areaWorkers[0];
    const newLine: BudgetLine = calcLine({
      tempId: uid(), workerId: w?.id ?? null, area,
      description: `${AREA_LABELS[area]}${w ? ` — ${w.name}` : ""}`,
      estimatedDays: "0",
      costPerDay: String(w?.costPerDay ?? "0"),
      salePricePerDay: String(w?.salePricePerDay ?? "0"),
      lineCost: "0", lineSale: "0",
      isFixedPrice: false, fixedPrice: "0",
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

    // Commission (per-budget: none / luis / commercial)
    const commPct = parseFloat(commissionPct) / 100;
    const commissionAmount = commissionType !== "none" ? withMgmtSale * commPct : 0;

    // Fixed costs allocation
    const totalFixedMonthly = (fixedCosts as any[]).reduce((s: number, fc: any) => {
      return s + parseFloat(fc.monthlyAmount) * (parseFloat(fc.projectAllocationPct) / 100);
    }, 0);

    const totalSale = withMgmtSale + commissionAmount;
    // Commission is a cost (paid to the commercial), so it reduces the margin
    const totalCost = withMgmtCost + commissionAmount + totalFixedMonthly;
    const grossMargin = totalSale - withMgmtCost - commissionAmount;
    const grossMarginPct = totalSale > 0 ? (grossMargin / totalSale) * 100 : 0;
    const netMargin = totalSale - totalCost;
    const netMarginPct = totalSale > 0 ? (netMargin / totalSale) * 100 : 0;

    // Coste personal = coste del trabajo + coste de gestión
    const costPersonal = withMgmtCost;
    // Coste comercial = comisión
    const costComercial = commissionAmount;
    // Coste gastos fijos
    const costGastosFijos = totalFixedMonthly;

    return {
      subtotalCost, subtotalSale,
      managementCost, managementSale,
      withMgmtCost, withMgmtSale,
      commissionAmount, totalFixedMonthly,
      costPersonal, costComercial, costGastosFijos,
      totalCost, totalSale,
      grossMargin, grossMarginPct,
      netMargin, netMarginPct,
    };
  }, [lines, managementPct, commissionType, commissionPct, fixedCosts]);

  // Mutations
  const saveMutation = trpc.budgets.save.useMutation();
  const sendEstimateMutation = trpc.holded.sendEstimate.useMutation();
  const notifyMutation = trpc.system.notifyOwner.useMutation();
  const llmMutation = trpc.llm.recommend.useMutation();
  const deleteMutation = trpc.budgets.delete.useMutation({
    onSuccess: () => {
      toast.success("Presupuesto eliminado");
      navigate("/presupuestos");
    },
    onError: () => toast.error("Error al eliminar el presupuesto"),
  });
  const [isSendingToHolded, setIsSendingToHolded] = useState(false);

  const handleSave = async (status?: "draft" | "sent") => {
    if (!projectName.trim() || !clientName.trim()) {
      toast.error("El nombre del proyecto y del cliente son obligatorios");
      return;
    }
    setIsSaving(true);
    try {
      // Si no hay contacto Holded vinculado, intentar crearlo
      let resolvedHoldedContactId = holdedContactId;
      if (!resolvedHoldedContactId && clientName.trim()) {
        try {
          const created = await createContactMutation.mutateAsync({
            name: clientName.trim(),
            email: clientEmail || undefined,
            vatnumber: clientNif || undefined,
            type: clientType,
            address: clientAddress || undefined,
            city: clientCity || undefined,
            postalCode: clientPostalCode || undefined,
            province: clientProvince || undefined,
            country: clientCountry || undefined,
            mobile: clientPhone || undefined,
            website: clientWebsite || undefined,
          });
          if (created.id) {
            resolvedHoldedContactId = created.id;
            setHoldedContactId(created.id);
            toast.success(`Cliente creado en Holded`);
          }
        } catch {
          // No bloquear el guardado si Holded falla
        }
      }

      const result = await saveMutation.mutateAsync({
        id: budgetId ?? undefined,
        projectName, clientName, clientEmail,
        clientNif: clientNif || undefined,
        clientType,
        clientAddress: clientAddress || undefined,
        clientCity: clientCity || undefined,
        clientPostalCode: clientPostalCode || undefined,
        clientProvince: clientProvince || undefined,
        clientCountry: clientCountry || undefined,
        clientPhone: clientPhone || undefined,
        clientWebsite: clientWebsite || undefined,
        projectTypeId,
        managementPct,
        commissionType,
        commissionPct,
        commissionAmount: fmt(totals.commissionAmount),
        status: status ?? "draft",
        totalCost: fmt(totals.totalCost),
        totalSale: fmt(totals.totalSale),
        grossMargin: fmt(totals.grossMargin),
        grossMarginPct: fmt(totals.grossMarginPct),
        fixedCostsAmount: fmt(totals.totalFixedMonthly),
        netMargin: fmt(totals.netMargin),
        netMarginPct: fmt(totals.netMarginPct),
        notes, internalNotes,
        holdedContactId: resolvedHoldedContactId || undefined,
        taxKey: taxKey || undefined,
        taxRate: taxRate || undefined,
        holdedServiceId: holdedServiceId || undefined,
        holdedServiceName: holdedServiceName || undefined,
        holdedServiceDesc: holdedServiceDesc || undefined,
        holdedServicePrice: holdedServicePrice || undefined,
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
      return result;
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendToHolded = async () => {
    setIsSendingToHolded(true);
    try {
      // Primero guardar con status sent
      const saved = await handleSave("sent");
      if (!saved) return;

      const savedBudgetId = budgetId ?? saved.id;
      if (!savedBudgetId) {
        toast.error("Error: no se pudo obtener el ID del presupuesto");
        return;
      }

      // Enviar estimate a Holded
      const result = await sendEstimateMutation.mutateAsync({
        budgetId: savedBudgetId,
        contactId: holdedContactId || undefined,
        contactName: clientName,
        contactEmail: clientEmail || undefined,
      });

      if (result.success) {
        toast.success("Presupuesto enviado a Holded correctamente");
        // Notificar al owner
        try {
          await notifyMutation.mutateAsync({
            title: `Presupuesto enviado a Holded`,
            content: `El presupuesto "${projectName}" para ${clientName} ha sido enviado a Holded como estimate. ID: ${result.holdedDocumentId ?? "N/A"}`,
          });
        } catch {
          // No bloquear si la notificación falla
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error al enviar a Holded");
    } finally {
      setIsSendingToHolded(false);
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

  const handleDownloadPdf = (version: "client" | "internal") => {
    if (!budgetId) {
      toast.error("Guarda el presupuesto primero");
      return;
    }
    // window.open envía las cookies automáticamente (a diferencia de fetch)
    window.open(`/api/pdf/${budgetId}?version=${version}`, "_blank");
  };

  const areaGroups: Area[] = ["seo", "design", "development", "branding", "various"];
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
              onClick={handleSendToHolded}
              disabled={isSaving || isSendingToHolded}
              className="gap-1.5"
              style={{ background: "var(--brand-darkest)", color: "white" }}
            >
              {isSendingToHolded ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Enviar a Holded
            </Button>
            {!isNew && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </Button>
            )}
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
                {/* Client block — full width */}
                <div className="sm:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Datos del cliente</Label>
                    <Popover open={holdedSearchOpen} onOpenChange={setHoldedSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                          <Search className="w-3 h-3" />
                          Buscar en Holded
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="end">
                        <Command>
                          <CommandInput
                            placeholder="Buscar cliente..."
                            value={holdedSearchQuery}
                            onValueChange={handleHoldedSearchChange}
                          />
                          <CommandList>
                            {isSearchingHolded && (
                              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                              </div>
                            )}
                            {!isSearchingHolded && holdedDebouncedQuery.length >= 2 && holdedContacts.length === 0 && (
                              <CommandEmpty>No se encontraron contactos</CommandEmpty>
                            )}
                            {holdedContacts.length > 0 && (
                              <CommandGroup heading="Contactos en Holded">
                                {holdedContacts.map((c: any) => (
                                  <CommandItem
                                    key={c.id}
                                    value={c.name}
                                    onSelect={() => applyHoldedContact(c)}
                                    className="gap-2"
                                  >
                                    {c.type === "person" ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                    <div>
                                      <p className="text-xs font-medium">{c.name}</p>
                                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {holdedContactId && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">
                      <Building2 className="w-3 h-3" />
                      Vinculado a Holded
                      <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setHoldedContactId("")}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nombre *</Label>
                      <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">NIF / CIF</Label>
                      <Input value={clientNif} onChange={e => setClientNif(e.target.value)} placeholder="B12345678" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={clientType} onValueChange={v => setClientType(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company"><span className="flex items-center gap-1.5"><Building2 className="w-3 h-3" />Empresa</span></SelectItem>
                          <SelectItem value="person"><span className="flex items-center gap-1.5"><User className="w-3 h-3" />Persona</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@empresa.com" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Dirección</Label>
                      <Input value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Calle, número, piso..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Población</Label>
                      <Input value={clientCity} onChange={e => setClientCity(e.target.value)} placeholder="Valencia" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Código postal</Label>
                      <Input value={clientPostalCode} onChange={e => setClientPostalCode(e.target.value)} placeholder="46001" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Provincia</Label>
                      <Input value={clientProvince} onChange={e => setClientProvince(e.target.value)} placeholder="Valencia" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">País</Label>
                      <Input value={clientCountry} onChange={e => setClientCountry(e.target.value)} placeholder="España" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Móvil</Label>
                      <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+34 600 000 000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Website</Label>
                      <Input value={clientWebsite} onChange={e => setClientWebsite(e.target.value)} placeholder="https://empresa.com" />
                    </div>
                  </div>
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Comisión comercial</Label>
                  <div className="flex items-center gap-2">
                    <Select value={commissionType} onValueChange={v => setCommissionType(v as any)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin comisión</SelectItem>
                        <SelectItem value="luis">Luis</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                    {commissionType !== "none" && (
                      <>
                        <Input
                          type="number"
                          value={commissionPct}
                          onChange={e => setCommissionPct(e.target.value)}
                          className="w-20"
                          min="0" max="100" step="1"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                        <span className="text-xs text-muted-foreground font-medium text-amber-600">
                          {fmtCurrency(totals.commissionAmount)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de impuesto</Label>
                  <Select value={taxKey} onValueChange={v => {
                    setTaxKey(v);
                    const rates: Record<string, string> = {
                      s_iva_21: "21", s_iva_10: "10", s_iva_75: "7.5", s_iva_5: "5",
                      s_iva_4: "4", s_iva_2: "2", s_iva_0: "0",
                      s_iva_exento: "0", s_iva_nosujeto: "0",
                      s_iva_intrab: "0", s_iva_intras: "0",
                      s_iva_export: "0", s_iva_invsuj: "0",
                    };
                    setTaxRate(rates[v] ?? "21");
                  }}>
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="s_iva_21">IVA 21%</SelectItem>
                      <SelectItem value="s_iva_10">IVA 10%</SelectItem>
                      <SelectItem value="s_iva_75">IVA 7,5%</SelectItem>
                      <SelectItem value="s_iva_5">IVA 5%</SelectItem>
                      <SelectItem value="s_iva_4">IVA 4%</SelectItem>
                      <SelectItem value="s_iva_2">IVA 2%</SelectItem>
                      <SelectItem value="s_iva_0">IVA 0%</SelectItem>
                      <SelectItem value="s_iva_exento">Exenta</SelectItem>
                      <SelectItem value="s_iva_nosujeto">No sujeto</SelectItem>
                      <SelectItem value="s_iva_intrab">Intracomunitario Bienes</SelectItem>
                      <SelectItem value="s_iva_intras">Intracomunitario Servicio</SelectItem>
                      <SelectItem value="s_iva_export">Exportaci\u00f3n</SelectItem>
                      <SelectItem value="s_iva_invsuj">Inv. Suj. Pasivo</SelectItem>
                    </SelectContent>
                  </Select>
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
                      {area === "branding" ? (
                        <div className="grid grid-cols-[1fr_120px_120px_32px] gap-2 px-1">
                          <span className="text-xs text-muted-foreground">Descripción del servicio</span>
                          <span className="text-xs text-muted-foreground text-right">Coste</span>
                          <span className="text-xs text-muted-foreground text-right">Precio venta</span>
                          <span />
                        </div>
                      ) : (
                        <div className="grid grid-cols-[1fr_100px_80px_80px_80px_80px_32px] gap-2 px-1">
                          <span className="text-xs text-muted-foreground">Descripción / Trabajador</span>
                          <span className="text-xs text-muted-foreground text-center">Jornadas</span>
                          <span className="text-xs text-muted-foreground text-right">€/j coste</span>
                          <span className="text-xs text-muted-foreground text-right">€/j venta</span>
                          <span className="text-xs text-muted-foreground text-right">Coste</span>
                          <span className="text-xs text-muted-foreground text-right">Venta</span>
                          <span />
                        </div>
                      )}

                      {linesByArea(area).map(line => (
                        area === "branding" ? (
                          /* Branding row: fixed-price service, no worker selector */
                          <div key={line.tempId} className="grid grid-cols-[1fr_120px_120px_32px] gap-2 items-center bg-muted/20 rounded-lg px-2 py-2">
                            <Input
                              value={line.description}
                              onChange={e => updateLine(line.tempId, { description: e.target.value })}
                              className="h-7 text-xs"
                              placeholder="Descripción del servicio"
                            />
                            <Input
                              type="number"
                              value={line.costPerDay}
                              onChange={e => updateLine(line.tempId, { costPerDay: e.target.value })}
                              className="h-7 text-xs text-right"
                              min="0"
                              placeholder="Coste"
                            />
                            <Input
                              type="number"
                              value={line.fixedPrice}
                              onChange={e => updateLine(line.tempId, { fixedPrice: e.target.value })}
                              className="h-7 text-xs text-right"
                              min="0"
                              placeholder="Precio venta"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLine(line.tempId)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          /* Standard row: days-based with worker selector */
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
                                    .filter((w: any) => {
                                      if (area === "various") return !w.isExternal;
                                      if (area === "development") return w.department === "development" || w.department === "external";
                                      return w.department === area;
                                    })
                                    .map((w: any) => (
                                      <SelectItem key={w.id} value={String(w.id)}>
                                        {w.department === "external" ? `${w.name} (ext.)` : w.name}
                                      </SelectItem>
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
                            />
                            {/* Cost/day */}
                            <Input
                              type="number"
                              value={line.costPerDay}
                              onChange={e => updateLine(line.tempId, { costPerDay: e.target.value })}
                              className="h-7 text-xs text-right"
                              min="0"
                            />
                            {/* Sale/day */}
                            <Input
                              type="number"
                              value={line.salePricePerDay}
                              onChange={e => updateLine(line.tempId, { salePricePerDay: e.target.value })}
                              className="h-7 text-xs text-right"
                              min="0"
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
                        )
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Servicio Holded */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-teal-50 text-teal-700 border-teal-200">
                      Servicio
                    </span>
                    <span className="text-muted-foreground font-normal">Servicio para el cliente (Holded)</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Seleccionar servicio de Holded</Label>
                  <Select
                    value={holdedServiceId}
                    onValueChange={(val) => {
                      const svc = (holdedServices as any[]).find((s: any) => s.id === val);
                      if (svc) {
                        setHoldedServiceId(svc.id);
                        setHoldedServiceName(svc.name);
                        setHoldedServiceDesc(svc.desc ?? "");
                        setHoldedServicePrice(String(svc.price ?? 0));
                        toast.success(`Servicio "${svc.name}" seleccionado`);
                      }
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecciona un servicio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(holdedServices as any[]).map((svc: any) => (
                        <SelectItem key={svc.id} value={svc.id}>
                          {svc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {holdedServiceId && (
                  <div className="space-y-3 rounded-md border border-teal-200 bg-teal-50/30 p-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nombre del servicio</Label>
                      <Input
                        value={holdedServiceName}
                        onChange={e => setHoldedServiceName(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Descripción (visible para el cliente)</Label>
                      <Textarea
                        value={holdedServiceDesc}
                        onChange={e => setHoldedServiceDesc(e.target.value)}
                        placeholder="Descripción del servicio que verá el cliente..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Precio base (Holded)</Label>
                        <Input
                          value={holdedServicePrice}
                          onChange={e => setHoldedServicePrice(e.target.value)}
                          className="text-sm"
                          type="number"
                          step="0.01"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Precio total presupuesto</Label>
                        <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm font-semibold">
                          {fmtCurrency(totals.totalSale)}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Se enviará este precio a Holded</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
              <CardContent className="space-y-0 text-sm">
                {/* ── VENTA ── */}
                <div className="mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Venta</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Subtotal trabajo</span>
                  <span className="font-medium">{fmtCurrency(totals.subtotalSale)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Gestión ({managementPct}%)</span>
                  <span className="font-medium">{fmtCurrency(totals.managementSale)}</span>
                </div>
                {commissionType !== "none" && (
                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">
                      Comisión {commissionType === "luis" ? "Luis" : "Comercial"} ({commissionPct}%)
                    </span>
                    <span className="font-medium">{fmtCurrency(totals.commissionAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 bg-muted/30 px-2 rounded-md mt-1">
                  <span className="font-semibold text-foreground">Total venta (base imponible)</span>
                  <span className="font-bold text-lg">{fmtCurrency(totals.totalSale)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">{taxKey === "s_iva_exento" ? "Exenta" : taxKey === "s_iva_nosujeto" ? "No sujeto" : `IVA ${taxRate}%`}</span>
                  <span className="font-medium">{fmtCurrency(totals.totalSale * parseFloat(taxRate) / 100)}</span>
                </div>
                <div className="flex justify-between py-2 bg-primary/10 px-2 rounded-md mt-1 mb-4">
                  <span className="font-semibold text-foreground">Total con impuestos</span>
                  <span className="font-bold text-lg">{fmtCurrency(totals.totalSale * (1 + parseFloat(taxRate) / 100))}</span>
                </div>

                {/* ── GASTOS ── */}
                <div className="mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gastos</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Coste personal</span>
                  <span className="font-medium">{fmtCurrency(totals.costPersonal)}</span>
                </div>
                {totals.costComercial > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">Coste comercial</span>
                    <span className="font-medium">{fmtCurrency(totals.costComercial)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Coste gastos fijos</span>
                  <span className="font-medium">{fmtCurrency(totals.costGastosFijos)}</span>
                </div>
                <div className="flex justify-between py-2 bg-muted/30 px-2 rounded-md mt-1 mb-3">
                  <span className="font-semibold text-foreground">Coste total</span>
                  <span className="font-bold">{fmtCurrency(totals.totalCost)}</span>
                </div>

                {/* ── MÁRGENES ── */}
                <div className="border-t-2 border-border pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">Margen bruto</span>
                    <div className="text-right">
                      <span className="font-semibold">{fmtCurrency(totals.grossMargin)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({totals.grossMarginPct.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">Margen neto</span>
                    <div className="text-right">
                      <span className={`font-semibold ${totals.netMarginPct < 20 && totals.totalSale > 0 ? "text-red-600" : "text-green-600"}`}>{fmtCurrency(totals.netMargin)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({totals.netMarginPct.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>

                {totals.netMarginPct < 20 && totals.totalSale > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mt-3">
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
                        <span className="text-xs text-muted-foreground ml-1">({totalH.toFixed(1)}j)</span>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar presupuesto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar el presupuesto <strong>{projectName || existingBudget?.projectName}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => budgetId && deleteMutation.mutate({ id: budgetId })}
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
