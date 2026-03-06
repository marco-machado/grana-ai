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
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateDisplay";
import { cn, formatCurrency } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import type { AccountType } from "@/types/database";

const accountTypeLabels: Record<AccountType, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  credit_card: "Cartão de Crédito",
  investment: "Investimento",
};

const accountTypeIcons: Record<AccountType, LucideIcon> = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  investment: TrendingUp,
};

const accountTypeColors: Record<AccountType, string> = {
  checking: "bg-primary/10 text-primary",
  savings: "bg-blue-500/10 text-blue-500",
  credit_card: "bg-amber-500/10 text-amber-500",
  investment: "bg-violet-500/10 text-violet-500",
};

export function Contas() {
  const { accounts, loading, error } = useAccounts();

  if (loading) {
    return (
      <div>
        <PageHeader title="Contas" />
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Contas" />
        <ErrorState message={`Erro ao carregar contas: ${error}`} />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader title="Contas" />
        <EmptyState icon={Wallet} title="Nenhuma conta encontrada" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Contas" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => {
          const Icon = accountTypeIcons[account.type];
          return (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2", accountTypeColors[account.type])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription>{accountTypeLabels[account.type]}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "text-2xl font-bold mb-4",
                  account.netBalance >= 0 ? "text-income" : "text-expense",
                )}>
                  {formatCurrency(account.netBalance)}
                </p>
                {(account.totalIncome > 0 || Math.abs(account.totalExpenses) > 0) && (
                  <div className="h-2 rounded-full overflow-hidden bg-muted mb-4 flex">
                    {account.totalIncome > 0 && (
                      <div
                        className="bg-income h-full"
                        style={{ width: `${(account.totalIncome / (account.totalIncome + Math.abs(account.totalExpenses))) * 100}%` }}
                      />
                    )}
                    {Math.abs(account.totalExpenses) > 0 && (
                      <div
                        className="bg-expense h-full"
                        style={{ width: `${(Math.abs(account.totalExpenses) / (account.totalIncome + Math.abs(account.totalExpenses))) * 100}%` }}
                      />
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Receitas</span>
                  <span className="text-right text-income">{formatCurrency(account.totalIncome)}</span>
                  <span className="text-muted-foreground">Despesas</span>
                  <span className="text-right text-expense">{formatCurrency(Math.abs(account.totalExpenses))}</span>
                  <span className="text-muted-foreground">Transações</span>
                  <span className="text-right">{account.transactionCount}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
