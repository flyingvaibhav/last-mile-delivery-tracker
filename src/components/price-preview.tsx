"use client";

import React from "react";
import { Info, Calculator, FileText } from "lucide-react";

interface PricePreviewData {
  pickupZone?: { name: string };
  dropZone?: { name: string };
  volumetricWeight?: number;
  billedWeight?: number;
  baseCharge?: number;
  ratePerKg?: number;
  codSurcharge?: number;
  isIntraZone?: boolean;
  charge?: number;
}

interface PricePreviewProps {
  data: PricePreviewData | null;
  loading: boolean;
  error: string | null;
  actualWeight?: number;
}

export default function PricePreview({ data, loading, error, actualWeight = 0 }: PricePreviewProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-dashed dark:border-gray-800 border-gray-200 p-6 dark:bg-gray-900/40 bg-gray-50/50 flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium dark:text-gray-400 text-gray-500">Recalculating price details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border dark:border-red-900/30 border-red-200 p-6 dark:bg-red-950/10 bg-red-50/50 flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="h-10 w-10 rounded-full dark:bg-red-950 bg-red-100 flex items-center justify-center text-red-500 mb-4 animate-bounce">
          <Info size={20} />
        </div>
        <h4 className="text-sm font-semibold dark:text-red-400 text-red-700 mb-1">Pricing Configuration Error</h4>
        <p className="text-xs dark:text-red-300 text-red-600 max-w-[240px]">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border dark:border-gray-800 border-gray-200 p-6 dark:bg-gray-900/10 bg-gray-50/20 flex flex-col items-center justify-center min-h-[300px] text-center text-gray-400">
        <Calculator size={32} className="mb-3 text-gray-500 dark:text-gray-600" />
        <h4 className="text-sm font-semibold dark:text-gray-300 text-gray-700 mb-1">Price Estimate Preview</h4>
        <p className="text-xs max-w-[200px] text-gray-500">Fill in address pincodes and package dimensions to see your dynamic receipt breakdown.</p>
      </div>
    );
  }

  const {
    pickupZone,
    dropZone,
    volumetricWeight = 0,
    billedWeight = 0,
    baseCharge = 0,
    ratePerKg = 0,
    codSurcharge = 0,
    isIntraZone = true,
    charge = 0,
  } = data;

  const isVolumetricBilled = volumetricWeight > actualWeight;

  return (
    <div className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-md overflow-hidden transition-all duration-300">
      {/* Card Header */}
      <div className="px-5 py-4 border-b dark:border-gray-800 border-gray-200 bg-gray-50/50 dark:bg-gray-950 flex items-center gap-2">
        <FileText size={16} className="text-blue-500" />
        <h3 className="text-sm font-bold tracking-tight dark:text-white text-gray-900 uppercase">Pricing Receipt</h3>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Zone Details */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-2.5 rounded-lg dark:bg-gray-950 bg-gray-50 border dark:border-gray-800 border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Pickup Zone</span>
            <span className="font-semibold text-gray-900 dark:text-white truncate block">{pickupZone?.name || "N/A"}</span>
          </div>
          <div className="p-2.5 rounded-lg dark:bg-gray-950 bg-gray-50 border dark:border-gray-800 border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Delivery Zone</span>
            <span className="font-semibold text-gray-900 dark:text-white truncate block">{dropZone?.name || "N/A"}</span>
          </div>
        </div>

        {/* Weight note */}
        <div className="p-3 rounded-lg text-[11px] dark:bg-gray-950/50 bg-blue-50/30 border dark:border-blue-900/20 border-blue-100 flex gap-2">
          <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="dark:text-gray-300 text-gray-600 leading-normal">
            <p>
              Billed weight: <strong className="text-gray-900 dark:text-white">{billedWeight} kg</strong>{" "}
              {isVolumetricBilled ? "(based on Volumetric Size)" : "(based on Actual Weight)"}
            </p>
            <span className="text-gray-400 dark:text-gray-500 block mt-0.5">
              Actual: {actualWeight} kg | Volumetric: {volumetricWeight} kg
            </span>
          </div>
        </div>

        {/* Calculation Table */}
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Base Handling Charge</span>
            <span className="font-semibold text-gray-900 dark:text-white">${baseCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>
              Distance Charge ({isIntraZone ? "Intra-zone" : "Inter-zone"})
              <span className="text-[11px] text-gray-400 block">${ratePerKg.toFixed(2)} / kg &times; {billedWeight} kg</span>
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">${(billedWeight * ratePerKg).toFixed(2)}</span>
          </div>

          {codSurcharge > 0 && (
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>COD Payment Surcharge</span>
              <span className="font-semibold text-gray-900 dark:text-white">${codSurcharge.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-dashed dark:border-gray-800 border-gray-200 my-3" />

          <div className="flex justify-between items-baseline pt-1">
            <span className="text-base font-bold text-gray-900 dark:text-white">Estimated Total</span>
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">${charge.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
