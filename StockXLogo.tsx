import React, { useState, useEffect } from "react";
import { Egg, Sprout, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw, ShoppingCart, ArrowDownCircle, MinusCircle, ShieldAlert } from "lucide-react";
import { User, Sale, AIBriefResponse } from "../types";
import { motion } from "motion/react";

interface DashboardTabProps {
  user: User;
  sales: Sale[];
  token: string;
  onRefreshData: () => void;
}

export default function DashboardTab({ user, sales, token, onRefreshData }: DashboardTabProps) {
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefResponse, setBriefResponse] = useState<AIBriefResponse | null>(null);
  const [briefError, setBriefError] = useState("");

  const PRODUCTS_CONFIG: Record<string, { unit: string; color: string; bg: string; text: string }> = {
    "Boiled Egg": { unit: "doz", color: "from-amber-500 to-orange-600", bg: "bg-amber-50", text: "text-amber-700" },
    "Sprouts": { unit: "g", color: "from-emerald-500 to-green-600", bg: "bg-emerald-50", text: "text-emerald-700" },
    "Malt": { unit: "kg", color: "from-indigo-500 to-purple-600", bg: "bg-indigo-50", text: "text-indigo-700" }
  };

  // Calculate Today's Revenue
  const getTodayRevenue = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return sales
      .filter(s => s.date === todayStr)
      .reduce((sum, s) => sum + s.revenue, 0);
  };

  // Calculate Average Daily Sales over recorded days
  const getAvgDailySales = (productName: string) => {
    const productSales = sales.filter(s => s.product === productName);
    if (productSales.length === 0) return 0;
    const totalQty = productSales.reduce((sum, s) => sum + s.qty, 0);
    const uniqueDays = [...new Set(productSales.map(s => s.date))].length || 1;
    return totalQty / uniqueDays;
  };

  // Compute Wastage Risk dynamically based on inventory days coverage
  const getRiskDetails = (productName: string) => {
    const stock = user.stocks[productName] || 0;
    const avg = getAvgDailySales(productName);
    if (avg === 0) return { score: 0, daysLeft: "—", label: "No Sales Data", color: "bg-neutral-200", barColor: "bg-neutral-300" };

    const daysLeft = stock / avg;
    let score = 0;
    let label = "Optimal";
    let color = "text-emerald-700 bg-emerald-50 border-emerald-200";
    let barColor = "bg-emerald-600";

    if (daysLeft <= 1.5) {
      score = 15;
      label = "Running Out! Stock Critical";
      color = "text-amber-700 bg-amber-50 border-amber-200";
      barColor = "bg-amber-500";
    } else if (daysLeft <= 4) {
      score = 40;
      label = "Healthy Supply";
      color = "text-emerald-700 bg-emerald-50 border-emerald-200";
      barColor = "bg-emerald-600";
    } else if (daysLeft <= 7) {
      score = 65;
      label = "Mild Overstock Risk";
      color = "text-orange-700 bg-orange-50 border-orange-200";
      barColor = "bg-orange-500";
    } else {
      score = 90;
      label = "High Spoilage & Waste Risk";
      color = "text-red-700 bg-red-50 border-red-200";
      barColor = "bg-red-600";
    }

    return {
      score,
      daysLeft: daysLeft.toFixed(1),
      label,
      color,
      barColor
    };
  };

  // Trigger Gemini Daily Brief
  const generateTodayBrief = async () => {
    setLoadingBrief(true);
    setBriefError("");
    setBriefResponse(null);

    try {
      const response = await fetch("/api/gemini/brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to retrieve brief from Gemini.");
      }

      setBriefResponse(data);
    } catch (err: any) {
      setBriefError(err.message || "Something went wrong while connecting with Gemini.");
    } finally {
      setLoadingBrief(false);
    }
  };

  const lowStockProducts = Object.keys(PRODUCTS_CONFIG).filter(
    p => (user.stocks[p] ?? 0) <= (user.thresholds[p] ?? 0)
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Alert area */}
      {lowStockProducts.length > 0 ? (
        <div className="p-4 bg-orange-50 border-l-4 border-orange-500 text-orange-950 rounded-r-xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm font-display">Attention: Low Stock Warning!</h4>
            <p className="text-xs text-orange-850 mt-1">
              The following products are below your configured warning thresholds:{" "}
              {lowStockProducts.map(p => (
                <strong key={p} className="font-semibold">
                  {p} ({user.stocks[p]?.toFixed(p === "Sprouts" ? 0 : 2)} {PRODUCTS_CONFIG[p].unit} remaining)
                </strong>
              )).reduce((prev, curr) => [prev, ", ", curr] as any)}. Consider replenishment soon.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-950 rounded-r-xl flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm font-display">All Stock Levels Secure</h4>
            <p className="text-xs text-emerald-850 mt-0.5">
              Every tracking parameter checks out above security margins. Nice management!
            </p>
          </div>
        </div>
      )}

      {/* Primary Card Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Boiled Egg */}
        <div className="bg-brand-surface rounded-2xl p-4 border border-neutral-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-3 text-amber-500/10">
            <Egg className="w-12 h-12" />
          </div>
          <div>
            <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider block">Boiled Eggs</span>
            <span className="font-display font-bold text-2xl text-neutral-900 mt-1 block">
              {user.stocks["Boiled Egg"]?.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-medium mt-3 block uppercase">Dozens Remaining</span>
        </div>

        {/* Sprouts */}
        <div className="bg-brand-surface rounded-2xl p-4 border border-neutral-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-3 text-emerald-500/10">
            <Sprout className="w-12 h-12" />
          </div>
          <div>
            <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider block">Sprouts</span>
            <span className="font-display font-bold text-2xl text-neutral-900 mt-1 block">
              {user.stocks["Sprouts"]?.toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-medium mt-3 block uppercase">Grams Remaining</span>
        </div>

        {/* Flour or Malt */}
        <div className="bg-brand-surface rounded-2xl p-4 border border-neutral-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-3 text-indigo-500/10 border-neutral-200">
            <TrendingUp className="w-12 h-12" />
          </div>
          <div>
            <span className="text-neutral-500 text-xs font-semibold uppercase tracking-wider block">Malt</span>
            <span className="font-display font-bold text-2xl text-neutral-900 mt-1 block">
              {user.stocks["Malt"]?.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-medium mt-3 block uppercase font-display">Kilograms Remaining</span>
        </div>

        {/* Revenue */}
        <div className="bg-brand-surface rounded-2xl p-4 border border-emerald-200 bg-emerald-50/20 shadow-sm relative overflow-hidden flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 p-3 text-emerald-500/10">
            <ShoppingCart className="w-12 h-12" />
          </div>
          <div>
            <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider block">Real-time Revenue</span>
            <span className="font-display font-bold text-2xl text-neutral-900 mt-1 block font-mono">
              ₹{getTodayRevenue().toLocaleString("en-IN")}
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-3 block uppercase font-sans">Accumulated Today</span>
        </div>
      </div>

      {/* Gemini AI Brief Card */}
      <div className="bg-brand-surface rounded-3xl border border-[#E6E1F5] shadow-sm overflow-hidden p-6 relative">
        <div className="absolute top-0 right-0 bg-[#6F52E7]/10 text-[#6F52E7] text-[10px] font-bold font-display px-3 py-1.5 rounded-bl-2xl uppercase tracking-wider border-l border-b border-[#E6E1F5]">
          Gemini Intelligence Partner
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6F52E7] to-[#8E78E6] text-white flex items-center justify-center shadow-md shadow-[#6F52E7]/10 animate-pulse">
            <Sparkles className="w-5 h-5 text-[#ECC785]" />
          </div>
          <div>
            <h3 className="font-bold font-display text-neutral-950 text-base">Gemini Daily Brief</h3>
            <p className="text-xs text-[#6B6687]">Gemini compiles purchase advice, logistics strategies, and risk logs instantly.</p>
          </div>
        </div>

        {briefError && (
          <div className="p-3 my-4 bg-red-50/50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {briefError}
          </div>
        )}

        <div className="mt-4">
          {!briefResponse && !loadingBrief && (
            <div className="p-6 text-center border border-dashed border-[#D3CDE8] bg-[#F8F6FE] rounded-2xl">
              <p className="text-sm text-[#6B6687] mb-4">No daily brief processed yet. Feed sales logs and trigger Gemini advisory.</p>
              <button
                onClick={generateTodayBrief}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#16142E] hover:bg-[#6F52E7] hover:shadow-[0_4px_14px_rgba(111,82,231,0.35)] text-white text-xs font-bold rounded-full transition-all duration-200 cursor-pointer font-display"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ECC785]" />
                <span>Generate Business Advice</span>
              </button>
            </div>
          )}

          {loadingBrief && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#6F52E7] animate-spin" />
              <p className="text-xs text-[#6B6687] animate-pulse font-mono">⚡ Gemini AI reading sales logs, balancing shelves, and drafting advice...</p>
            </div>
          )}

          {briefResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-[#F1EDFE] border border-[#D3CDE8] rounded-2xl text-neutral-800 text-xs leading-relaxed">
                <span className="font-bold text-[#6F52E7] block text-[10px] mb-1 font-display tracking-wider uppercase">Today's Market Analysis</span>
                {briefResponse.brief}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {briefResponse.actions.map((act, idx) => {
                  const typeStyles = {
                    buy: { bg: "bg-emerald-50 border-emerald-200 text-emerald-800", badge: "bg-emerald-600 text-white", label: "BUY MORE", icon: <ShoppingCart className="w-4 h-4" /> },
                    reduce: { bg: "bg-amber-50 border-amber-200 text-amber-800", badge: "bg-amber-600 text-white", label: "REDUCE STOCK", icon: <ArrowDownCircle className="w-4 h-4" /> },
                    hold: { bg: "bg-indigo-50 border-indigo-200 text-indigo-800", badge: "bg-indigo-600 text-white", label: "HOLD SUPPLY", icon: <MinusCircle className="w-4 h-4" /> }
                  };

                  const s = typeStyles[act.type] || typeStyles.hold;

                  return (
                    <div key={idx} className={`p-3 rounded-xl border ${s.bg} flex flex-col justify-between shadow-sm`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-display font-extrabold text-sm text-neutral-900">{act.product}</span>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${s.badge} flex items-center gap-1 font-mono`}>
                            {s.icon} {s.label}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-90 mt-1">{act.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={generateTodayBrief}
                  className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-900 font-bold uppercase tracking-wider"
                >
                  <RefreshCw className="w-3 h-3" /> Re-examine Advice
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Wastage Risk Section */}
      <div className="bg-brand-surface rounded-3xl border border-[#E6E1F5] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-5 h-5 text-[#16142E]" />
          <h3 className="font-bold font-display text-neutral-950 text-base">Perishable Cover & Wastage Risk</h3>
        </div>
        <p className="text-xs text-[#6B6687] mb-6">
          Wastage metrics calculate how many days your stock can support operations. Excessive stock limits trigger warnings for egg and sprout decay.
        </p>

        {sales.length < 3 ? (
          <div className="text-center p-6 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-400">
            Log at least 3 days of transactions to compile cover calculations.
          </div>
        ) : (
          <div className="space-y-5">
            {["Boiled Egg", "Sprouts", "Malt"].map(product => {
              const details = getRiskDetails(product);
              return (
                <div key={product} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-neutral-950">{product}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${details.color} font-mono uppercase`}>
                      {details.daysLeft} days cover • {details.label}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden border border-neutral-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${details.score}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full ${details.barColor} rounded-full`}
                    ></motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
