"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconTrash, IconAlertTriangle } from "@tabler/icons-react";

// Animated border glow component for hover effect
type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const HoverBorderGlow = ({ isHovered, duration = 1 }: { isHovered: boolean; duration?: number }) => {
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(30% 70% at 50% 0%, hsl(0, 0%, 60%) 0%, rgba(161, 161, 170, 0) 100%)",
    LEFT: "radial-gradient(25% 60% at 0% 50%, hsl(0, 0%, 60%) 0%, rgba(161, 161, 170, 0) 100%)",
    BOTTOM: "radial-gradient(30% 70% at 50% 100%, hsl(0, 0%, 60%) 0%, rgba(161, 161, 170, 0) 100%)",
    RIGHT: "radial-gradient(25% 60% at 100% 50%, hsl(0, 0%, 60%) 0%, rgba(161, 161, 170, 0) 100%)",
  };

  useEffect(() => {
    if (!isHovered) return;
    
    const interval = setInterval(() => {
      setDirection((prevState) => rotateDirection(prevState));
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [isHovered, duration]);

  if (!isHovered) return null;

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0"
      style={{ filter: "blur(2px)" }}
      initial={{ opacity: 0, background: movingMap[direction] }}
      animate={{ opacity: 1, background: movingMap[direction] }}
      exit={{ opacity: 0 }}
      transition={{ ease: "linear", duration: duration }}
    />
  );
};

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
  onDelete: (watcherId: string) => Promise<void>;
  onClick: () => void;
}

// Format date to readable format
function formatDate(dateString: string): string {
  if (!dateString) return "Never";
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return dateString;
  }
}

// Extract repo name from GitHub URL
function extractRepoName(repoUrl: string): string {
  if (!repoUrl) return "";
  
  const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
  if (match) return match[1].replace(/\/$/, "");
  
  return repoUrl;
}

export function WatcherCard({ watcher, index, onSchedule, onDelete, onClick }: WatcherCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(watcher.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete watcher:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <IconAlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Delete Watcher</h3>
              </div>
              
              <p className="text-zinc-400 mb-2">
                Are you sure you want to delete <span className="text-white font-medium">{watcher.name}</span>?
              </p>
              <p className="text-zinc-500 text-sm mb-6">
                This will permanently remove the watcher and all {watcher.zombiesFound} zombie candidates. This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <IconTrash className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative rounded-2xl p-px cursor-hover"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <HoverBorderGlow isHovered={isHovered} duration={1} />
      <div className="relative bg-zinc-900/90 backdrop-blur-xl rounded-2xl p-6 transition-all group z-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
            {watcher.name}
          </h3>
          <span className="font-mono text-xs text-zinc-500">{extractRepoName(watcher.repo)}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status.color}`} />
            <span className={`text-xs font-medium ${status.textColor}`}>
              {status.text}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Delete watcher"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="text-2xl font-bold text-white">{watcher.zombiesFound}</p>
          <p className="text-xs text-zinc-500">Zombie Candidates</p>
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
        <span className="text-xs text-zinc-500">{formatDate(watcher.lastScan)}</span>
        {watcher.status === "pending_schedule" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSchedule();
            }}
            className="text-xs px-3 py-1.5 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg font-medium transition-colors cursor-hover"
          >
            Schedule
          </button>
        ) : (
          <span className="text-xs text-emerald-400 group-hover:text-emerald-300 transition-colors cursor-hover">
            View Details →
          </span>
        )}
      </div>
      </div>
    </motion.div>
    </>
  );
}
