"use client";

import React from "react";
import {
  CheckCircle2,
  Package,
  Calendar,
  Compass,
  AlertTriangle,
  MapPin,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryItem {
  _id?: string;
  status: string;
  changedByName: string;
  timestamp: string | Date;
  isFailed?: boolean;
}

interface TimelineProps {
  currentStatus: string;
  history: HistoryItem[];
}

export default function Timeline({ currentStatus, history }: TimelineProps) {
  // Define standard steps in order
  const standardSteps = [
    { key: "Pending", label: "Order Placed", desc: "Shipment registered in system", icon: Package },
    { key: "Picked Up", label: "Picked Up", desc: "Agent collected the package", icon: Calendar },
    { key: "In Transit", label: "In Transit", desc: "Package moving between hubs", icon: Compass },
    { key: "Out for Delivery", label: "Out for Delivery", desc: "Agent is delivering today", icon: MapPin },
    { key: "Delivered", label: "Delivered", desc: "Package handed over", icon: CheckCircle2 },
  ];

  // Helper to check if a step occurred
  const getHistoryItem = (statusKey: string) => {
    // If the step is Delivered, we also look for Failed logs
    if (statusKey === "Delivered") {
      const failedLog = history.slice().reverse().find((h) => h.status === "Failed");
      const deliveredLog = history.slice().reverse().find((h) => h.status === "Delivered");
      if (failedLog && (!deliveredLog || new Date(failedLog.timestamp) > new Date(deliveredLog.timestamp))) {
        return { ...failedLog, isFailed: true };
      }
      return deliveredLog;
    }
    // Return the latest log matching this status key
    return history.find((h) => h.status === statusKey);
  };

  return (
    <div className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm">
      <h3 className="text-base font-bold dark:text-white text-gray-900 mb-6 flex items-center gap-2">
        <Clock size={18} className="text-blue-500" />
        Delivery Tracking Timeline
      </h3>

      <div className="relative border-l-2 dark:border-gray-800 border-gray-200 ml-4 pl-8 space-y-8 pb-2">
        {standardSteps.map((step) => {
          const log = getHistoryItem(step.key);
          const isActive = !!log;
          const isCurrent = currentStatus === step.key || (step.key === "Delivered" && currentStatus === "Failed");
          
          let StepIcon = step.icon;
          let iconColorClass = "text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800";
          let textColorClass = "text-gray-400 dark:text-gray-500";
          let labelText = step.label;
          let descText = step.desc;

          if (isActive) {
            if (log.isFailed || log.status === "Failed") {
              StepIcon = AlertTriangle;
              iconColorClass = "text-red-500 bg-red-500/10 border border-red-500/20";
              textColorClass = "text-red-600 dark:text-red-400";
              labelText = "Delivery Failed";
              descText = "Package delivery attempt unsuccessful";
            } else {
              iconColorClass = "text-blue-600 bg-blue-500/10 border border-blue-500/20 dark:text-blue-400";
              textColorClass = "text-gray-900 dark:text-white";
            }
          }

          if (isCurrent && !log?.isFailed) {
            iconColorClass = "text-blue-600 dark:text-blue-400 bg-blue-500/20 border-2 border-blue-500 animate-pulse-slow";
          }

          return (
            <div key={step.key} className="relative group">
              {/* Timeline dot / icon */}
              <div
                className={cn(
                  "absolute -left-[45px] top-0 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300",
                  iconColorClass
                )}
              >
                <StepIcon size={16} />
              </div>

              {/* Content block */}
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <h4 className={cn("text-sm font-bold", textColorClass)}>
                    {labelText}
                    {isCurrent && (
                      <span className={cn(
                        "ml-2 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                        currentStatus === "Failed" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                      )}>
                        {currentStatus === "Failed" ? "Failed" : "Current Status"}
                      </span>
                    )}
                  </h4>
                  {log && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{descText}</p>
                
                {log && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 border-gray-100 rounded px-2 py-1 w-fit">
                    <User size={10} />
                    <span>Updated by: <strong className="dark:text-gray-300 text-gray-700">{log.changedByName}</strong></span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
