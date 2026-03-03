"use client";

import { useState } from "react";

type Account = {
  id: string;
  name: string;
  type: "CHECKING" | "CREDIT" | "SAVINGS";
  created_at: string;
  updated_at: string;
};

type AccountListProps = {
  accounts: Account[];
  onMutate: () => void;
};

const TYPE_LABELS: Record<Account["type"], string> = {
  CHECKING: "Conta Corrente",
  CREDIT: "Cartão de Crédito",
  SAVINGS: "Poupança",
};

const TYPE_BADGE_STYLES: Record<Account["type"], string> = {
  CHECKING: "bg-blue-100 text-blue-800",
  CREDIT: "bg-purple-100 text-purple-800",
  SAVINGS: "bg-green-100 text-green-800",
};

const ACCOUNT_TYPES: Account["type"][] = ["CHECKING", "CREDIT", "SAVINGS"];

export default function AccountList({ accounts, onMutate }: AccountListProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["type"]>("CHECKING");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<Account["type"]>("CHECKING");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Erro ao criar conta");
        return;
      }

      setName("");
      setType("CHECKING");
      onMutate();
    } catch {
      setError("Erro de conexão ao criar conta");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(account: Account) {
    setEditingId(account.id);
    setEditName(account.name);
    setEditType(account.type);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);
    setEditSubmitting(true);

    try {
      const res = await fetch(`/api/accounts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), type: editType }),
      });

      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error?.message ?? "Erro ao atualizar conta");
        return;
      }

      setEditingId(null);
      onMutate();
    } catch {
      setEditError("Erro de conexão ao atualizar conta");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(account: Account) {
    setDeleteError(null);
    setDeletingId(account.id);

    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error?.message ?? "Erro ao excluir conta");
        return;
      }

      onMutate();
    } catch {
      setDeleteError("Erro de conexão ao excluir conta");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome
          </label>
          <input
            id="account-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Nubank, Itaú..."
            required
            disabled={submitting}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="account-type" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            id="account-type"
            value={type}
            onChange={(e) => setType(e.target.value as Account["type"])}
            disabled={submitting}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Adicionando..." : "Adicionar"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      {deleteError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{deleteError}</p>
      )}

      {accounts.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Nenhuma conta cadastrada</p>
      ) : (
        <div className="divide-y divide-gray-200">
          {accounts.map((account) => (
            <div key={account.id} className="py-3">
              {editingId === account.id ? (
                <form onSubmit={handleEdit} className="flex items-end gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      disabled={editSubmitting}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as Account["type"])}
                      disabled={editSubmitting}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={editSubmitting || !editName.trim()}
                    className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editSubmitting ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={editSubmitting}
                    className="text-gray-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  {editError && (
                    <span className="text-sm text-red-600">{editError}</span>
                  )}
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{account.name}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_BADGE_STYLES[account.type]}`}
                    >
                      {TYPE_LABELS[account.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(account)}
                      className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(account)}
                      disabled={deletingId === account.id}
                      className="text-sm text-red-600 hover:text-red-800 px-2 py-1 rounded bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === account.id ? "Excluindo..." : `Excluir ${account.name}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
