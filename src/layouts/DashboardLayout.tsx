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
      <aside className="w-64 border-r border-border flex flex-col">
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
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
