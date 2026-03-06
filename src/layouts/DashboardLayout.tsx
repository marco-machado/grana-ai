import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  PieChart,
  List,
  Wallet,
} from "lucide-react";

const navItems = [
  { to: "/visao-mensal", label: "Visão Mensal", icon: BarChart3 },
  { to: "/gastos-por-categoria", label: "Categorias", icon: PieChart },
  { to: "/transacoes", label: "Transações", icon: List },
  { to: "/contas", label: "Contas", icon: Wallet },
];

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-card flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-foreground">Grana AI</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto px-4 md:px-8 py-6 pb-20 md:pb-6">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-card/95 backdrop-blur-sm flex items-center justify-around z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
