"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    GitBranch,
    Calendar,
    Clock,
    AlertTriangle,
    Shield,
    Server,
    Cpu,
    Route,
    Timer,
    MessageSquare,
    RefreshCw,
    Edit3,
    ChevronRight,
    Activity,
    CheckCircle,
    XCircle,
    ExternalLink,
    Trash2,
} from "lucide-react";

// Types
interface WatcherDetails {
  watcher_id: string;
  watcher_name: string;
  user_id: string;
  repo_url: string;
  repo_name: string;
  repo_description: string | null;
  default_branch: string;
  total_candidates: number;
  http_endpoints: number;
  cron_jobs: number;
  queue_workers: number;
  serverless_functions: number;
  websockets: number;
  grpc_services: number;
  graphql_resolvers: number;
  last_commit_hash: string | null;
  last_commit_message: string | null;
  last_commit_author: string | null;
  last_commit_date: string | null;
  llm_business_context: string | null;
  llm_tech_stack: Record<string, string[]> | null;
  llm_architecture: string | null;
  llm_health: { status: string; reasons: string[] } | null;
  llm_zombie_risk: { level: string; factors: string[] } | null;
  status: string;
  scan_count: number;
  created_at: string;
  updated_at: string;
  application_url: string | null;
  observation_type: string | null;
  scan_frequency_minutes: number | null;
  analysis_period_hours: number | null;
  next_observation_at: string | null;
}

interface ZombieCandidate {
  candidate_id: number;
  entity_type: string;
  entity_signature: string;
  entity_name: string | null;
  file_path: string;
  method: string | null;
  route_path: string | null;
  schedule: string | null;
  queue_name: string | null;
  framework: string | null;
  status: string;
  llm_purpose: string | null;
  llm_risk_score: number | null;
  llm_risk_reasoning: string | null;
  dependency_count: number;
  caller_count: number;
  scan_frequency_minutes: number | null;
  analysis_period_hours: number | null;
  has_traffic: boolean | null;
  last_traffic_at: string | null;
  traffic_count: number;
  zombie_score: number;
  discovered_at: string;
}

interface WatcherDetailModalProps {
  watcherId: string;
  userId: string;
  onClose: () => void;
  onDelete: (watcherId: string) => Promise<void>;
  onSchedule: () => void;
  onEditSchedule: () => void;
}

// Animated border glow
type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const AnimatedBorderGlow = ({ color = "emerald", duration = 2 }: { color?: "emerald" | "yellow" | "red"; duration?: number }) => {
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  const colorHsl = {
    emerald: "hsl(145, 80%, 45%)",
    yellow: "hsl(45, 100%, 50%)",
    red: "hsl(0, 80%, 50%)",
  };

  const colorRgba = {
    emerald: "rgba(16, 185, 129, 0)",
    yellow: "rgba(234, 179, 8, 0)",
    red: "rgba(239, 68, 68, 0)",
  };

  const movingMap: Record<Direction, string> = {
    TOP: `radial-gradient(30% 70% at 50% 0%, ${colorHsl[color]} 0%, ${colorRgba[color]} 100%)`,
    LEFT: `radial-gradient(25% 60% at 0% 50%, ${colorHsl[color]} 0%, ${colorRgba[color]} 100%)`,
    BOTTOM: `radial-gradient(30% 70% at 50% 100%, ${colorHsl[color]} 0%, ${colorRgba[color]} 100%)`,
    RIGHT: `radial-gradient(25% 60% at 100% 50%, ${colorHsl[color]} 0%, ${colorRgba[color]} 100%)`,
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
      style={{ filter: "blur(3px)" }}
      initial={{ background: movingMap[direction] }}
      animate={{ background: movingMap[direction] }}
      transition={{ ease: "linear", duration: duration }}
    />
  );
};

// Format date helper
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

// Format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "N/A";
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
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

// Format schedule time
function formatSchedule(minutes: number | null): string {
  if (!minutes) return "Not set";
  if (minutes < 1) return `${Math.round(minutes * 60)} seconds`;
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} hours`;
  return `${Math.round(hours / 24)} days`;
}

// Tab component
const Tab = ({ 
  label, 
  active, 
  onClick, 
  count 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void; 
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`relative px-4 py-2 text-sm font-medium transition-all ${
      active 
        ? "text-emerald-400" 
        : "text-zinc-500 hover:text-zinc-300"
    }`}
  >
    <span className="flex items-center gap-2">
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
          active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"
        }`}>
          {count}
        </span>
      )}
    </span>
    {active && (
      <motion.div
        layoutId="tab-indicator"
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
      />
    )}
  </button>
);

// Risk badge component
const RiskBadge = ({ score }: { score: number | null }) => {
  if (score === null) return <span className="text-zinc-500">-</span>;
  
  const percentage = Math.round(score * 100);
  let color = "text-emerald-400 bg-emerald-500/20";
  if (percentage >= 70) color = "text-red-400 bg-red-500/20";
  else if (percentage >= 40) color = "text-yellow-400 bg-yellow-500/20";
  
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${color}`}>
      {percentage}%
    </span>
  );
};

// Entity type icon
const EntityIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    http_endpoint: <Route className="w-4 h-4 text-blue-400" />,
    cron_job: <Timer className="w-4 h-4 text-purple-400" />,
    queue_worker: <MessageSquare className="w-4 h-4 text-orange-400" />,
    serverless_function: <Cpu className="w-4 h-4 text-cyan-400" />,
    websocket: <Activity className="w-4 h-4 text-green-400" />,
    grpc_service: <Server className="w-4 h-4 text-pink-400" />,
    graphql_resolver: <RefreshCw className="w-4 h-4 text-amber-400" />,
  };
  return icons[type] || <Server className="w-4 h-4 text-zinc-400" />;
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    pending_schedule: { bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-500" },
    scheduled: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500" },
    active: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500" },
    paused: { bg: "bg-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-500" },
  };
  
  const config = statusConfig[status] || statusConfig.paused;
  const label = status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
};

// Health indicator
const HealthIndicator = ({ health }: { health: WatcherDetails["llm_health"] | null }) => {
  if (!health) return <span className="text-zinc-500 text-sm">Not analyzed</span>;
  
  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    healthy: { icon: <CheckCircle className="w-4 h-4" />, color: "text-emerald-400" },
    warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-yellow-400" },
    critical: { icon: <XCircle className="w-4 h-4" />, color: "text-red-400" },
  };
  
  const config = statusConfig[health.status] || statusConfig.warning;
  
  return (
    <div className="flex items-start gap-2">
      <span className={config.color}>{config.icon}</span>
      <div>
        <p className={`text-sm font-medium ${config.color}`}>
          {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
        </p>
        {health.reasons && health.reasons.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {health.reasons.slice(0, 3).map((reason, i) => (
              <li key={i} className="text-xs text-zinc-500 flex items-start gap-1">
                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export function WatcherDetailModal({
  watcherId,
  userId,
  onClose,
  onDelete,
  onSchedule,
  onEditSchedule,
}: WatcherDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watcher, setWatcher] = useState<WatcherDetails | null>(null);
  const [candidates, setCandidates] = useState<ZombieCandidate[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "candidates" | "analysis">("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/watchers/${watcherId}?userId=${userId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch details");
        }

        setWatcher(data.watcher);
        setCandidates(data.candidates || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [watcherId, userId]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(watcherId);
      onClose();
    } catch (err) {
      console.error("Failed to delete:", err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const borderColor = watcher?.status === "pending_schedule" ? "yellow" : "emerald";

  // Render loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Loading watcher details...</p>
        </div>
      </motion.div>
    );
  }

  // Render error state
  if (error || !watcher) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Error Loading Details</h3>
          </div>
          <p className="text-zinc-400 mb-4">{error || "Watcher not found"}</p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-60 flex items-center justify-center bg-black/50"
            onClick={(e) => {
              e.stopPropagation();
              if (!isDeleting) setShowDeleteConfirm(false);
            }}
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
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Delete Watcher</h3>
              </div>
              
              <p className="text-zinc-400 mb-2">
                Are you sure you want to delete <span className="text-white font-medium">{watcher.watcher_name}</span>?
              </p>
              <p className="text-zinc-500 text-sm mb-6">
                This will permanently remove the watcher and all {watcher.total_candidates} zombie candidates. This action cannot be undone.
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
                      <Trash2 className="w-4 h-4" />
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
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl w-full h-[85vh] p-px rounded-2xl overflow-hidden"
      >
        <AnimatedBorderGlow color={borderColor} duration={1.5} />

        <div className="relative bg-zinc-900 rounded-2xl h-full flex flex-col z-10">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-zinc-800">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-white truncate">{watcher.watcher_name}</h2>
                <StatusBadge status={watcher.status} />
              </div>
              <a
                href={watcher.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                <span className="font-mono">{watcher.repo_name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete watcher"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-zinc-800 px-6">
            <Tab label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
            <Tab label="Candidates" active={activeTab === "candidates"} onClick={() => setActiveTab("candidates")} count={candidates.length} />
            <Tab label="LLM Analysis" active={activeTab === "analysis"} onClick={() => setActiveTab("analysis")} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-white">{watcher.total_candidates}</p>
                    <p className="text-xs text-zinc-500">Total Candidates</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-white">{watcher.http_endpoints}</p>
                    <p className="text-xs text-zinc-500">HTTP Endpoints</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-white">{watcher.cron_jobs}</p>
                    <p className="text-xs text-zinc-500">Cron Jobs</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-white">{watcher.scan_count}</p>
                    <p className="text-xs text-zinc-500">Scans Completed</p>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-medium text-white">Observation Schedule</h3>
                    </div>
                    {watcher.status === "pending_schedule" ? (
                      <button
                        onClick={() => {
                          onClose();
                          onSchedule();
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg transition-colors"
                      >
                        Set Schedule
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onClose();
                          onEditSchedule();
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Schedule
                      </button>
                    )}
                  </div>

                  {watcher.status === "pending_schedule" ? (
                    <p className="text-zinc-500 text-sm">
                      No schedule configured yet. Set a schedule to start monitoring for zombie candidates.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Scan Frequency</p>
                        <p className="text-sm text-white font-medium">
                          {formatSchedule(watcher.scan_frequency_minutes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Analysis Period</p>
                        <p className="text-sm text-white font-medium">
                          {formatSchedule(watcher.analysis_period_hours ? watcher.analysis_period_hours * 60 : null)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Observation Type</p>
                        <p className="text-sm text-white font-medium capitalize">
                          {watcher.observation_type || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Next Observation</p>
                        <p className="text-sm text-white font-medium">
                          {watcher.next_observation_at 
                            ? formatRelativeTime(watcher.next_observation_at)
                            : "Pending"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Git Info */}
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                  <div className="flex items-center gap-2 mb-4">
                    <GitBranch className="w-5 h-5 text-blue-400" />
                    <h3 className="font-medium text-white">Latest Commit</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Commit Hash</p>
                      <p className="text-sm text-white font-mono">
                        {watcher.last_commit_hash?.substring(0, 8) || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Author</p>
                      <p className="text-sm text-white">
                        {watcher.last_commit_author || "N/A"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-zinc-500 mb-1">Message</p>
                      <p className="text-sm text-zinc-300 line-clamp-2">
                        {watcher.last_commit_message || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-zinc-500">Created: </span>
                    <span className="text-zinc-300">{formatDate(watcher.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Updated: </span>
                    <span className="text-zinc-300">{formatRelativeTime(watcher.updated_at)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "candidates" && (
              <div className="space-y-3">
                {candidates.length === 0 ? (
                  <div className="text-center py-12">
                    <Server className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">No zombie candidates discovered yet</p>
                    <p className="text-zinc-500 text-sm mt-1">
                      Candidates will appear after the first scan
                    </p>
                  </div>
                ) : (
                  candidates.map((candidate) => (
                    <motion.div
                      key={candidate.candidate_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4 hover:border-zinc-600/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <EntityIcon type={candidate.entity_type} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-white truncate">
                                {candidate.entity_name || candidate.entity_signature}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 bg-zinc-700 text-zinc-400 rounded">
                                {candidate.entity_type.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 font-mono mt-1 truncate">
                              {candidate.file_path}
                            </p>
                            {candidate.llm_purpose && (
                              <p className="text-sm text-zinc-400 mt-2 line-clamp-2">
                                {candidate.llm_purpose}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <RiskBadge score={candidate.llm_risk_score} />
                          {candidate.method && candidate.route_path && (
                            <span className="text-xs font-mono text-zinc-500">
                              {candidate.method} {candidate.route_path}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Candidate schedule info if different from watcher */}
                      {(candidate.scan_frequency_minutes || candidate.analysis_period_hours) && (
                        <div className="mt-3 pt-3 border-t border-zinc-700/30 flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <Clock className="w-3 h-3" />
                            <span>Scan: {formatSchedule(candidate.scan_frequency_minutes)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <Timer className="w-3 h-3" />
                            <span>Period: {formatSchedule(candidate.analysis_period_hours ? candidate.analysis_period_hours * 60 : null)}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="space-y-6">
                {/* Business Context */}
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                  <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    Business Context
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {watcher.llm_business_context || "No business context analysis available."}
                  </p>
                </div>

                {/* Architecture */}
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                  <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Server className="w-4 h-4 text-purple-400" />
                    Architecture
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {watcher.llm_architecture || "No architecture analysis available."}
                  </p>
                </div>

                {/* Tech Stack */}
                {watcher.llm_tech_stack && (
                  <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      Tech Stack
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(watcher.llm_tech_stack).map(([category, items]) => (
                        <div key={category}>
                          <p className="text-xs text-zinc-500 mb-1.5 capitalize">{category}</p>
                          <div className="flex flex-wrap gap-2">
                            {(items as string[]).map((item, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 text-xs bg-zinc-700/50 text-zinc-300 rounded-md"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Health & Risk */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Project Health
                    </h3>
                    <HealthIndicator health={watcher.llm_health} />
                  </div>

                  <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                    <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      Zombie Risk
                    </h3>
                    {watcher.llm_zombie_risk ? (
                      <div>
                        <p className={`text-sm font-medium mb-2 ${
                          watcher.llm_zombie_risk.level === "high" 
                            ? "text-red-400" 
                            : watcher.llm_zombie_risk.level === "medium"
                            ? "text-yellow-400"
                            : "text-emerald-400"
                        }`}>
                          {watcher.llm_zombie_risk.level.charAt(0).toUpperCase() + watcher.llm_zombie_risk.level.slice(1)} Risk
                        </p>
                        {watcher.llm_zombie_risk.factors && watcher.llm_zombie_risk.factors.length > 0 && (
                          <ul className="space-y-0.5">
                            {watcher.llm_zombie_risk.factors.slice(0, 3).map((factor, i) => (
                              <li key={i} className="text-xs text-zinc-500 flex items-start gap-1">
                                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-sm">Not analyzed</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
