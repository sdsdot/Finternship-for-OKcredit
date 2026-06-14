import React, { useState } from "react";
import { PlusCircle, Trash2, Calendar, ShoppingBag, CreditCard, Layers, Tag } from "lucide-react";
import { User, Sale } from "../types";
import { motion } from "motion/react";

interface SalesLogTabProps {
  user: User;
  sales: Sale[];
  token: string;
  onRefreshData: () => void;
}

export default function SalesLogTab({ user, sales, token, onRefreshData }: SalesLogTabProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [product, setProduct] = useState("Boiled Egg");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState(120); // Initial price based on Egg
  const [error, setError] = useState("");
  const [loadingAdd, setLoadingAdd] = useState(false);

  const PRODUCTS_CONFIG: Record<string, { unit: string; step: number; decimals: number; defaultPrice: number; color: string; badgeClass: string }> = {
    "Boiled Egg": { unit: "doz", step: 0.0833, decimals: 2, defaultPrice: 120, color: "text-amber-700 bg-amber-50 border-amber-200", badgeClass: "from-amber-100 to-orange-100 border-amber-200 text-amber-900" },
    "Sprouts": { unit: "g", step: 100, decimals: 0, defaultPrice: 0.1, color: "text-emerald-700 bg-emerald-50 border-emerald-200", badgeClass: "from-emerald-100 to-green-100 border-emerald-200 text-emerald-900" },
    "Malt": { unit: "kg", step: 0.05, decimals: 2, defaultPrice: 700, color: "text-indigo-700 bg-indigo-50 border-indigo-200", badgeClass: "from-indigo-100 to-purple-100 border-indigo-200 text-indigo-900" }
  };

  const handleProductChange = (prod: string) => {
    setProduct(prod);
    setPrice(PRODUCTS_CONFIG[prod].defaultPrice);
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const quantity = parseFloat(qty);
    if (!date) {
      setError("Please select a date.");
      return;
    }
    if (isNaN(quantity) || quantity <= 0) {
      setError("Please enter a valid positive quantity.");
      return;
    }

    setLoadingAdd(true);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          date,
          product,
          qty: quantity,
          price
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to log sale.");
      }

      setQty("");
      onRefreshData();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recorded sale?")) return;

    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete sale.");
      }

      onRefreshData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Add sale form */}
      <div className="bg-brand-surface rounded-3xl border border-[#E6E1F5] shadow-sm p-6">
        <h3 className="font-bold font-display text-neutral-950 text-base mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-[#6F52E7]" /> Log Today's Sales Activity
        </h3>

        {error && (
          <div className="p-3 mb-4 bg-red-50/50 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleAddSale} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6687] mb-1 pl-1">
                Sale Date
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#D3CDE8] rounded-full text-xs focus:outline-none focus:border-[#6F52E7] text-neutral-950 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Product description selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6687] mb-1 pl-1">
                Food Item
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <ShoppingBag className="w-4 h-4" />
                </span>
                <select
                  value={product}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#D3CDE8] rounded-full text-xs focus:outline-none focus:border-[#6F52E7] text-neutral-950 appearance-none transition-colors"
                >
                  <option value="Boiled Egg">Boiled Eggs (Eggs)</option>
                  <option value="Sprouts">Sprouts (Grams)</option>
                  <option value="Malt">Malt (Flour)</option>
                </select>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6687] mb-1 pl-1">
                Qty Sold (Unit: {PRODUCTS_CONFIG[product].unit})
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Layers className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  step={PRODUCTS_CONFIG[product].step}
                  min="0"
                  placeholder={`e.g. ${product === "Sprouts" ? "400" : "2"}`}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#D3CDE8] rounded-full text-xs focus:outline-none focus:border-[#6F52E7] text-neutral-950 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Fixed price per unit indicator */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6687] mb-1 pl-1">
                Sale Price (₹ Per {PRODUCTS_CONFIG[product].unit})
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <CreditCard className="w-4 h-4" />
                </span>
                <input
                  type="number"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2.5 bg-[#F8F6FE] border border-[#D3CDE8] rounded-full text-xs text-neutral-600"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#E6E1F5]">
            <button
              type="submit"
              disabled={loadingAdd}
              className="px-6 py-2.5 bg-[#16142E] hover:bg-[#6F52E7] hover:shadow-[0_4px_14px_rgba(111,82,231,0.35)] text-white text-xs font-bold font-display rounded-full shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-2 border border-[#6F52E7]/25"
            >
              {loadingAdd ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Record Transaction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Sales grid history with delete triggers */}
      <div className="bg-brand-surface rounded-3xl border border-[#E6E1F5] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6E1F5] flex items-center justify-between">
          <h3 className="font-bold font-display text-neutral-950 text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#6F52E7]" /> Transaction Ledger
          </h3>
          <span className="text-[10px] font-bold font-mono px-3 py-1 rounded-full bg-[#6F52E7]/10 text-[#6F52E7]">
            {sales.length} Logs recorded
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-400 text-xs font-medium">No sales logs stored on server. Record some transactions above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200">
                  <th className="px-6 py-3 text-neutral-500 font-bold uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-neutral-500 font-bold uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-neutral-500 font-bold uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-neutral-500 font-bold uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-neutral-500 font-bold uppercase tracking-wider">Total Revenue</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {[...sales].reverse().map((sale) => {
                  const cfg = PRODUCTS_CONFIG[sale.product] || { decimals: 2, unit: "units", badgeClass: "bg-neutral-100 text-neutral-900 border-neutral-200" };
                  return (
                    <tr key={sale.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4.5 font-semibold text-neutral-700 whitespace-nowrap">{sale.date}</td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-block font-display font-bold text-[10px] px-2.5 py-0.5 rounded-full border bg-gradient-to-r ${cfg.badgeClass}`}>
                          {sale.product}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-mono text-neutral-900 font-medium">
                        {sale.qty.toFixed(cfg.decimals)} <span className="text-neutral-400 text-[10px]">{cfg.unit}</span>
                      </td>
                      <td className="px-6 py-4.5 font-mono text-neutral-500">₹{sale.price}</td>
                      <td className="px-6 py-4.5 font-mono font-bold text-neutral-905">₹{sale.revenue.toFixed(0)}</td>
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteSale(sale.id)}
                          className="p-1 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Purge transaction from server"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
