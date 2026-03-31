import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  History,
  LogOut,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const LOGO_PRIMARY = "https://d2xsxph8kpxj0f.cloudfront.net/310519663261892722/SzjLakLUrUiNCPMNsaXjoj/logo-primary_83b11035.svg";
const LOGO_TERTIARY = "https://d2xsxph8kpxj0f.cloudfront.net/310519663261892722/SzjLakLUrUiNCPMNsaXjoj/logo-tertiary_c8782519.svg";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/presupuestos/nuevo", label: "Nuevo presupuesto", icon: Plus, highlight: true },
  { href: "/equipo", label: "Equipo y tarifas", icon: Users },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--brand-lightest)" }}>
        <div className="flex flex-col items-center gap-4">
          <img src={LOGO_PRIMARY} alt="Balinot" className="h-8 opacity-60 animate-pulse" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--brand-lightest)" }}>
        <div className="flex flex-col items-center gap-6 p-8 bg-card rounded-xl shadow-lg border border-border max-w-sm w-full mx-4">
          <img src={LOGO_PRIMARY} alt="Balinot" className="h-10" />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Calculadora de presupuestos</h1>
            <p className="text-sm text-muted-foreground mt-1">Accede con tu cuenta de Balinot</p>
          </div>
          <a
            href={getLoginUrl()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "var(--brand-darkest)" }}
          >
            Iniciar sesión
          </a>
        </div>
      </div>
    );
  }

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
            <img src={LOGO_TERTIARY} alt="Balinot" className="h-6 object-contain" />
          )}
          {collapsed && (
            <div className="w-full flex justify-center">
              <Building2 className="w-5 h-5 text-white/60" />
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

        {/* User footer */}
        <div className="px-2 pb-4 border-t pt-4" style={{ borderColor: "oklch(20% 0.04 258)" }}>
          {!collapsed && user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-xs font-medium text-white/80 truncate">{user.name ?? user.email ?? "Usuario"}</p>
              {user.role === "admin" && (
                <span className="text-xs text-white/40">Superadmin</span>
              )}
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-white/40 hover:text-white/80 hover:bg-white/8 transition-colors"
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
