"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import AdminNavigation from "../../../components/AdminNavigation";

type TransactionStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";

interface TransactionItem {
  id: string;
  paymentGatewayId?: string | null;
  amount: number;
  currency: string;
  billingCycle: string;
  status: TransactionStatus;
  paymentMethod: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  tenant: { id: string; name: string; subdomain: string };
  subscriptionPlan?: { id: string; name: string; interval: string; price: number } | null;
}

interface TransactionsResponse {
  page: number;
  limit: number;
  total: number;
  items: TransactionItem[];
}

export default function AdminTransactionsPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TransactionStatus>("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      redirect("/dashboard");
    }
  }, [session, status]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (query) params.set("q", query);

      const res = await fetch(`/api/admin/transactions?${params.toString()}`);
      const data: TransactionsResponse = await res.json();
      if (!res.ok) {
        throw new Error((data as any)?.error || "Failed to fetch transactions");
      }

      setItems(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation title="Transactions" subtitle="Manage subscription payments across all tenants" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            <div className="flex items-center space-x-2">
              <label htmlFor="status" className="text-sm text-gray-700">Status</label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border rounded-md px-2 py-1 text-sm"
              >
                {(["ALL", "PENDING", "PAID", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"] as const).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 flex-1">
              <input
                type="text"
                placeholder="Search by order id, tenant, user"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm w-full"
              />
              <button
                onClick={() => {
                  setPage(1);
                  fetchTransactions();
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">Loading transactions...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-red-600">{error}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">No transactions found</td>
                </tr>
              ) : (
                items.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {t.paymentGatewayId || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: t.currency || "IDR" }).format(t.amount)}
                      <div className="text-xs text-gray-500">{t.billingCycle}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        t.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : t.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : t.status === "FAILED" || t.status === "CANCELLED" || t.status === "EXPIRED"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{t.paymentMethod}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {t.subscriptionPlan ? (
                        <div>
                          <div>{t.subscriptionPlan.name}</div>
                          <div className="text-xs text-gray-500">
                            {(t.billingCycle
                              ? String(t.billingCycle).toUpperCase()
                              : String(t.subscriptionPlan.interval || "").toUpperCase())}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <div>{t.tenant.name}</div>
                      <div className="text-xs text-gray-500">{t.tenant.subdomain}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <div>{t.user.name || t.user.email}</div>
                      <div className="text-xs text-gray-500">{t.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages} • Total {total}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`px-3 py-2 rounded-md text-sm border ${
                page <= 1 ? "text-gray-400 border-gray-200" : "text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`px-3 py-2 rounded-md text-sm border ${
                page >= totalPages ? "text-gray-400 border-gray-200" : "text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}