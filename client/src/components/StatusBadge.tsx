import { cn } from "@/lib/utils";

type Status = "draft" | "sent" | "accepted" | "rejected";

const STATUS_CONFIG: Record<Status, { label: string; classes: string }> = {
  draft:    { label: "Borrador",  classes: "bg-gray-100 text-gray-600 border-gray-200" },
  sent:     { label: "Enviado",   classes: "bg-blue-50 text-blue-700 border-blue-200" },
  accepted: { label: "Aceptado",  classes: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rechazado", classes: "bg-red-50 text-red-700 border-red-200" },
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
