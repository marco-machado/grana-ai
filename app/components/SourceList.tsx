"use client";

import { useState } from "react";

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

type SourceListProps = {
  sources: Source[];
  accounts: Account[];
  onMutate: () => void;
};

const TYPE_LABELS: Record<Source["type"], string> = {
  EMAIL: "Email",
  CSV: "CSV",
  API: "API",
  MANUAL: "Manual",
};

const TYPE_BADGE_STYLES: Record<Source["type"], string> = {
  EMAIL: "bg-amber-100 text-amber-800",
  CSV: "bg-cyan-100 text-cyan-800",
  API: "bg-indigo-100 text-indigo-800",
  MANUAL: "bg-gray-100 text-gray-800",
};

const SOURCE_TYPES: Source["type"][] = ["EMAIL", "CSV", "API", "MANUAL"];

export default function SourceList({ sources, accounts, onMutate }: SourceListProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Source["type"]>("EMAIL");
  const [identifier, setIdentifier] = useState("");
  const [accountId, setAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          identifier: identifier.trim(),
          account_id: accountId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Erro ao criar fonte");
        return;
      }

      setName("");
      setType("EMAIL");
      setIdentifier("");
      setAccountId("");
      onMutate();
    } catch {
      setError("Erro de conexão ao criar fonte");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(source: Source) {
    setDeleteError(null);
    setDeletingId(source.id);

    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error?.message ?? "Erro ao excluir fonte");
        return;
      }

      onMutate();
    } catch {
      setDeleteError("Erro de conexão ao excluir fonte");
    } finally {
      setDeletingId(null);
    }
  }

  const hasAccounts = accounts.length > 0;

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="source-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <input
              id="source-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Email Nubank, CSV Itaú..."
              required
              disabled={submitting || !hasAccounts}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="source-type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              id="source-type"
              value={type}
              onChange={(e) => setType(e.target.value as Source["type"])}
              disabled={submitting || !hasAccounts}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="source-identifier" className="block text-sm font-medium text-gray-700 mb-1">
              Identificador
            </label>
            <input
              id="source-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ex: email@banco.com, /caminho/arquivo.csv..."
              required
              disabled={submitting || !hasAccounts}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="source-account" className="block text-sm font-medium text-gray-700 mb-1">
              Conta
            </label>
            <select
              id="source-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              disabled={submitting || !hasAccounts}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Selecione...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !identifier.trim() || !accountId || !hasAccounts}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
        {!hasAccounts && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-md px-3 py-2">
            Cadastre uma conta bancária antes de adicionar fontes.
          </p>
        )}
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      {deleteError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{deleteError}</p>
      )}

      {sources.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhuma fonte cadastrada</p>
      ) : (
        <div className="divide-y divide-gray-200">
          {sources.map((source) => (
            <div key={source.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">{source.name}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${TYPE_BADGE_STYLES[source.type]}`}
                >
                  {TYPE_LABELS[source.type]}
                </span>
                <span className="text-xs text-gray-500 truncate">{source.identifier}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {source.account.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(source)}
                disabled={deletingId === source.id}
                className="text-sm text-red-600 hover:text-red-800 px-2 py-1 rounded bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-3"
              >
                {deletingId === source.id ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
