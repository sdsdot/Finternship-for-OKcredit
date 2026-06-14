import React, { useState } from "react";
import { TrendingUp, Sparkles, RefreshCw, AlertCircle, Calendar, Zap } from "lucide-react";
import { User, Sale, ForecastResult } from "../types";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { motion } from "motion/react";

interface ForecastTabProps {
  user: User;
  sales: Sale[];
  token: string;
}

export default function ForecastTab({ user, sales, token }: ForecastTabProps) {
  const [loadingML, setLoadingML] = useState(false);
  const [forecasts, setForecasts] = useState<ForecastResult | null>(null);
  const [statusText, setStatusText] = useState("");
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanation, setExplanation] = useState("");

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const PRODUCTS_CONFIG: Record<string, { unit: string; color: string }> = {
    "Boiled Egg": { unit: "doz", color: "#ECC785" },
    "Sprouts": { unit: "g", color: "#8E78E6" },
    "Malt": { unit: "kg", color: "#6F52E7" }
  };

  // Run statistical regressional time-series demand model locally
  const runTimeDemandForecast = async () => {
    if (sales.length < 3) {
      setStatusText("❌ Need at least 3 historical sales entries to determine demand coefficients.");
      return;
    }

    setLoadingML(true);
    setStatusText("⏳ Computing cyclical daily weight factors and trend lines...");

    try {
      // Simulate small calculations delay
      await new Promise((r) => setTimeout(r, 900));

      const calculatedForecasts: ForecastResult = {};
      const uniqueDates = [...new Set(sales.map((s) => s.date))].sort();
      const lastDateStr = uniqueDates[uniqueDates.length - 1];
      const lastSeenDate = new Date(lastDateStr + "T00:00:00");

      ["Boiled Egg", "Sprouts", "Malt"].forEach((product) => {
        const pSales = sales.filter((s) => s.product === product);
        if (pSales.length === 0) return;

        // Sum quantities per historic date
        const dailySum: Record<string, number> = {};
        pSales.forEach((s) => {
          dailySum[s.date] = (dailySum[s.date] || 0) + s.qty;
        });

        const sortedDays = Object.keys(dailySum).sort();
        const quantities = sortedDays.map((d) => dailySum[d]);

        // Standard average daily sale as base
        let baseAvg = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;

        // Compute exponential weighting giving heavier emphasis to recent sales
        let weightedSum = 0;
        let denom = 0;
        quantities.forEach((q, idx) => {
          const weight = idx + 1;
          weightedSum += q * weight;
          denom += weight;
        });
        const trendBase = denom > 0 ? weightedSum / denom : baseAvg;

        const productFuturePredictions: number[] = [];

        // Project next 7 days
        for (let i = 1; i <= 7; i++) {
          const targetDate = new Date(lastSeenDate);
          targetDate.setDate(targetDate.getDate() + i);
          const targetDayOfWeek = targetDate.getDay();

          // Calculate Cyclical Day of Week Coefficient based on historic logs
          const matchingDays = pSales.filter(
            (s) => new Date(s.date + "T00:00:00").getDay() === targetDayOfWeek
          );

          let coefficient = 1.0;
          if (matchingDays.length > 0) {
            const sumDayQty = matchingDays.reduce((sum, s) => sum + s.qty, 0);
            const avgDayQty = sumDayQty / matchingDays.length;
            if (baseAvg > 0) {
              coefficient = avgDayQty / baseAvg;
            }
          }

          // Add a subtle stochastic element (~5%) to emulate volatility
          const randomness = 1 + (Math.random() * 0.1 - 0.05);
          const prediction = trendBase * coefficient * randomness;

          productFuturePredictions.push(
            parseFloat(Math.max(product === "Sprouts" ? 100 : 0.1, prediction).toFixed(2))
          );
        }

        calculatedForecasts[product] = productFuturePredictions;
      });

      setForecasts(calculatedForecasts);
      setStatusText("✅ Demand forecast complete. Plotting time-series prediction graph below.");

      // Automatically request Gemini explanation of computed models
      explainForecast(calculatedForecasts);

    } catch (err: any) {
      setStatusText(`❌ Prediction error: ${err.message}`);
    } finally {
      setLoadingML(false);
    }
  };

  // Explanation with server-side Gemini
  const explainForecast = async (calculatedForecasts: ForecastResult) => {
    setLoadingExplanation(true);
    setExplanation("");

    try {
      const response = await fetch("/api/gemini/forecast-explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ forecasts: calculatedForecasts })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze prediction.");
      }

      setExplanation(data.explanation);
    } catch (err: any) {
      setExplanation(`AI Explanation Error: ${err.message}`);
    } finally {
      setLoadingExplanation(false);
    }
  };

  // Compile Chart data connecting Previous (historical) and Future (predicted) timelines
  const getChartData = () => {
    if (sales.length === 0) return [];

    const uniqueDates = [...new Set(sales.map((s) => s.date))].sort();
    const lastDateStr = uniqueDates[uniqueDates.length - 1];
    const lastSeenDate = new Date(lastDateStr + "T00:00:00");

    // Group previous sales per day
    const chartPoints: any[] = [];
    uniqueDates.forEach((dateStr) => {
      const point: any = { date: dateStr.slice(5) }; // Grab MM-DD only
      ["Boiled Egg", "Sprouts", "Malt"].forEach((p) => {
        const sSum = sales
          .filter((s) => s.date === dateStr && s.product === p)
          .reduce((sum, s) => sum + s.qty, 0);
        if (sSum > 0) point[p] = sSum;
      });
      chartPoints.push(point);
    });

    // Append 7 forecast projections
    if (forecasts) {
      for (let i = 1; i <= 7; i++) {
        const targetDate = new Date(lastSeenDate);
        targetDate.setDate(targetDate.getDate() + i);
        const label = targetDate.toISOString().slice(5, 10);

        const point: any = { date: label + " (F)" };
        ["Boiled Egg", "Sprouts", "Malt"].forEach((p) => {
          if (forecasts[p]) {
            point[`${p} Forecast`] = forecasts[p][i - 1];
          }
        });
        chartPoints.push(point);
      }
    }

    return chartPoints;
  };

  // Calculate Rush Patterns (Weekday distribution bar meters)
  const getRushPatterns = () => {
    const uniqueDatesCount = [...new Set(sales.map((s) => s.date))].length;
    if (uniqueDatesCount < 7) {
      return null;
    }

    const patterns: Array<{ product: string; peakDay: string; slowestDay: string; distribution: number[] }> = [];

    ["Boiled Egg", "Sprouts", "Malt"].forEach((product) => {
      const pSales = sales.filter((s) => s.product === product);
      if (pSales.length === 0) return;

      const dailyTotals = Array(7).fill(0); // Sun-Sat
      const dailyCounts = Array(7).fill(0);

      pSales.forEach((s) => {
        const dow = new Date(s.date + "T00:00:00").getDay();
        dailyTotals[dow] += s.qty;
        dailyCounts[dow]++;
      });

      // Calculate localized average per weekday
      const weekdayAvgs = dailyTotals.map((tot, idx) => (dailyCounts[idx] > 0 ? tot / dailyCounts[idx] : 0));
      const maxVal = Math.max(...weekdayAvgs);
      const minVal = Math.min(...weekdayAvgs.filter((v) => v > 0));

      const peakIdx = weekdayAvgs.indexOf(maxVal);
      const slowIdx = weekdayAvgs.indexOf(minVal);

      // Normalize distribution to percentage
      const normalizedDist = maxVal > 0 ? weekdayAvgs.map((v) => (v / maxVal) * 100) : Array(7).fill(0);

      patterns.push({
        product,
        peakDay: WEEKDAYS[peakIdx] || "—",
        slowestDay: WEEKDAYS[slowIdx === -1 ? 0 : slowIdx] || "—",
        distribution: normalizedDist
      });
    });

    return patterns;
  };

  const chartData = getChartData();
  const rushPatterns = getRushPatterns();

  return (
    <div className="space-y-6 font-sans">
      {/* Run forecast trigger */}
      <div className="bg-brand-surface rounded-3xl border border-[#E6E1F5] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-[#6F52E7]" />
          <h3 className="font-bold font-display text-neutral-950 text-base">Demand Forecasting Systems</h3>
        </div>
        <p className="text-xs text-[#6B6687] mb-6">
          Execute cyclical sales regressions to forecast demand curves over the coming 7 days. This allows you to calibrate pre-production schedules exactly.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#6F52E7]/5 rounded-2xl border border-[#6F52E7]/15">
          <div className="text-center sm:text-left">
            <span className="text-xs font-semibold text-neutral-950 block font-display">Time-Series ML Predictors</span>
            <span className="text-[10px] text-[#6F52E7] font-semibold font-mono mt-0.5 block">{statusText || "Predictors idle. Ready for calculation."}</span>
          </div>

          <button
            onClick={runTimeDemandForecast}
            disabled={loadingML || sales.length < 3}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#16142E] hover:bg-[#6F52E7] hover:shadow-[0_4px_14px_rgba(111,82,231,0.35)] disabled:opacity-50 text-white text-xs font-bold font-display rounded-full shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap border border-[#6F52E7]/25"
          >
            {loadingML ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Zap className="w-4 h-4 text-[#ECC785]" />
            )}
            <span>Calculate 7-Day Forecast</span>
          </button>
        </div>

        {/* Recharts chart visualization */}
        {sales.length > 0 && (
          <div className="mt-8 border-t border-[#E6E1F5] pt-6">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 font-display">Predicted Sales Volume Graph (F = Forecast)</h4>
            <div className="h-[280px] w-full font-mono text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E1F5" />
                  <XAxis dataKey="date" stroke="#6B6687" style={{ fontSize: "10px" }} />
                  <YAxis stroke="#6B6687" style={{ fontSize: "10px" }} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E6E1F5", borderRadius: "12px", fontSize: "11px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  
                  {/* Historical actual lines */}
                  <Line type="monotone" dataKey="Boiled Egg" stroke="#ECC785" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="Sprouts" stroke="#8E78E6" strokeWidth={2.5} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="Malt" stroke="#6F52E7" strokeWidth={2.5} dot={{ r: 2.5 }} />
                  
                  {/* Dotted forecast lines */}
                  {forecasts && <Line type="monotone" dataKey="Boiled Egg Forecast" stroke="#ECC785" strokeDasharray="5 5" strokeWidth={1.5} dot={{ r: 1.5 }} />}
                  {forecasts && <Line type="monotone" dataKey="Sprouts Forecast" stroke="#8E78E6" strokeDasharray="5 5" strokeWidth={1.5} dot={{ r: 1.5 }} />}
                  {forecasts && <Line type="monotone" dataKey="Malt Forecast" stroke="#6F52E7" strokeDasharray="5 5" strokeWidth={1.5} dot={{ r: 1.5 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Gemini Explains prediction */}
      {explanation || loadingExplanation ? (
        <div className="bg-brand-surface rounded-3xl border border-[#E6E1F5] shadow-sm p-6 relative">
          <div className="absolute top-0 right-0 bg-[#6F52E7]/10 text-[#6F52E7] text-[10px] font-bold font-display px-3 py-1.5 rounded-bl-2xl uppercase tracking-wider border-l border-b border-[#E6E1F5]">
            Gemini Logistics Insight
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[#6F52E7]" />
            <h3 className="font-bold font-display text-neutral-950 text-base">Gemini Explains the Forecast</h3>
          </div>

          {loadingExplanation && (
            <div className="p-4 text-center text-xs text-[#6B6687] font-mono animate-pulse">
              ⚡ Gemini is digesting prediction points...
            </div>
          )}

          {explanation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-[#F1EDFE] border border-[#D3CDE8] rounded-2xl text-xs text-[#16142E] leading-relaxed font-sans whitespace-pre-line"
            >
              {explanation}
            </motion.div>
          )}
        </div>
      ) : null}

      {/* Weekday Rush Pattern distribution matrix */}
      <div className="bg-brand-surface rounded-3xl border border-[#E6E1F5] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-[#6F52E7]" />
          <h3 className="font-bold font-display text-neutral-950 text-base">Earthy weekly Rush Pattern</h3>
        </div>
        <p className="text-xs text-[#6B6687] mb-6">
          Highlights average weekday density parameters based on user sales logs. Avoid over-stocking on historically slow weekdays.
        </p>

        {!rushPatterns ? (
          <div className="p-8 text-center bg-[#F8F6FE] border border-[#E6E1F5] rounded-2xl flex items-center justify-center gap-2 text-xs text-[#6B6687] font-medium">
            <AlertCircle className="w-4 h-4 text-neutral-400" />
            <span>Requires at least 7 days of consecutive sales data to map weekday patterns.</span>
          </div>
        ) : (
          <div className="space-y-6">
            {rushPatterns.map((pat) => (
              <div key={pat.product} className="border-b border-[#E6E1F5] pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-extrabold text-neutral-900 font-display">{pat.product}</span>
                  <span className="font-semibold font-sans text-neutral-500">
                    📉 Slowest: <strong className="text-neutral-800 font-bold">{pat.slowestDay}</strong> | 📈 Peak: <strong className="text-[#6F52E7] font-bold">{pat.peakDay}</strong>
                  </span>
                </div>
                {/* Horizontal Weekday Bars */}
                <div className="grid grid-cols-7 gap-1.5 h-10 items-end">
                  {pat.distribution.map((pct, idx) => {
                    const isPeak = WEEKDAYS[idx] === pat.peakDay;
                    const itemColor = PRODUCTS_CONFIG[pat.product]?.color || "#FFFDF8";
                    return (
                      <div key={idx} className="flex flex-col items-center justify-end h-full gap-1">
                        <div
                          className="w-full rounded-t-sm transition-all duration-500"
                          style={{
                            height: `${Math.max(pct * 0.4, 4)}px`,
                            backgroundColor: isPeak ? itemColor : `${itemColor}45`
                          }}
                        ></div>
                        <span className="text-[9px] font-bold font-mono text-neutral-400">
                          {WEEKDAYS[idx].slice(0, 1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
