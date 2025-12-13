"use client";

import { useState, useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";

interface ObservationEvent {
  eventId: number;
  observedAt: string;
  sourceType: string;
  httpStatus: number | null;
  responseTimeMs: number | null;
  trafficDetected: boolean;
  requestCount: number | null;
  errorType: string | null;
  errorMessage: string | null;
}

interface TrafficChartProps {
  events: ObservationEvent[];
  zombieScore?: number;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  traffic: number;
  errors: number;
  avgLatency: number | null;
}

type TimeRange = "hour" | "day" | "month";

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "hour", label: "24h" },
  { key: "day", label: "7d" },
  { key: "month", label: "30d" },
];

// Custom tooltip matching the dark theme
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-xs text-zinc-400 mb-1.5">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-zinc-300 capitalize">
            {entry.dataKey === "traffic" ? "Requests" : entry.dataKey}:
          </span>
          <span className="text-xs font-semibold text-white">
            {entry.value}
            {entry.dataKey === "avgLatency" ? "ms" : ""}
          </span>
        </div>
      ))}
    </div>
  );
};

// Helper functions for date manipulation
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDateKey = (date: Date, range: TimeRange): string => {
  if (range === "hour") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${String(date.getHours()).padStart(2, "0")}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatDisplayDate = (date: Date, range: TimeRange): string => {
  if (range === "hour") {
    const hour = date.getHours();
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}${ampm}`;
  }
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
};

const getTimeSlots = (range: TimeRange): Date[] => {
  const slots: Date[] = [];
  const now = new Date();

  if (range === "hour") {
    // Last 24 hours, hourly
    for (let i = 23; i >= 0; i--) {
      const slot = new Date(now);
      slot.setHours(now.getHours() - i, 0, 0, 0);
      slots.push(slot);
    }
  } else if (range === "day") {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const slot = new Date(now);
      slot.setDate(now.getDate() - i);
      slot.setHours(0, 0, 0, 0);
      slots.push(slot);
    }
  } else {
    // Last 30 days
    for (let i = 29; i >= 0; i--) {
      const slot = new Date(now);
      slot.setDate(now.getDate() - i);
      slot.setHours(0, 0, 0, 0);
      slots.push(slot);
    }
  }

  return slots;
};

const getEventDateKey = (eventDate: Date, range: TimeRange): string => {
  if (range === "hour") {
    const rounded = new Date(eventDate);
    rounded.setMinutes(0, 0, 0);
    return formatDateKey(rounded, range);
  }
  const startOfDay = new Date(eventDate);
  startOfDay.setHours(0, 0, 0, 0);
  return formatDateKey(startOfDay, range);
};

// Get risk level color based on zombie score
const getZombieRiskColor = (score: number): { bg: string; text: string; label: string } => {
  if (score >= 70) return { bg: "bg-red-500/20", text: "text-red-400", label: "High Risk" };
  if (score >= 40) return { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Medium" };
  if (score > 0) return { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Low" };
  return { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Unknown" };
};

export function TrafficChart({ events, zombieScore, className = "" }: TrafficChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("day");

  const chartData = useMemo((): ChartDataPoint[] => {
    const slots = getTimeSlots(timeRange);

    // Group events by time slot
    const eventsBySlot: Record<
      string,
      { traffic: number; errors: number; latencies: number[] }
    > = {};

    events.forEach((event) => {
      const eventDate = new Date(event.observedAt);
      const slotKey = getEventDateKey(eventDate, timeRange);

      if (!eventsBySlot[slotKey]) {
        eventsBySlot[slotKey] = { traffic: 0, errors: 0, latencies: [] };
      }

      if (event.trafficDetected) {
        eventsBySlot[slotKey].traffic += event.requestCount || 1;
      }

      if (event.errorType) {
        eventsBySlot[slotKey].errors += 1;
      }

      if (event.responseTimeMs) {
        eventsBySlot[slotKey].latencies.push(event.responseTimeMs);
      }
    });

    return slots.map((slot: Date) => {
      const slotKey = formatDateKey(slot, timeRange);
      const slotData = eventsBySlot[slotKey] || { traffic: 0, errors: 0, latencies: [] };
      const avgLatency =
        slotData.latencies.length > 0
          ? Math.round(
              slotData.latencies.reduce((a, b) => a + b, 0) / slotData.latencies.length
            )
          : null;

      return {
        date: slotKey,
        displayDate: formatDisplayDate(slot, timeRange),
        traffic: slotData.traffic,
        errors: slotData.errors,
        avgLatency,
      };
    });
  }, [events, timeRange]);

  const totalTraffic = chartData.reduce((sum, d) => sum + d.traffic, 0);
  const totalErrors = chartData.reduce((sum, d) => sum + d.errors, 0);
  const hasData = totalTraffic > 0 || totalErrors > 0;

  const tickInterval = timeRange === "hour" ? 3 : timeRange === "month" ? 4 : 0;

  const riskColor = zombieScore !== undefined ? getZombieRiskColor(zombieScore) : null;

  return (
    <div className={`${className}`}>
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-linear-to-r from-purple-500 to-pink-500" />
            <span className="text-xs text-zinc-400">Requests</span>
            <span className="text-sm font-semibold text-white">{totalTraffic}</span>
          </div>
          {totalErrors > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-zinc-400">Errors</span>
              <span className="text-sm font-semibold text-red-400">{totalErrors}</span>
            </div>
          )}
          {zombieScore !== undefined && riskColor && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${riskColor.bg}`}>
              <svg className={`w-3 h-3 ${riskColor.text}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className={`text-[10px] font-medium ${riskColor.text}`}>
                {riskColor.label}: {zombieScore}%
              </span>
            </div>
          )}
        </div>

        {/* Time Range Tabs */}
        <div className="flex items-center bg-zinc-800/50 rounded-lg p-0.5">
          {TIME_RANGES.map((range) => (
            <button
              key={range.key}
              onClick={() => setTimeRange(range.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                timeRange === range.key
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart or Empty State */}
      {!hasData ? (
        <div className="h-36 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-5 h-5 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-xs text-zinc-500">No traffic data</p>
          </div>
        </div>
      ) : (
        <div className="h-36 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D6A2D5" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#B57BC4" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#5B3F8D" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="displayDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 9 }}
                dy={8}
                interval={tickInterval}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 9 }}
                width={30}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />

              <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />

              {totalErrors > 0 && (
                <Area
                  type="monotone"
                  dataKey="errors"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  fill="url(#errorGradient)"
                  dot={false}
                  activeDot={{
                    r: 3,
                    fill: "#ef4444",
                    stroke: "#18181b",
                    strokeWidth: 2,
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey="traffic"
                stroke="#D6A2D5"
                strokeWidth={2}
                fill="url(#trafficGradient)"
                dot={false}
                activeDot={{
                  r: 3,
                  fill: "#D6A2D5",
                  stroke: "#18181b",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
