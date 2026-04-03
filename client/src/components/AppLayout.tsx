import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  History,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const LOGO_WHITE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663261892722/SzjLakLUrUiNCPMNsaXjoj/logo-tertiary-alt_ba62202d.svg";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/presupuestos/nuevo", label: "Nuevo presupuesto", icon: Plus, highlight: true },
  { href: "/equipo", label: "Equipo y tarifas", icon: Users },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/datos", label: "Panel de datos", icon: Database },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-200 ease-in-out"
        style={{
          width: collapsed ? "64px" : "220px",
          background: "var(--brand-darkest)",
          borderRight: "1px solid oklch(20% 0.04 258)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b" style={{ borderColor: "oklch(20% 0.04 258)" }}>
          {!collapsed && (
            <img src={LOGO_WHITE} alt="Balinot" className="h-6 object-contain" />
          )}
          {collapsed && (
            <div className="w-full flex justify-center">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663261892722/SzjLakLUrUiNCPMNsaXjoj/favicon_6ff5519f.svg" alt="B" className="w-6 h-6 object-contain" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, highlight }) => {
            const isActive = href === "/" ? location === "/" : location.startsWith(href) && href !== "/";
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  highlight
                    ? "text-white/90 hover:text-white hover:bg-white/10"
                    : isActive
                    ? "text-white bg-white/15"
                    : "text-white/55 hover:text-white/90 hover:bg-white/8"
                }`}
                title={collapsed ? label : undefined}
              >
                <Icon
                  className={`flex-shrink-0 transition-colors ${
                    highlight ? "w-4 h-4 text-white/70 group-hover:text-white" :
                    isActive ? "w-4 h-4 text-white" : "w-4 h-4"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate">{label}</span>
                )}
                {!collapsed && highlight && (
                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-white/20 text-white/80">+</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
