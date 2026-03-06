import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseLocalDate(date: string): Date {
  const parts = date.split("-").map(Number);
  return new Date(parts[0]!, parts[1]! - 1, parts[2] ?? 1);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(parseLocalDate(date));
}
