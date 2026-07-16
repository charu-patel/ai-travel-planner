// components/FinancialAllocation.tsx
"use client";

import React from "react";

interface CostEstimate {
  total: number;
  travelCost: number;
  stayCost: number;
  foodCost: number;
  localTransport: number;
}

interface FinancialAllocationProps {
  costEstimate?: CostEstimate;
  budgetTier?: string;
}

// Custom robust currency formatter for Indian numbers (Lakhs/Crores layout)
function formatToINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "0 INR";
  
  const numStr = Math.floor(amount).toString();
  const lastThree = numStr.substring(numStr.length - 3);
  const otherBits = numStr.substring(0, numStr.length - 3);
  
  if (otherBits !== '') {
    // Inserts commas every 2 digits for values above 1,000 (e.g., 10,00,000 INR)
    const formattedReg = otherBits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    return `${formattedReg} INR`;
  }
  
  return `${lastThree} INR`;
}

export default function FinancialAllocation({ costEstimate }: FinancialAllocationProps) {
  if (!costEstimate) return null;

  const { total, travelCost, stayCost, foodCost, localTransport } = costEstimate;
  const safeTotal = total || 1;

  const allocations = [
    { label: "Transport Fees", value: travelCost, icon: "🚆", color: "bg-indigo-500" },
    { label: "Lodging Base", value: stayCost, icon: "🏨", color: "bg-emerald-500" },
    { label: "Dietary / Food", value: foodCost, icon: "🍽️", color: "bg-amber-500" },
    { label: "Local Transit", value: localTransport, icon: "🚕", color: "bg-rose-500" },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto mt-10 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
          <span>💰</span> Financial Allocation Estimate
        </h3>

        <div className="grid md:grid-cols-5 gap-8 items-center">
          {/* TRACK PROGRESSBAR LIST */}
          <div className="md:col-span-3 space-y-4">
            {allocations.map((item, idx) => {
              const pct = Math.round((item.value / safeTotal) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 flex items-center gap-2">
                      <span>{item.icon}</span> {item.label}:
                    </span>
                    <span className="text-slate-900 font-mono font-bold">
                      {formatToINR(item.value)}{" "}
                      <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* DISPLAY HERO OUTLAY PANEL */}
          <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-xl p-5 text-center md:text-left flex flex-col justify-center h-full min-h-[140px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Estimated Total Outlay
            </span>
            <span className="text-2xl md:text-3xl font-black text-indigo-600 font-mono mt-1 block">
              {formatToINR(total)}
            </span>
            <p className="text-[11px] text-slate-400 mt-2 italic leading-relaxed">
              Base tier allocation verified for local destination currency metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}