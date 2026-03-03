"use client";

import { useCallback, useEffect, useState } from "react";
import AccountList from "@/components/AccountList";
import SourceList from "@/components/SourceList";

type Account = {
  id: string;
  name: string;
  type: "CHECKING" | "CREDIT" | "SAVINGS";
  created_at: string;
  updated_at: string;
};

type Source = {
  id: string;
  name: string;
  type: "EMAIL" | "CSV" | "API" | "MANUAL";
  identifier: string;
  account_id: string;
  account: { id: string; name: string };
  created_at: string;
  updated_at: string;
};

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-md" />
      <div className="h-10 bg-gray-200 rounded-md w-3/4" />
      <div className="h-10 bg-gray-200 rounded-md w-1/2" />
    </div>
  );
}

export default function SourcesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);

    try {
      const [accountsRes, sourcesRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/sources"),
      ]);

      if (!accountsRes.ok || !sourcesRes.ok) {
        setError("Erro ao carregar dados. Tente recarregar a página.");
        return;
      }

      const [accountsJson, sourcesJson] = await Promise.all([
        accountsRes.json(),
        sourcesRes.json(),
      ]);

      setAccounts(accountsJson.data);
      setSources(sourcesJson.data);
    } catch {
      setError("Erro de conexão. Verifique sua rede e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Fontes de Dados</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contas Bancárias</h2>
        {loading ? (
          <Skeleton />
        ) : (
          <AccountList accounts={accounts} onMutate={fetchData} />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fontes</h2>
        {loading ? (
          <Skeleton />
        ) : (
          <SourceList sources={sources} accounts={accounts} onMutate={fetchData} />
        )}
      </div>
    </div>
  );
}
