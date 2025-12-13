"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatRelativeTime, extractRepoName, getZombieScoreLevel } from "@/lib/utils";
import { HoverBorderGlow } from "@/components/ui/shared";

interface ZombieWatcher {
  id: string;
  name: string;
  repo: string;
  status: "pending_schedule" | "partially_scheduled" | "active" | "paused";
  zombiesFound: number;
  lastScan: string;
  confidence: number;
  activeCandidates?: number;
  pendingCandidates?: number;
  avgZombieScore?: number | null;
}

interface WatcherCardProps {
  watcher: ZombieWatcher;
  index: number;
  onClick?: () => void;
}

export function WatcherCard({ watcher, index, onClick }: WatcherCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const statusConfig = {
    pending_schedule: {
      color: "bg-yellow-500",
      text: "Pending Schedule",
      textColor: "text-yellow-400",
    },
    partially_scheduled: {
      color: "bg-amber-500",
      text: "Partially Scheduled",
      textColor: "text-amber-400",
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
      className="relative rounded-2xl p-px cursor-hover"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <HoverBorderGlow isHovered={isHovered} duration={4} />
      <div className="relative bg-zinc-900/90 backdrop-blur-xl rounded-2xl p-6 transition-all group z-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
            {watcher.name}
          </h3>
          <span className="font-mono text-xs text-zinc-500">{extractRepoName(watcher.repo)}</span>
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
          <p className="text-xs text-zinc-500">Zombie Candidates</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          {watcher.avgZombieScore !== null && watcher.avgZombieScore !== undefined ? (
            <>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${getZombieScoreLevel(watcher.avgZombieScore).textColor}`}>
                  {Math.round(watcher.avgZombieScore)}
                </p>
                <span className="text-lg">{getZombieScoreLevel(watcher.avgZombieScore).emoji}</span>
              </div>
              <p className="text-xs text-zinc-500">Avg Zombie Score</p>
            </>
          ) : watcher.confidence > 0 ? (
            <>
              <p className={`text-2xl font-bold ${
                watcher.confidence > 75 
                  ? "text-red-400" 
                  : watcher.confidence >= 30 
                    ? "text-yellow-400" 
                    : "text-emerald-400"
              }`}>
                {watcher.confidence}%
              </p>
              <p className="text-xs text-zinc-500">Initial Confidence</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-zinc-600">-</p>
              <p className="text-xs text-zinc-500">Zombie Score</p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{formatRelativeTime(watcher.lastScan)}</span>
        {watcher.status === "pending_schedule" ? (
          <span className="text-xs text-yellow-400 group-hover:text-yellow-300 transition-colors cursor-hover">
            Set Schedule →
          </span>
        ) : watcher.status === "partially_scheduled" ? (
          <span className="text-xs text-amber-400 group-hover:text-amber-300 transition-colors cursor-hover">
            Continue Setup →
          </span>
        ) : (
          <span className="text-xs text-emerald-400 group-hover:text-emerald-300 transition-colors cursor-hover">
            View Details →
          </span>
        )}
      </div>
      </div>
    </motion.div>
  );
}
