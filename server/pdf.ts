import puppeteer from "puppeteer-core";

const LOGO_DARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663261892722/SzjLakLUrUiNCPMNsaXjoj/logo-primary_83b11035.svg";

function fmtCurrency(n: number | string): string {
  const v = parseFloat(String(n ?? 0));
  if (isNaN(v)) return "0,00 €";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));
}

function getMarginColor(pct: number): string {
  if (pct >= 35) return "#16a34a";
  if (pct >= 20) return "#d97706";
  return "#dc2626";
}

function getMarginBg(pct: number): string {
  if (pct >= 35) return "#f0fdf4";
  if (pct >= 20) return "#fffbeb";
  return "#fef2f2";
}

const AREA_LABELS: Record<string, string> = {
  seo: "SEO",
  design: "Diseño",
  development: "Desarrollo",
  branding: "Branding",
  various: "Varios",
  management: "Gestión",
  commission: "Comisión",
  fixed: "Gastos fijos",
};

interface PdfBudget {
  budgetNumber: string;
  projectName: string;
  clientName: string;
  clientEmail?: string;
  createdAt: Date | string;
  notes?: string;
  internalNotes?: string;
  totalSale: string | number;
  totalCost: string | number;
  grossMargin: string | number;
  grossMarginPct: string | number;
  netMargin: string | number;
  netMarginPct: string | number;
  fixedCostsAmount: string | number;
  managementPct: string | number;
  holdedServiceName?: string | null;
  holdedServiceDesc?: string | null;
  holdedServicePrice?: string | number | null;
  lines: Array<{
    area: string;
    description: string;
    estimatedDays: string | number;
    salePricePerDay: string | number;
    costPerDay: string | number;
    lineSale: string | number;
    lineCost: string | number;
    isFixedPrice?: boolean;
    fixedPrice?: string | number;
  }>;
  commissions?: Array<{ name: string; percentage: string | number; amount: string | number }>;
}

function buildHtml(budget: PdfBudget, version: "client" | "internal"): string {
  const netPct = parseFloat(String(budget.netMarginPct));
  const grossPct = parseFloat(String(budget.grossMarginPct));

  const workLines = budget.lines.filter(l => !["management", "commission", "fixed"].includes(l.area));
  const subtotalSale = workLines.reduce((s, l) => s + parseFloat(String(l.lineSale ?? 0)), 0);
  const mgmtPct = parseFloat(String(budget.managementPct ?? 40));
  const mgmtSale = subtotalSale * (mgmtPct / 100);

  // Para versión cliente: si hay servicio Holded, mostrar solo el servicio (sin desglose interno)
  const hasService = version === "client" && budget.holdedServiceName;
  const clientServiceHtml = hasService ? `
    <tr>
      <td style="padding: 12px; font-size: 13px; color: #323750; font-weight: 500;">${budget.holdedServiceName}</td>
      <td colspan="2" style="padding: 12px; font-size: 12px; color: #707385;">${budget.holdedServiceDesc ?? ""}</td>
      <td style="padding: 12px; font-size: 13px; font-weight: 700; color: #080e2c; text-align: right;">${fmtCurrency(budget.totalSale)}</td>
    </tr>
  ` : "";

  // Group lines by area (para versión interna o si no hay servicio)
  const areaOrder = ["seo", "design", "development", "branding", "various"];
  const linesByArea: Record<string, typeof workLines> = {};
  for (const area of areaOrder) {
    linesByArea[area] = workLines.filter(l => l.area === area);
  }

  const linesHtml = hasService ? clientServiceHtml : areaOrder.map(area => {
    const areaLines = linesByArea[area];
    if (!areaLines || areaLines.length === 0) return "";
    const areaTotal = areaLines.reduce((s, l) => s + parseFloat(String(l.lineSale ?? 0)), 0);
    const areaHours = areaLines.reduce((s, l) => s + parseFloat(String(l.estimatedDays ?? 0)), 0);

    const areaColors: Record<string, string> = {
      seo: "#7c3aed", design: "#db2777", development: "#2563eb", branding: "#0d9488", various: "#ea580c"
    };

    return `
      <tr class="area-header">
        <td colspan="4" style="padding: 8px 12px; background: #f8f9fb; border-top: 2px solid #e6e7ea;">
          <span style="font-size: 11px; font-weight: 600; color: ${areaColors[area] ?? "#323750"}; text-transform: uppercase; letter-spacing: 0.05em;">
            ${AREA_LABELS[area]}
          </span>
        </td>
      </tr>
      ${areaLines.map(l => `
        <tr>
          <td style="padding: 8px 12px; font-size: 12px; color: #323750;">${l.description}</td>
          <td style="padding: 8px 12px; font-size: 12px; color: #707385; text-align: center;">${l.isFixedPrice ? "—" : parseFloat(String(l.estimatedDays)).toFixed(1) + "j"}</td>
          <td style="padding: 8px 12px; font-size: 12px; color: #707385; text-align: right;">${l.isFixedPrice ? "Precio cerrado" : fmtCurrency(l.salePricePerDay) + "/j"}</td>
          <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #080e2c; text-align: right;">${fmtCurrency(l.lineSale)}</td>
        </tr>
      `).join("")}
      <tr style="background: #fafbfc;">
        <td colspan="2" style="padding: 6px 12px; font-size: 11px; color: #9a9ca8; font-style: italic;">Subtotal ${AREA_LABELS[area]}</td>
        <td style="padding: 6px 12px; font-size: 11px; color: #9a9ca8; text-align: right;">${areaHours.toFixed(1)}j total</td>
        <td style="padding: 6px 12px; font-size: 12px; font-weight: 600; color: #323750; text-align: right;">${fmtCurrency(areaTotal)}</td>
      </tr>
    `;
  }).join("");

  const internalSection = version === "internal" ? `
    <div class="section" style="margin-top: 24px; border: 1px solid #e6e7ea; border-radius: 8px; overflow: hidden;">
      <div style="background: #080e2c; padding: 10px 16px;">
        <h3 style="margin: 0; font-size: 12px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 0.05em;">Análisis de rentabilidad (interno)</h3>
      </div>
      <div style="padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #707385;">Subtotal trabajo</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600;">${fmtCurrency(subtotalSale)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #707385;">Gestión (${mgmtPct}%)</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 600;">${fmtCurrency(mgmtSale)}</td>
            </tr>
            ${(budget.commissions ?? []).map(c => `
              <tr>
                <td style="padding: 4px 0; color: #707385;">${c.name}</td>
                <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #d97706;">${fmtCurrency(c.amount)}</td>
              </tr>
            `).join("")}
            <tr style="border-top: 2px solid #e6e7ea;">
              <td style="padding: 8px 0 4px; font-weight: 700; color: #080e2c;">Total venta</td>
              <td style="padding: 8px 0 4px; text-align: right; font-weight: 700; font-size: 14px; color: #080e2c;">${fmtCurrency(budget.totalSale)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #707385;">Coste total</td>
              <td style="padding: 4px 0; text-align: right; color: #707385;">${fmtCurrency(budget.totalCost)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #707385;">Gastos fijos imputados</td>
              <td style="padding: 4px 0; text-align: right; color: #dc2626;">−${fmtCurrency(budget.fixedCostsAmount)}</td>
            </tr>
          </table>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="background: #f8f9fb; border-radius: 8px; padding: 12px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 11px; color: #9a9ca8; text-transform: uppercase; letter-spacing: 0.05em;">Margen bruto</p>
            <p style="margin: 0; font-size: 22px; font-weight: 700; color: #080e2c;">${grossPct.toFixed(1)}%</p>
            <p style="margin: 4px 0 0; font-size: 12px; color: #707385;">${fmtCurrency(budget.grossMargin)}</p>
          </div>
          <div style="background: ${getMarginBg(netPct)}; border-radius: 8px; padding: 12px; text-align: center; border: 1px solid ${getMarginColor(netPct)}33;">
            <p style="margin: 0 0 4px; font-size: 11px; color: #9a9ca8; text-transform: uppercase; letter-spacing: 0.05em;">Margen neto</p>
            <p style="margin: 0; font-size: 22px; font-weight: 700; color: ${getMarginColor(netPct)};">${netPct.toFixed(1)}%</p>
            <p style="margin: 4px 0 0; font-size: 12px; color: ${getMarginColor(netPct)};">${fmtCurrency(budget.netMargin)}</p>
          </div>
        </div>
      </div>
      ${budget.internalNotes ? `
        <div style="padding: 12px 16px; border-top: 1px solid #e6e7ea; background: #fffbeb;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #d97706; text-transform: uppercase; letter-spacing: 0.05em;">Notas internas</p>
          <p style="margin: 0; font-size: 12px; color: #323750; white-space: pre-wrap;">${budget.internalNotes}</p>
        </div>
      ` : ""}
    </div>
  ` : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto ${budget.budgetNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; color: #080e2c; background: white; font-size: 13px; line-height: 1.5; }
    .page { padding: 40px 48px; max-width: 800px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; }
    tr:nth-child(even) td { background: #fafbfc; }
    .section { margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e6e7ea;">
      <div>
        <img src="${LOGO_DARK}" alt="Balinot" style="height: 32px; margin-bottom: 16px;" />
        <p style="font-size: 11px; color: #9a9ca8;">Agencia de diseño y desarrollo web</p>
        <p style="font-size: 11px; color: #9a9ca8;">info@balinot.com · balinot.com</p>
      </div>
      <div style="text-align: right;">
        <p style="font-size: 22px; font-weight: 700; color: #080e2c; letter-spacing: -0.02em;">PRESUPUESTO</p>
        <p style="font-size: 14px; font-weight: 600; color: #323750; margin-top: 4px;">${budget.budgetNumber}</p>
        <p style="font-size: 11px; color: #9a9ca8; margin-top: 8px;">Fecha: ${fmtDate(budget.createdAt)}</p>
        ${version === "internal" ? `<p style="font-size: 10px; background: #080e2c; color: white; padding: 2px 8px; border-radius: 4px; margin-top: 6px; display: inline-block;">USO INTERNO</p>` : ""}
      </div>
    </div>

    <!-- Client info -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
      <div>
        <p style="font-size: 10px; font-weight: 600; color: #9a9ca8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">Presupuesto para</p>
        <p style="font-size: 15px; font-weight: 600; color: #080e2c;">${budget.clientName}</p>
        ${budget.clientEmail ? `<p style="font-size: 12px; color: #707385; margin-top: 2px;">${budget.clientEmail}</p>` : ""}
      </div>
      <div>
        <p style="font-size: 10px; font-weight: 600; color: #9a9ca8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">Proyecto</p>
        <p style="font-size: 15px; font-weight: 600; color: #080e2c;">${budget.projectName}</p>
      </div>
    </div>

    <!-- Lines table -->
    <div class="section" style="border: 1px solid #e6e7ea; border-radius: 8px; overflow: hidden;">
      <table>
        <thead>
          <tr style="background: #080e2c;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em;">Descripción</th>
            ${hasService ? `` : `<th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em;">Jornadas</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em;">Tarifa</th>`}
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.05em;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
      <div style="min-width: 280px;">
        <table style="font-size: 13px;">
          ${hasService ? `` : `
          <tr>
            <td style="padding: 4px 12px; color: #707385;">Subtotal trabajo</td>
            <td style="padding: 4px 12px; text-align: right; font-weight: 500;">${fmtCurrency(subtotalSale)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; color: #707385;">Gestión y coordinación (${mgmtPct}%)</td>
            <td style="padding: 4px 12px; text-align: right; font-weight: 500;">${fmtCurrency(mgmtSale)}</td>
          </tr>
          ${(budget.commissions ?? []).map((c: any) => `
            <tr>
              <td style="padding: 4px 12px; color: #707385;">${c.name}</td>
              <td style="padding: 4px 12px; text-align: right; font-weight: 500;">${fmtCurrency(c.amount)}</td>
            </tr>
          `).join("")}
          `}
          <tr style="border-top: 2px solid #080e2c;">
            <td style="padding: 10px 12px; font-weight: 700; font-size: 15px; color: #080e2c;">TOTAL</td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 700; font-size: 18px; color: #080e2c;">${fmtCurrency(budget.totalSale)}</td>
          </tr>
        </table>
      </div>
    </div>

    ${budget.notes ? `
      <!-- Notes -->
      <div class="section" style="margin-top: 32px; padding: 16px; background: #f8f9fb; border-radius: 8px; border-left: 3px solid #080e2c;">
        <p style="font-size: 11px; font-weight: 600; color: #9a9ca8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Notas y condiciones</p>
        <p style="font-size: 12px; color: #323750; white-space: pre-wrap; line-height: 1.6;">${budget.notes}</p>
      </div>
    ` : ""}

    ${internalSection}

    <!-- Footer -->
    <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e6e7ea; display: flex; justify-content: space-between; align-items: center;">
      <p style="font-size: 10px; color: #9a9ca8;">Balinot · balinot.com · info@balinot.com</p>
      <p style="font-size: 10px; color: #9a9ca8;">Presupuesto válido por 30 días</p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function generateBudgetPdf(budget: PdfBudget, version: "client" | "internal"): Promise<Buffer> {
  const html = buildHtml(budget, version);

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
