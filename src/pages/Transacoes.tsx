import { useState, useEffect, useRef } from "react";
import { Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, EmptyState, ErrorState } from "@/components/StateDisplay";
import {
  useTransactions,
  useCategories,
  type TransactionFilters,
  type SortField,
  type SortDirection,
} from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";

function SortIcon({ field, active, direction }: { field: string; active: string; direction: SortDirection }) {
  if (field !== active) return <ArrowUpDown className="ml-1 h-4 w-4 inline opacity-40" />;
  return direction === "asc"
    ? <ArrowUp className="ml-1 h-4 w-4 inline" />
    : <ArrowDown className="ml-1 h-4 w-4 inline" />;
}

export function Transacoes() {
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<TransactionFilters>({
    search: "",
    accountId: "",
    categoryId: "",
    dateStart: "",
    dateEnd: "",
  });
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const { transactions, totalCount, totalPages, loading, error, pageSize } =
    useTransactions(filters, sortField, sortDirection, page);
  const { accounts } = useAccounts();
  const categories = useCategories();

  function updateFilter(key: keyof TransactionFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "amount" ? "desc" : "asc");
    }
    setPage(0);
  }

  const hasActiveFilters = filters.search || filters.accountId || filters.categoryId || filters.dateStart || filters.dateEnd;

  const accountOptions = [
    { value: "", label: "Todas as contas" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const categoryOptions = [
    { value: "", label: "Todas as categorias" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div>
      <PageHeader
        title="Transações"
        subtitle={totalCount > 0 ? `${totalCount} transações encontradas` : undefined}
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              options={accountOptions}
              value={filters.accountId}
              onChange={(e) => updateFilter("accountId", e.target.value)}
              className="w-48"
            />
            <Select
              options={categoryOptions}
              value={filters.categoryId}
              onChange={(e) => updateFilter("categoryId", e.target.value)}
              className="w-48"
            />
            <Input
              type="date"
              value={filters.dateStart}
              onChange={(e) => updateFilter("dateStart", e.target.value)}
              className="w-40"
              placeholder="Data início"
            />
            <Input
              type="date"
              value={filters.dateEnd}
              onChange={(e) => updateFilter("dateEnd", e.target.value)}
              className="w-40"
              placeholder="Data fim"
            />
          </div>
        </CardContent>
      </Card>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {filters.search && (
            <Badge onDismiss={() => { updateFilter("search", ""); setSearchInput(""); }}>
              Busca: {filters.search}
            </Badge>
          )}
          {filters.accountId && (
            <Badge onDismiss={() => updateFilter("accountId", "")}>
              {accounts.find(a => a.id === filters.accountId)?.name ?? "Conta"}
            </Badge>
          )}
          {filters.categoryId && (
            <Badge onDismiss={() => updateFilter("categoryId", "")}>
              {categories.find(c => c.id === filters.categoryId)?.name ?? "Categoria"}
            </Badge>
          )}
          {filters.dateStart && (
            <Badge onDismiss={() => updateFilter("dateStart", "")}>
              De: {filters.dateStart}
            </Badge>
          )}
          {filters.dateEnd && (
            <Badge onDismiss={() => updateFilter("dateEnd", "")}>
              Até: {filters.dateEnd}
            </Badge>
          )}
          <button
            onClick={() => {
              setFilters({ search: "", accountId: "", categoryId: "", dateStart: "", dateEnd: "" });
              setSearchInput("");
              setPage(0);
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {error ? (
        <ErrorState message={error} />
      ) : (
        <>
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("date")}
              >
                Data
                <SortIcon field="date" active={sortField} direction={sortDirection} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("description")}
              >
                Descrição
                <SortIcon field="description" active={sortField} direction={sortDirection} />
              </TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort("amount")}
              >
                Valor
                <SortIcon field="amount" active={sortField} direction={sortDirection} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(t.date)}
                  </TableCell>
                  <TableCell>
                    {t.description_clean || t.description_raw}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.category?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.account.name}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right whitespace-nowrap font-medium",
                      t.amount >= 0 ? "text-income" : "text-expense",
                    )}
                  >
                    {formatCurrency(t.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <LoadingState />
        ) : transactions.length === 0 ? (
          <EmptyState icon={Search} title="Nenhuma transação encontrada" />
        ) : (
          transactions.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium leading-tight">
                    {t.description_clean || t.description_raw}
                  </p>
                  <span className={cn(
                    "text-sm font-medium whitespace-nowrap",
                    t.amount >= 0 ? "text-income" : "text-expense",
                  )}>
                    {formatCurrency(t.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(t.date)}</span>
                  <span>·</span>
                  <span>{t.category?.name ?? "—"}</span>
                  <span>·</span>
                  <span>{t.account.name}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} de{" "}
            {totalCount}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-input bg-background hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-input bg-background hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
