import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString()} ${unit}`;
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function generateBatchNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `B${year}${month}${day}${random}`;
}

export function generateLotNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `L${year}${dayOfYear.toString().padStart(3, "0")}${random}`;
}

export function isLowStock(current: number, threshold: number): boolean {
  return current <= threshold;
}

export function isExpiringSoon(
  expirationDate: Date | null,
  daysThreshold: number = 30
): boolean {
  if (!expirationDate) return false;
  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold && diffDays >= 0;
}

export function isExpired(expirationDate: Date | null): boolean {
  if (!expirationDate) return false;
  return new Date() > expirationDate;
}

export function getStockStatus(
  current: number,
  threshold: number
): "good" | "low" | "out" {
  if (current === 0) return "out";
  if (current <= threshold) return "low";
  return "good";
}

export function getExpirationStatus(
  expirationDate: Date | null
): "good" | "warning" | "expired" {
  if (!expirationDate) return "good";
  if (isExpired(expirationDate)) return "expired";
  if (isExpiringSoon(expirationDate)) return "warning";
  return "good";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
