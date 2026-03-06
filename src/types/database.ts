export type AccountType = "checking" | "savings" | "credit_card" | "investment";
export type TransactionStatus = "pending" | "approved" | "rejected";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  date: string;
  description_raw: string;
  description_clean: string | null;
  amount: number;
  account_id: string;
  category_id: string | null;
  status: TransactionStatus;
  statement_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithRelations extends Transaction {
  account: Account;
  category: Category | null;
}

export interface Database {
  public: {
    Tables: {
      account: {
        Row: Account;
        Insert: Omit<Account, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Account, "id" | "created_at" | "updated_at">>;
      };
      category: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at">;
        Update: Partial<Omit<Category, "id" | "created_at">>;
      };
      transaction: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Transaction, "id" | "created_at" | "updated_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_type: AccountType;
      transaction_status: TransactionStatus;
    };
  };
}
