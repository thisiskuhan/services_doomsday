"use client";

import { motion } from "framer-motion";
import { Eye, GitBranch } from "lucide-react";

interface ZombieWatcher {
  id: string;
  name: string;
  repo: string;
  status: "pending_schedule" | "scheduled" | "active" | "paused";
  zombiesFound: number;
  lastScan: string;
  confidence: number;
  observationType?: "uniform" | "varied" | null;
}

interface WatcherCardProps {
  watcher: ZombieWatcher;
  index: number;
  onSchedule: () => void;
}

export function WatcherCard({ watcher, index, onSchedule }: WatcherCardProps) {
  const statusConfig = {
    pending_schedule: {
      color: "bg-yellow-500",
      text: "Pending Schedule",
      textColor: "text-yellow-400",
    },
    scheduled: {
      color: "bg-emerald-500",
      text: "Scheduled",
      textColor: "text-emerald-400",
    },
    active: {
      color: "bg-emerald-500",
      text: "Active",
      textColor: "text-emerald-400",
    },
    paused: {
      color: "bg-zinc-500",
      text: "Paused",
      textColor: "text-zinc-400",
    },
  };

  const status = statusConfig[watcher.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 hover:border-emerald-500/30 rounded-2xl p-6 transition-all group cursor-hover"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Eye className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
              {watcher.name}
            </h3>
            <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="font-mono text-xs">{watcher.repo}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status.color}`} />
          <span className={`text-xs font-medium ${status.textColor}`}>
            {status.text}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="text-2xl font-bold text-white">{watcher.zombiesFound}</p>
          <p className="text-xs text-zinc-500">Zombies Found</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="text-2xl font-bold text-white">
            {watcher.confidence > 0 ? `${watcher.confidence}%` : "-"}
          </p>
          <p className="text-xs text-zinc-500">Confidence</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{watcher.lastScan}</span>
        {watcher.status === "pending_schedule" ? (
          <button
            onClick={onSchedule}
            className="text-xs px-3 py-1.5 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg font-medium transition-colors cursor-hover"
          >
            Schedule
          </button>
        ) : (
          <button className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-hover">
            View Details →
          </button>
        )}
      </div>
    </motion.div>
  );
}
