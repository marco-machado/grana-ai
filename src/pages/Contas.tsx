import {
  Wallet,
  PiggyBank,
  CreditCard,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import type { AccountType } from "@/types/database";

const accountTypeLabels: Record<AccountType, string> = {
  checking: "Conta Corrente",
  savings: "Poupanca",
  credit_card: "Cartao de Credito",
  investment: "Investimento",
};

const accountTypeIcons: Record<AccountType, LucideIcon> = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: TrendingUp,
};

export function Contas() {
  const { accounts, loading, error } = useAccounts();

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Contas</h2>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Contas</h2>
        <p className="text-destructive">Erro ao carregar contas: {error}</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Contas</h2>
        <p className="text-muted-foreground">Nenhuma conta encontrada.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Contas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => {
          const Icon = accountTypeIcons[account.type];
          return (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription>
                      {accountTypeLabels[account.type]}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receitas</span>
                    <span className="text-green-500">
                      {formatCurrency(account.totalIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Despesas</span>
                    <span className="text-red-500">
                      {formatCurrency(account.totalExpenses)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Saldo</span>
                    <span
                      className={cn(
                        account.netBalance >= 0
                          ? "text-green-500"
                          : "text-red-500",
                      )}
                    >
                      {formatCurrency(account.netBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Transacoes</span>
                    <span>{account.transactionCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
