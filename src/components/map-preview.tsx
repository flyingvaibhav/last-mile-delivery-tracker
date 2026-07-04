"use client";

import React, { useEffect, useState } from "react";
import { Navigation, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapPreviewProps {
  pickupPincode: string;
  dropPincode: string;
  pickupAddress: string;
  dropAddress: string;
  status: string;
  agentName?: string;
}

export default function MapPreview({
  pickupPincode,
  dropPincode,
  pickupAddress,
  dropAddress,
  status,
  agentName,
}: MapPreviewProps) {
  const [progress, setProgress] = useState(0);

  // Animate transit agent icon based on status
  useEffect(() => {
    if (status === "Pending") setProgress(0);
    else if (status === "Picked Up") setProgress(15);
    else if (status === "In Transit") setProgress(50);
    else if (status === "Out for Delivery") setProgress(85);
    else if (status === "Delivered") setProgress(100);
    else if (status === "Failed") setProgress(70); // stopped mid-way
  }, [status]);

  // Derive coordinates (mock coordinate generation from pincodes to keep it reliable)
  const getCoordinates = (pincode: string) => {
    let sum = 0;
    for (let i = 0; i < pincode.length; i++) {
      sum += pincode.charCodeAt(i);
    }
    // Generate coordinate pairs bounded between 15% and 85% of map bounds
    const x = 15 + (sum % 70);
    const y = 20 + ((sum * 3) % 60);
    return { x, y };
  };

  const pickupCoords = getCoordinates(pickupPincode || "10000");
  // If pincodes are same, offset drop coordinates slightly so they don't overlap
  let dropCoords = getCoordinates(dropPincode || "20000");
  if (pickupPincode === dropPincode) {
    dropCoords = { x: pickupCoords.x + 15, y: pickupCoords.y + 15 };
  }

  // Calculate current agent location along the linear path
  const agentX = pickupCoords.x + (dropCoords.x - pickupCoords.x) * (progress / 100);
  const agentY = pickupCoords.y + (dropCoords.y - pickupCoords.y) * (progress / 100);

  return (
    <div className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm overflow-hidden flex flex-col h-[350px]">
      {/* Map Header */}
      <div className="px-5 py-3 border-b dark:border-gray-800 border-gray-200 bg-gray-50/50 dark:bg-gray-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation size={15} className="text-blue-500 animate-spin-slow" />
          <span className="text-xs font-bold dark:text-gray-300 text-gray-700 uppercase tracking-wider">Live Route Simulation</span>
        </div>
        <span className="text-[10px] dark:bg-blue-950/50 dark:text-blue-400 bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold">
          Active: {status}
        </span>
      </div>

      {/* Map View Area */}
      <div className="flex-1 relative dark:bg-[#080b13] bg-[#f1f5f9] overflow-hidden select-none">
        {/* Futuristic Map Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* SVG Drawing Canvas */}
        <svg className="absolute inset-0 w-full h-full">
          {/* Route path */}
          <line
            x1={`${pickupCoords.x}%`}
            y1={`${pickupCoords.y}%`}
            x2={`${dropCoords.x}%`}
            y2={`${dropCoords.y}%`}
            stroke="url(#routeGradient)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Dash animated path overlays */}
          {status !== "Delivered" && status !== "Pending" && (
            <line
              x1={`${pickupCoords.x}%`}
              y1={`${pickupCoords.y}%`}
              x2={`${dropCoords.x}%`}
              y2={`${dropCoords.y}%`}
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray="6 8"
              strokeLinecap="round"
              className="animate-route-flow"
              style={{
                strokeDashoffset: 100,
                animation: "routeFlow 4s linear infinite",
              }}
            />
          )}

          {/* Define Gradient */}
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>

        {/* CSS Animations style definition */}
        <style jsx global>{`
          @keyframes routeFlow {
            to { stroke-dashoffset: 0; }
          }
          .animate-spin-slow {
            animation: spin 8s linear infinite;
          }
        `}</style>

        {/* Pickup Pin */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group z-10"
          style={{ left: `${pickupCoords.x}%`, top: `${pickupCoords.y}%` }}
        >
          <div className="absolute -inset-1 rounded-full bg-blue-500/20 dark:bg-blue-500/30 blur-sm animate-ping" />
          <div className="h-7 w-7 rounded-lg bg-blue-600 border border-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 cursor-pointer">
            <span className="text-[10px] font-extrabold font-mono">A</span>
          </div>
          <div className="absolute top-8 dark:bg-gray-900 bg-white border dark:border-gray-800 border-gray-200 px-2 py-1 rounded shadow text-[10px] font-bold whitespace-nowrap hidden group-hover:block z-20">
            Pickup Pincode: {pickupPincode}
          </div>
        </div>

        {/* Drop Pin */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group z-10"
          style={{ left: `${dropCoords.x}%`, top: `${dropCoords.y}%` }}
        >
          <div className="absolute -inset-1 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 blur-sm" />
          <div className="h-7 w-7 rounded-lg bg-emerald-600 border border-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 cursor-pointer">
            <span className="text-[10px] font-extrabold font-mono">B</span>
          </div>
          <div className="absolute top-8 dark:bg-gray-900 bg-white border dark:border-gray-800 border-gray-200 px-2 py-1 rounded shadow text-[10px] font-bold whitespace-nowrap hidden group-hover:block z-20">
            Drop Pincode: {dropPincode}
          </div>
        </div>

        {/* Transit Agent Marker */}
        {status !== "Pending" && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 transition-all duration-1000 ease-out"
            style={{ left: `${agentX}%`, top: `${agentY}%` }}
          >
            <div className={cn(
              "h-8 w-8 rounded-full border flex items-center justify-center shadow-lg transition-colors",
              status === "Failed" 
                ? "bg-red-500 border-red-400 text-white shadow-red-500/20" 
                : status === "Delivered" 
                  ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20"
                  : "bg-blue-500 border-blue-400 text-white shadow-blue-500/20"
            )}>
              {status === "Failed" ? (
                <AlertTriangle size={14} className="animate-bounce" />
              ) : (
                <Truck size={14} className={cn(status !== "Delivered" && "animate-pulse")} />
              )}
            </div>
            {agentName && (
              <span className="absolute -bottom-6 bg-gray-900/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap border border-gray-800">
                {agentName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Map Footer Info */}
      <div className="px-5 py-2.5 dark:bg-gray-950 bg-gray-50 border-t dark:border-gray-800 border-gray-200 grid grid-cols-2 gap-4 text-[10px] dark:text-gray-400 text-gray-600 font-medium">
        <span className="truncate">From: <strong>{pickupAddress}</strong></span>
        <span className="truncate text-right">To: <strong>{dropAddress}</strong></span>
      </div>
    </div>
  );
}

// Add simple AlertTriangle placeholder
const AlertTriangle = ({ size, className }: { size: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
