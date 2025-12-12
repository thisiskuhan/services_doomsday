"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Eye, Zap, Clock, Timer, Settings2 } from "lucide-react";

// Animated border glow component for the modal
type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const AnimatedBorderGlow = ({ duration = 2 }: { duration?: number }) => {
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(30% 70% at 50% 0%, hsl(145, 80%, 45%) 0%, rgba(16, 185, 129, 0) 100%)",
    LEFT: "radial-gradient(25% 60% at 0% 50%, hsl(145, 80%, 45%) 0%, rgba(16, 185, 129, 0) 100%)",
    BOTTOM: "radial-gradient(30% 70% at 50% 100%, hsl(145, 80%, 45%) 0%, rgba(16, 185, 129, 0) 100%)",
    RIGHT: "radial-gradient(25% 60% at 100% 50%, hsl(145, 80%, 45%) 0%, rgba(16, 185, 129, 0) 100%)",
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection((prevState) => rotateDirection(prevState));
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0"
      style={{
        filter: "blur(3px)",
      }}
      initial={{ background: movingMap[direction] }}
      animate={{ background: movingMap[direction] }}
      transition={{ ease: "linear", duration: duration }}
    />
  );
};

// Segmented Button Component
interface SegmentedButtonProps {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
}

const SegmentedButton = ({ options, selected, onChange }: SegmentedButtonProps) => (
  <div className="flex bg-zinc-800/70 rounded-lg p-1 gap-1">
    {options.map((option) => (
      <button
        key={option.value}
        onClick={() => onChange(option.value)}
        className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-hover ${
          selected === option.value
            ? "text-white"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        {selected === option.value && (
          <motion.div
            layoutId="segment-bg"
            className="absolute inset-0 bg-emerald-500 rounded-md"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative z-10">{option.label}</span>
      </button>
    ))}
  </div>
);

// Preset Card Component
interface PresetCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  color?: "emerald" | "blue" | "purple" | "amber";
}

const PresetCard = ({ icon, label, description, selected, onClick, color = "emerald" }: PresetCardProps) => {
  const colorClasses = {
    emerald: {
      border: selected ? "border-emerald-500" : "border-zinc-700/50 hover:border-zinc-600",
      bg: selected ? "bg-emerald-500/10" : "bg-zinc-800/30 hover:bg-zinc-800/50",
      icon: selected ? "text-emerald-400" : "text-zinc-400",
      glow: selected ? "shadow-emerald-500/20" : "",
    },
    blue: {
      border: selected ? "border-blue-500" : "border-zinc-700/50 hover:border-zinc-600",
      bg: selected ? "bg-blue-500/10" : "bg-zinc-800/30 hover:bg-zinc-800/50",
      icon: selected ? "text-blue-400" : "text-zinc-400",
      glow: selected ? "shadow-blue-500/20" : "",
    },
    purple: {
      border: selected ? "border-purple-500" : "border-zinc-700/50 hover:border-zinc-600",
      bg: selected ? "bg-purple-500/10" : "bg-zinc-800/30 hover:bg-zinc-800/50",
      icon: selected ? "text-purple-400" : "text-zinc-400",
      glow: selected ? "shadow-purple-500/20" : "",
    },
    amber: {
      border: selected ? "border-amber-500" : "border-zinc-700/50 hover:border-zinc-600",
      bg: selected ? "bg-amber-500/10" : "bg-zinc-800/30 hover:bg-zinc-800/50",
      icon: selected ? "text-amber-400" : "text-zinc-400",
      glow: selected ? "shadow-amber-500/20" : "",
    },
  };

  const classes = colorClasses[color];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-3 rounded-xl border ${classes.border} ${classes.bg} transition-all cursor-hover text-left ${selected ? `shadow-lg ${classes.glow}` : ""}`}
    >
      <div className={`${classes.icon} mb-2`}>{icon}</div>
      <p className={`text-sm font-medium ${selected ? "text-white" : "text-zinc-300"}`}>{label}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute top-2 right-2 w-2 h-2 rounded-full ${color === "emerald" ? "bg-emerald-400" : color === "blue" ? "bg-blue-400" : color === "purple" ? "bg-purple-400" : "bg-amber-400"}`}
        />
      )}
    </motion.button>
  );
};

interface ZombieWatcher {
  id: string;
  name: string;
  zombiesFound: number;
  scanFrequencySeconds?: number | null;
  analysisPeriodHours?: number | null;
  observationType?: "uniform" | "varied" | null;
}

interface ScheduleModalProps {
  watcher: ZombieWatcher;
  onSubmit: (data: {
    scanFrequencySeconds: number;
    analysisPeriodHours: number;
    forAllServices: boolean;
  }) => void;
  onClose: () => void;
  isEditing?: boolean;
}

// Preset configurations
const SCAN_PRESETS = [
  { id: "realtime", label: "Real-time", description: "Every 30 sec", seconds: 30, icon: <Zap size={18} />, color: "emerald" as const },
  { id: "frequent", label: "Frequent", description: "Every 5 min", seconds: 300, icon: <Timer size={18} />, color: "blue" as const },
  { id: "standard", label: "Standard", description: "Every 15 min", seconds: 900, icon: <Clock size={18} />, color: "purple" as const },
  { id: "custom", label: "Custom", description: "Set your own", seconds: 0, icon: <Settings2 size={18} />, color: "amber" as const },
];

const PERIOD_PRESETS = [
  { id: "quick", label: "Quick Scan", description: "6 hours", hours: 6, icon: <Zap size={18} />, color: "emerald" as const },
  { id: "daily", label: "Daily", description: "24 hours", hours: 24, icon: <Timer size={18} />, color: "blue" as const },
  { id: "weekly", label: "Weekly", description: "7 days", hours: 168, icon: <Clock size={18} />, color: "purple" as const },
  { id: "custom", label: "Custom", description: "Set your own", hours: 0, icon: <Settings2 size={18} />, color: "amber" as const },
];

export function ScheduleModal({ watcher, onSubmit, onClose, isEditing = false }: ScheduleModalProps) {
  // Helper to determine preset from seconds
  const getPresetFromSeconds = (seconds: number | null | undefined): string => {
    if (!seconds) return "standard";
    if (seconds <= 30) return "realtime";
    if (seconds <= 300) return "frequent";
    if (seconds <= 900) return "standard";
    return "custom";
  };

  // Helper to determine preset from hours
  const getPresetFromHours = (hours: number | null | undefined): string => {
    if (!hours) return "weekly";
    if (hours <= 6) return "quick";
    if (hours <= 24) return "daily";
    if (hours <= 168) return "weekly";
    return "custom";
  };

  // Initialize values based on editing mode
  const initialScanPreset = isEditing ? getPresetFromSeconds(watcher.scanFrequencySeconds) : "standard";
  const initialPeriodPreset = isEditing ? getPresetFromHours(watcher.analysisPeriodHours) : "weekly";
  
  const [scanPreset, setScanPreset] = useState(initialScanPreset);
  const [periodPreset, setPeriodPreset] = useState(initialPeriodPreset);
  
  // Calculate custom values from existing data
  const getCustomScanValue = () => {
    if (!watcher.scanFrequencySeconds) return { value: 15, unit: "minutes" as const };
    const seconds = watcher.scanFrequencySeconds;
    if (seconds < 60) return { value: seconds, unit: "seconds" as const };
    if (seconds < 3600) return { value: Math.round(seconds / 60), unit: "minutes" as const };
    return { value: Math.round(seconds / 3600), unit: "hours" as const };
  };
  
  const getCustomPeriodValue = () => {
    if (!watcher.analysisPeriodHours) return { value: 30, unit: "days" as const };
    const hours = watcher.analysisPeriodHours;
    if (hours < 1) return { value: Math.round(hours * 60), unit: "minutes" as const };
    if (hours < 24) return { value: Math.round(hours), unit: "hours" as const };
    return { value: Math.round(hours / 24), unit: "days" as const };
  };

  const [customScan, setCustomScan] = useState<{ value: number; unit: "seconds" | "minutes" | "hours" }>(
    isEditing && initialScanPreset === "custom" ? getCustomScanValue() : { value: 15, unit: "minutes" }
  );
  const [customPeriod, setCustomPeriod] = useState<{ value: number; unit: "minutes" | "hours" | "days" }>(
    isEditing && initialPeriodPreset === "custom" ? getCustomPeriodValue() : { value: 30, unit: "days" }
  );
  const [forAllServices, setForAllServices] = useState(
    isEditing ? watcher.observationType === "uniform" : true
  );

  // Calculate final values
  const getFrequencyInSeconds = (): number => {
    if (scanPreset !== "custom") {
      return SCAN_PRESETS.find(p => p.id === scanPreset)?.seconds || 900;
    }
    switch (customScan.unit) {
      case "seconds": return customScan.value;
      case "minutes": return customScan.value * 60;
      case "hours": return customScan.value * 3600;
      default: return customScan.value * 60;
    }
  };

  const getPeriodInHours = (): number => {
    if (periodPreset !== "custom") {
      return PERIOD_PRESETS.find(p => p.id === periodPreset)?.hours || 168;
    }
    switch (customPeriod.unit) {
      case "minutes": return customPeriod.value / 60;
      case "hours": return customPeriod.value;
      case "days": return customPeriod.value * 24;
      default: return customPeriod.value * 24;
    }
  };

  const handleSubmit = () => {
    onSubmit({
      scanFrequencySeconds: getFrequencyInSeconds(),
      analysisPeriodHours: getPeriodInHours(),
      forAllServices,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-lg w-full p-px rounded-2xl overflow-visible"
      >
        {/* Animated glowing border */}
        <AnimatedBorderGlow duration={1.5} />
        
        {/* Inner modal content */}
        <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Calendar className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? "Edit Schedule" : "Schedule Observation"}
              </h2>
              <p className="text-xs text-zinc-500">{watcher.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg cursor-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form - Fixed height container to prevent layout shifts */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Scan Frequency Section */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Scan Frequency
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SCAN_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  icon={preset.icon}
                  label={preset.label}
                  description={preset.description}
                  selected={scanPreset === preset.id}
                  onClick={() => setScanPreset(preset.id)}
                  color={preset.color}
                />
              ))}
            </div>
            
            {/* Custom Scan Input - Always reserve space */}
            <div className="h-[52px] mt-3">
              {scanPreset === "custom" ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-amber-500/20 h-full"
                >
                  <input
                    type="number"
                    min="1"
                    value={customScan.value}
                    onChange={(e) => setCustomScan({ ...customScan, value: parseInt(e.target.value) || 1 })}
                    className="w-24 bg-zinc-800/70 border border-zinc-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-amber-500 transition-all text-center"
                  />
                  <SegmentedButton
                    options={[
                      { value: "seconds", label: "Sec" },
                      { value: "minutes", label: "Min" },
                      { value: "hours", label: "Hr" },
                    ]}
                    selected={customScan.unit}
                    onChange={(v) => setCustomScan({ ...customScan, unit: v as "seconds" | "minutes" | "hours" })}
                  />
                </motion.div>
              ) : (
                <div className="h-full flex items-center">
                  <p className="text-xs text-zinc-500">
                    How often to check observability sources for traffic
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Period Section */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Analysis Period
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PERIOD_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  icon={preset.icon}
                  label={preset.label}
                  description={preset.description}
                  selected={periodPreset === preset.id}
                  onClick={() => setPeriodPreset(preset.id)}
                  color={preset.color}
                />
              ))}
            </div>
            
            {/* Custom Period Input - Always reserve space */}
            <div className="h-[52px] mt-3">
              {periodPreset === "custom" ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-amber-500/20 h-full"
                >
                  <input
                    type="number"
                    min="1"
                    value={customPeriod.value}
                    onChange={(e) => setCustomPeriod({ ...customPeriod, value: parseInt(e.target.value) || 1 })}
                    className="w-24 bg-zinc-800/70 border border-zinc-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-amber-500 transition-all text-center"
                  />
                  <SegmentedButton
                    options={[
                      { value: "minutes", label: "Min" },
                      { value: "hours", label: "Hours" },
                      { value: "days", label: "Days" },
                    ]}
                    selected={customPeriod.unit}
                    onChange={(v) => setCustomPeriod({ ...customPeriod, unit: v as "minutes" | "hours" | "days" })}
                  />
                </motion.div>
              ) : (
                <div className="h-full flex items-center">
                  <p className="text-xs text-zinc-500">
                    Endpoints with no traffic in this period are flagged as zombies
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* For All Services Toggle - Fixed height section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
              <div>
                <p className="text-sm font-medium text-zinc-300">Apply to all services</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Use same settings for all {watcher.zombiesFound} endpoints
                </p>
              </div>
              <button
                onClick={() => setForAllServices(!forAllServices)}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-hover ${
                  forAllServices ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <motion.div
                  layout
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full`}
                  animate={{ x: forAllServices ? 26 : 4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Per-endpoint info - Always reserve space */}
            <div className="h-[72px]">
              {!forAllServices && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 h-full"
                >
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Eye size={16} />
                    <p className="text-sm font-medium">Per-endpoint settings</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Configure individual settings for each endpoint after saving.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-500 hidden sm:block">
            {isEditing 
              ? "Your observation data will be preserved"
              : "Observation will start after scheduling"
            }
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 text-zinc-400 hover:text-white font-medium text-sm transition-colors cursor-hover"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-hover"
            >
              <Calendar size={16} />
              {isEditing ? "Update Schedule" : "Schedule Observation"}
            </motion.button>
          </div>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
