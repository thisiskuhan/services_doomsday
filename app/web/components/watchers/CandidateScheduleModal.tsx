"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    X,
    Clock,
    Timer,
    Zap,
    Settings2,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Activity
} from "lucide-react";
import { AnimatedBorderGlow } from "@/components/ui/shared";

// Types - Candidate type matches what CandidateList passes
interface Candidate {
  candidate_id: number;
  entity_name: string | null;
  entity_type: string;
  entity_signature: string;
  route_path: string | null;
  method: string | null;
  status: string;
  scan_frequency_minutes: number | null;
  analysis_period_hours: number | null;
  // Allow additional properties from ZombieCandidate
  [key: string]: unknown;
}

interface CandidateScheduleModalProps {
  candidates: Candidate[];
  userId: string;
  watcherId: string;
  applicationUrl: string | null;
  onClose: () => void;
  onScheduleComplete: () => void;
}

// Preset configurations - Minimum is 5 minutes per DB constraint
const SCAN_PRESETS = [
  { id: "frequent", label: "Frequent", description: "Every 5 min", minutes: 5, icon: <Zap size={16} /> },
  { id: "standard", label: "Standard", description: "Every 1 hour", minutes: 60, icon: <Clock size={16} /> },
  { id: "relaxed", label: "Relaxed", description: "Every 6 hours", minutes: 360, icon: <Timer size={16} /> },
  { id: "custom", label: "Custom", description: "Set your own", minutes: 0, icon: <Settings2 size={16} /> },
];

const PERIOD_PRESETS = [
  { id: "quick", label: "Quick", description: "6 hours", minutes: 360, icon: <Zap size={16} /> },
  { id: "standard", label: "Standard", description: "24 hours", minutes: 1440, icon: <Clock size={16} /> },
  { id: "extended", label: "Extended", description: "7 days", minutes: 10080, icon: <Timer size={16} /> },
  { id: "custom", label: "Custom", description: "Set your own", minutes: 0, icon: <Settings2 size={16} /> },
];

export function CandidateScheduleModal({
  candidates,
  userId,
  watcherId,
  applicationUrl,
  onClose,
  onScheduleComplete,
}: CandidateScheduleModalProps) {
  const isBulk = candidates.length > 1;
  const [scanPreset, setScanPreset] = useState("standard");
  const [periodPreset, setPeriodPreset] = useState("standard");
  const [customScanMinutes, setCustomScanMinutes] = useState(5);
  const [customPeriodMinutes, setCustomPeriodMinutes] = useState(120);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [healthResults, setHealthResults] = useState<Record<number, { healthy: boolean; message: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanMinutes = scanPreset === "custom" 
    ? customScanMinutes 
    : SCAN_PRESETS.find(p => p.id === scanPreset)?.minutes || 5;

  const periodMinutes = periodPreset === "custom" 
    ? customPeriodMinutes 
    : PERIOD_PRESETS.find(p => p.id === periodPreset)?.minutes || 120;

  // Run health check on mount
  useEffect(() => {
    const runHealthCheck = async () => {
      setIsHealthChecking(true);
      try {
        const response = await fetch("/api/candidates/health-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            candidateIds: candidates.map(c => c.candidate_id),
          }),
        });

        const data = await response.json();
        if (data.success && data.candidates) {
          const results: Record<number, { healthy: boolean; message: string }> = {};
          data.candidates.forEach((c: { candidateId: number; healthy: boolean; message: string }) => {
            results[c.candidateId] = { healthy: c.healthy, message: c.message };
          });
          setHealthResults(results);
        }
      } catch (err) {
        console.error("Health check failed:", err);
      } finally {
        setIsHealthChecking(false);
      }
    };

    if (candidates.length > 0) {
      runHealthCheck();
    }
  }, [candidates, userId]);

  const handleSubmit = async () => {
    // Validate - minimum 5 minutes per DB constraint
    if (scanMinutes < 5) {
      setError("Scan frequency must be at least 5 minutes");
      return;
    }
    if (periodMinutes < 10) {
      setError("Analysis period must be at least 10 minutes");
      return;
    }
    if (periodMinutes <= scanMinutes) {
      setError("Analysis period must be greater than scan frequency");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isBulk || candidates.length > 1) {
        // Bulk schedule
        const response = await fetch("/api/candidates/schedule/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            candidateIds: candidates.map(c => c.candidate_id),
            scanFrequencyMinutes: scanMinutes,
            analysisPeriodMinutes: periodMinutes,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to schedule candidates");
        }
      } else {
        // Single candidate schedule
        const response = await fetch(`/api/candidates/${candidates[0].candidate_id}/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            scanFrequencyMinutes: scanMinutes,
            analysisPeriodMinutes: periodMinutes,
            action: "schedule",
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to schedule candidate");
        }
      }

      onScheduleComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const healthyCount = Object.values(healthResults).filter(r => r.healthy).length;
  const unhealthyCount = Object.values(healthResults).filter(r => !r.healthy).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-lg w-full p-px rounded-2xl overflow-hidden"
      >
        <AnimatedBorderGlow duration={1.5} />

        <div className="relative bg-zinc-900 rounded-2xl z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isBulk ? `Schedule ${candidates.length} Candidates` : "Schedule Observation"}
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                {candidates.length === 1 
                  ? candidates[0].entity_name || candidates[0].entity_signature
                  : `${candidates.length} candidates selected`
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Health Check Status */}
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Health Check</span>
              </div>
              {isHealthChecking ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking endpoints and sources...
                </div>
              ) : (
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    {healthyCount} healthy
                  </span>
                  {unhealthyCount > 0 && (
                    <span className="flex items-center gap-1.5 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      {unhealthyCount} need attention
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Scan Frequency */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Scan Frequency
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SCAN_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setScanPreset(preset.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      scanPreset === preset.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    }`}
                  >
                    <div className={`mb-1 ${scanPreset === preset.id ? "text-emerald-400" : "text-zinc-400"}`}>
                      {preset.icon}
                    </div>
                    <p className={`text-xs font-medium ${scanPreset === preset.id ? "text-white" : "text-zinc-300"}`}>
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-zinc-500">{preset.description}</p>
                  </button>
                ))}
              </div>
              {scanPreset === "custom" && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={customScanMinutes}
                    onChange={(e) => setCustomScanMinutes(parseInt(e.target.value) || 1)}
                    className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-sm text-zinc-500">minutes</span>
                </div>
              )}
            </div>

            {/* Analysis Period */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Analysis Period
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PERIOD_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setPeriodPreset(preset.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      periodPreset === preset.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    }`}
                  >
                    <div className={`mb-1 ${periodPreset === preset.id ? "text-emerald-400" : "text-zinc-400"}`}>
                      {preset.icon}
                    </div>
                    <p className={`text-xs font-medium ${periodPreset === preset.id ? "text-white" : "text-zinc-300"}`}>
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-zinc-500">{preset.description}</p>
                  </button>
                ))}
              </div>
              {periodPreset === "custom" && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    value={customPeriodMinutes}
                    onChange={(e) => setCustomPeriodMinutes(parseInt(e.target.value) || 10)}
                    className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-sm text-zinc-500">minutes</span>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-zinc-800/30 rounded-lg p-3 text-sm">
              <p className="text-zinc-400">
                Observe every <span className="text-white font-medium">{scanMinutes} min</span> for{" "}
                <span className="text-white font-medium">
                  {periodMinutes >= 60 
                    ? `${(periodMinutes / 60).toFixed(periodMinutes % 60 === 0 ? 0 : 1)} hours`
                    : `${periodMinutes} minutes`
                  }
                </span>
                {" "}({Math.floor(periodMinutes / scanMinutes)} observations total)
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isHealthChecking}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? "Scheduling..." : "Start Observation"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
