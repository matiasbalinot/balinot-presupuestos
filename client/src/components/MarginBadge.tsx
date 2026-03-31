import { cn } from "@/lib/utils";

interface MarginBadgeProps {
  pct: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function getMarginColor(pct: number): "green" | "yellow" | "red" {
  if (pct >= 35) return "green";
  if (pct >= 20) return "yellow";
  return "red";
}

export function getMarginLabel(pct: number): string {
  if (pct >= 35) return "Rentable";
  if (pct >= 20) return "Ajustado";
  return "Bajo margen";
}

export function MarginBadge({ pct, showLabel = true, size = "md", className }: MarginBadgeProps) {
  const color = getMarginColor(pct);

  const colorClasses = {
    green:  "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red:    "bg-red-50 text-red-700 border-red-200",
  };

  const dotColors = {
    green:  "bg-green-500",
    yellow: "bg-amber-500",
    red:    "bg-red-500",
  };

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        colorClasses[color],
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[color])} />
      {pct.toFixed(1)}%
      {showLabel && <span className="opacity-70">— {getMarginLabel(pct)}</span>}
    </span>
  );
}

export function MarginIndicator({ pct }: { pct: number }) {
  const color = getMarginColor(pct);
  const colors = {
    green:  { bar: "#22c55e", bg: "#f0fdf4", text: "#15803d" },
    yellow: { bar: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
    red:    { bar: "#ef4444", bg: "#fef2f2", text: "#b91c1c" },
  };
  const c = colors[color];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Margen neto</span>
        <span className="text-sm font-semibold" style={{ color: c.text }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: c.bg }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: c.bar }}
        />
      </div>
      <p className="text-xs" style={{ color: c.text }}>
        {pct >= 35 ? "Excelente rentabilidad" : pct >= 20 ? "Margen ajustado — revisa horas" : "⚠ Margen bajo — requiere revisión"}
      </p>
    </div>
  );
}
