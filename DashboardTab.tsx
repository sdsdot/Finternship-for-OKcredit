/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LayoutDashboard, Receipt, TrendingUp, MessageSquareCode, Sliders, LogOut, RefreshCw } from "lucide-react";
import LoginScreen from "./components/LoginScreen";
import DashboardTab from "./components/DashboardTab";
import SalesLogTab from "./components/SalesLogTab";
import ForecastTab from "./components/ForecastTab";
import AskGeminiTab from "./components/AskGeminiTab";
import StockSettingsTab from "./components/StockSettingsTab";
import StockXLogo from "./components/StockXLogo";
import { User, Sale } from "./types";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("stockx_token"));
  const [user, setUser] = useState<User | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeTab, setActiveTab] = useState<"dash" | "log" | "predict" | "ai" | "inv">("dash");
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Verify and fetch profile on boot
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = localStorage.getItem("stockx_token");
      if (!savedToken) {
        setLoadingSession(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: { "Authorization": `Bearer ${savedToken}` }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          await fetchSalesAndInventory(savedToken);
        } else {
          // Token is stale or invalid; wipe it
          localStorage.removeItem("stockx_token");
          setToken(null);
        }
      } catch (err) {
        console.error("Session verification failure:", err);
      } finally {
        setLoadingSession(false);
      }
    };

    verifySession();
  }, [token]);

  // Sync sales logs and stock level numbers
  const fetchSalesAndInventory = async (authToken: string) => {
    setLoadingData(true);
    try {
      const [invRes, salesRes] = await Promise.all([
        fetch("/api/inventory", {
          headers: { "Authorization": `Bearer ${authToken}` }
        }),
        fetch("/api/sales", {
          headers: { "Authorization": `Bearer ${authToken}` }
        })
      ]);

      if (invRes.ok && salesRes.ok) {
        const invData = await invRes.json();
        const salesData = await salesRes.json();
        setSales(salesData.sales);
        setUser((prev) =>
          prev ? { ...prev, stocks: invData.stocks, thresholds: invData.thresholds } : null
        );
      }
    } catch (err) {
      console.error("Failed to fetch shop inventory metrics:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAuthSuccess = (newToken: string, authenticatedUser: User) => {
    localStorage.setItem("stockx_token", newToken);
    setToken(newToken);
    setUser(authenticatedUser);
    setActiveTab("dash");
  };

  const handleLogout = () => {
    localStorage.removeItem("stockx_token");
    setToken(null);
    setUser(null);
    setSales([]);
    setActiveTab("dash");
  };

  // Quick helper to force-refresh logs whenever database values change
  const handleRefreshData = () => {
    if (token) {
      fetchSalesAndInventory(token);
    }
  };

  // Loading spinner prior to app boot
  if (loadingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F3FB] gap-4 font-sans text-[#1F1B3D]">
        <StockXLogo onlyIcon={true} size="lg" className="animate-pulse" />
        <p className="text-sm font-semibold tracking-wide font-serif italic text-[#16142E] animate-pulse">Initializing Shyam's StockX Tracker...</p>
      </div>
    );
  }

  // Not authenticated? Load sign-in layout
  if (!token || !user) {
    return <LoginScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3FB] pb-24 font-sans text-[#2D2A3A]">
      {/* Universal header banner */}
      <header className="bg-[#16142E] border-b border-white/10 text-white shadow-lg py-5 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 border border-white/10 rounded-2xl bg-white/5">
              <StockXLogo onlyIcon={true} size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif italic text-2xl tracking-tighter text-white mb-0.5">
                  {user.name} Control
                </h1>
                <span className="text-[9px] bg-[#54B948]/20 text-[#54B948] border border-[#54B948]/30 font-bold px-2 py-0.5 rounded-full font-sans uppercase tracking-wider">
                  StockX Active
                </span>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 font-mono">
                Egg • Sprouts • Malt Inventory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshData}
              disabled={loadingData}
              className="p-2 border border-white/10 hover:border-white/25 bg-white/5 text-neutral-200 rounded-lg transition-colors cursor-pointer"
              title="Force-sync database numbers"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 md:p-2 border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Log out session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main app contents */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dash" && (
              <DashboardTab
                user={user}
                sales={sales}
                token={token}
                onRefreshData={handleRefreshData}
              />
            )}
            {activeTab === "log" && (
              <SalesLogTab
                user={user}
                sales={sales}
                token={token}
                onRefreshData={handleRefreshData}
              />
            )}
            {activeTab === "predict" && (
              <ForecastTab
                user={user}
                sales={sales}
                token={token}
              />
            )}
            {activeTab === "ai" && (
              <AskGeminiTab
                user={user}
                sales={sales}
                token={token}
              />
            )}
            {activeTab === "inv" && (
              <StockSettingsTab
                user={user}
                token={token}
                onRefreshData={handleRefreshData}
                onLogout={handleLogout}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Persistent Horizontal Navigation Tab bar */}
      <nav className="fixed bottom-0 left-0 w-full bg-brand-surface border-t border-neutral-200 shadow-2xl flex items-center justify-around py-2.5 px-4 z-50">
        <div className="max-w-xl w-full mx-auto flex justify-between">
          
          <button
            onClick={() => setActiveTab("dash")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
              activeTab === "dash" ? "text-emerald-700 font-extrabold" : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("log")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
              activeTab === "log" ? "text-emerald-700 font-extrabold" : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Log Sales</span>
          </button>

          <button
            onClick={() => setActiveTab("predict")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
              activeTab === "predict" ? "text-emerald-700 font-extrabold" : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-display font-display">Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
              activeTab === "ai" ? "text-emerald-700 font-extrabold" : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <MessageSquareCode className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Ask Gemini</span>
          </button>

          <button
            onClick={() => setActiveTab("inv")}
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
              activeTab === "inv" ? "text-emerald-700 font-extrabold" : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Inventory</span>
          </button>

        </div>
      </nav>
    </div>
  );
}

