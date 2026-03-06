import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { VisaoMensal } from "./pages/VisaoMensal";
import { GastosPorCategoria } from "./pages/GastosPorCategoria";
import { Transacoes } from "./pages/Transacoes";
import { Contas } from "./pages/Contas";

export function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/visao-mensal" replace />} />
        <Route path="/visao-mensal" element={<VisaoMensal />} />
        <Route path="/gastos-por-categoria" element={<GastosPorCategoria />} />
        <Route path="/transacoes" element={<Transacoes />} />
        <Route path="/contas" element={<Contas />} />
      </Route>
    </Routes>
  );
}
