"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  X,
  GitBranch,
  AlertTriangle,
  Shield,
  Server,
  Cpu,
  MessageSquare, ExternalLink,
  Trash2,
  Link2
} from "lucide-react";
import { ObservationSources } from "./ObservationSources";
import { CandidateList } from "./CandidateList";
import { CandidateScheduleModal } from "./CandidateScheduleModal";
import { ScarletWitchIcon } from "@/components/ui/CustomCursor";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { AnimatedBorderGlow, WatcherStatusBadge } from "@/components/ui/shared";

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
  llm_health: {
    activity_level?: string;
    documentation_quality?: string;
    test_coverage?: string;
    code_quality?: string;
  } | null;
  llm_zombie_risk: { level: string; score?: number; reasoning?: string; factors?: string[]; high_risk_areas?: string[] } | null;
  status: string;
  scan_count: number;
  created_at: string;
  updated_at: string;
  application_url: string | null;
  observability_urls: Record<string, string> | null;
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
  first_observed_at: string | null;
  last_observed_at: string | null;
  observation_count: number;
  has_traffic: boolean | null;
  last_traffic_at: string | null;
  traffic_count: number;
  zombie_score: number;
  discovered_at: string;
  // Index signature for flexibility with CandidateScheduleModal
  [key: string]: unknown;
}

interface WatcherDetailModalProps {
  watcherId: string;
  userId: string;
  onClose: () => void;
  onDelete: (watcherId: string) => Promise<void>;
  initialTab?: "overview" | "candidates" | "analysis";
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

export function WatcherDetailModal({
  watcherId,
  userId,
  onClose,
  onDelete,
  initialTab = "overview",
}: WatcherDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watcher, setWatcher] = useState<WatcherDetails | null>(null);
  const [candidates, setCandidates] = useState<ZombieCandidate[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "candidates" | "analysis">(initialTab);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [candidatesToSchedule, setCandidatesToSchedule] = useState<ZombieCandidate[]>([]);

  // Derive status from candidates
  const derivedStatus = useMemo(() => {
    if (candidates.length === 0) return watcher?.status || "pending_schedule";
    
    const activeCandidates = candidates.filter(c => c.status === "active").length;
    const pendingCandidates = candidates.filter(c => c.status === "pending").length;
    
    if (activeCandidates === candidates.length) return "active";
    if (activeCandidates > 0) return "partially_scheduled";
    if (pendingCandidates === candidates.length) return "pending_schedule";
    return watcher?.status || "pending_schedule";
  }, [candidates, watcher?.status]);

  const fetchDetails = useCallback(async () => {
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
  }, [watcherId, userId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

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

  const handleScheduleClick = (selectedCandidates: Array<{ candidate_id: number; [key: string]: unknown }>) => {
    // Cast to ZombieCandidate for internal use
    setCandidatesToSchedule(selectedCandidates as ZombieCandidate[]);
    setShowScheduleModal(true);
  };

  const handleScheduleComplete = () => {
    setShowScheduleModal(false);
    setCandidatesToSchedule([]);
    // Refresh data
    fetchDetails();
  };

  const borderColor = derivedStatus === "pending_schedule" ? "yellow" 
    : derivedStatus === "partially_scheduled" ? "yellow"
    : "emerald";

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
                <WatcherStatusBadge status={derivedStatus} />
              </div>
              {watcher.application_url && (
                <a
                  href={watcher.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="font-mono truncate max-w-[300px]">{watcher.application_url}</span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                data-variant="wanda"
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
            <Tab label="Analysis" active={activeTab === "analysis"} onClick={() => setActiveTab("analysis")} />
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
                    <p className="text-2xl font-bold text-emerald-400">
                      {candidates.filter(c => c.status === "active").length}
                    </p>
                    <p className="text-xs text-zinc-500">Active Observations</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-yellow-400">
                      {candidates.filter(c => c.status === "pending").length}
                    </p>
                    <p className="text-xs text-zinc-500">Pending Schedule</p>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-white">{watcher.scan_count}</p>
                    <p className="text-xs text-zinc-500">Scans Completed</p>
                  </div>
                </div>

                {/* Observation Sources */}
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Link2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-medium text-white">Observation Sources</h3>
                  </div>
                  <ObservationSources
                    watcherId={watcherId}
                    applicationUrl={watcher.application_url}
                    existingSources={watcher.observability_urls || {}}
                    onSourcesChange={() => fetchDetails()}
                  />
                </div>

                {/* Git Info */}
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-blue-400" />
                      <h3 className="font-medium text-white">Repository</h3>
                    </div>
                    <a
                      href={watcher.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-variant="captain"
                      className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-blue-400 transition-colors"
                    >
                      <span className="font-mono">{watcher.repo_name}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  
                  {/* Repository Description */}
                  {watcher.repo_description && (
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                      {watcher.repo_description}
                    </p>
                  )}

                  {/* Commit Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Branch</p>
                      <p className="text-sm text-white font-mono truncate">
                        {watcher.default_branch || "main"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Commit</p>
                      <button
                        onClick={() => {
                          if (watcher.last_commit_hash) {
                            navigator.clipboard.writeText(watcher.last_commit_hash);
                          }
                        }}
                        data-variant="captain"
                        className="text-sm text-blue-400 hover:text-blue-300 font-mono transition-colors cursor-pointer"
                        title="Click to copy full hash"
                      >
                        {watcher.last_commit_hash?.substring(0, 7) || "N/A"}
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Author</p>
                      <p className="text-sm text-white truncate">
                        {watcher.last_commit_author || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Committed</p>
                      <p className="text-sm text-zinc-300">
                        {watcher.last_commit_date ? formatRelativeTime(watcher.last_commit_date) : "N/A"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Commit Message */}
                  {watcher.last_commit_message && (
                    <div className="mt-3 pt-3 border-t border-zinc-700/30">
                      <p className="text-xs text-zinc-500 mb-1">Latest Commit Message</p>
                      <p className="text-sm text-zinc-300 line-clamp-2">
                        {watcher.last_commit_message}
                      </p>
                    </div>
                  )}
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
              <CandidateList
                candidates={candidates}
                watcherId={watcherId}
                userId={userId}
                onScheduleClick={handleScheduleClick}
                onRefresh={fetchDetails}
              />
            )}

            {activeTab === "analysis" && (
              <div className="space-y-6">
                {/* Health & Risk Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project Health Card */}
                  <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-xl p-4 border border-zinc-700/50 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                          <Shield className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-medium text-white">Project Health</h3>
                      </div>
                      {watcher.llm_health && Object.keys(watcher.llm_health).length > 0 && (() => {
                        const metrics = [
                          watcher.llm_health.activity_level,
                          watcher.llm_health.documentation_quality,
                          watcher.llm_health.code_quality
                        ];
                        const scoreMap: Record<string, number> = { good: 100, active: 100, moderate: 60, stale: 40, poor: 20, abandoned: 10, none: 0 };
                        const scores = metrics.map(m => scoreMap[m?.toLowerCase() || ""] ?? 50);
                        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                        const color = avg >= 70 ? "text-emerald-400" : avg >= 40 ? "text-yellow-400" : "text-red-400";
                        return <span className={`text-xl font-bold ${color}`}>{avg}%</span>;
                      })()}
                    </div>
                    {watcher.llm_health && Object.keys(watcher.llm_health).length > 0 ? (
                      <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                        {[
                          { label: "Activity", value: watcher.llm_health.activity_level },
                          { label: "Documentation", value: watcher.llm_health.documentation_quality },
                          { label: "Code Quality", value: watcher.llm_health.code_quality },
                        ].map((metric, i) => {
                          const v = metric.value?.toLowerCase() || "";
                          const scoreMap: Record<string, number> = { good: 100, active: 100, moderate: 60, stale: 40, poor: 20, abandoned: 10, none: 0 };
                          const score = scoreMap[v] ?? 50;
                          const barColor = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
                          const textColor = score >= 70 ? "text-emerald-400" : score >= 40 ? "text-yellow-400" : "text-red-400";
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-zinc-400">{metric.label}</span>
                                <span className={`text-xs font-medium capitalize ${textColor}`}>{metric.value || "Unknown"}</span>
                              </div>
                              <div className="h-1.5 bg-zinc-700/50 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">Not analyzed</p>
                    )}
                  </div>

                  {/* Zombie Risk Card */}
                  <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-xl p-4 border border-zinc-700/50 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${
                          watcher.llm_zombie_risk?.level === "high" ? "bg-red-500/10" 
                          : watcher.llm_zombie_risk?.level === "medium" ? "bg-yellow-500/10"
                          : "bg-emerald-500/10"
                        }`}>
                        <AlertTriangle className={`w-4 h-4 ${
                          watcher.llm_zombie_risk?.level === "high" ? "text-red-400" 
                          : watcher.llm_zombie_risk?.level === "medium" ? "text-yellow-400"
                          : "text-emerald-400"
                        }`} />
                      </div>
                      <h3 className="text-sm font-medium text-white">Zombie Risk</h3>
                      </div>
                      {watcher.llm_zombie_risk?.score !== undefined && (() => {
                        const riskPercent = Math.round(watcher.llm_zombie_risk.score * 100);
                        const color = riskPercent >= 70 ? "text-red-400" : riskPercent >= 40 ? "text-yellow-400" : "text-emerald-400";
                        return <span className={`text-xl font-bold ${color}`}>{riskPercent}%</span>;
                      })()}
                    </div>
                    {watcher.llm_zombie_risk ? (
                      <div className="flex-1 flex flex-col justify-center items-center">
                        {/* Animated Pulse Indicator */}
                        <div className="relative mb-2">
                          {/* Pulse rings - color based on risk level */}
                          <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
                            watcher.llm_zombie_risk.level === "high" ? "bg-red-500"
                            : watcher.llm_zombie_risk.level === "medium" ? "bg-yellow-500"
                            : "bg-emerald-500"
                          }`} style={{ animationDuration: "2s" }} />
                          {/* Center circle with Wanda - always red glow, border color based on risk */}
                          <div className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.6),0_0_50px_rgba(239,68,68,0.3),0_0_75px_rgba(239,68,68,0.1)] ${
                            watcher.llm_zombie_risk.level === "high" ? "bg-red-500/20 border-2 border-red-500/50"
                            : watcher.llm_zombie_risk.level === "medium" ? "bg-yellow-500/20 border-2 border-yellow-500/50"
                            : "bg-emerald-500/20 border-2 border-emerald-500/50"
                          }`}>
                            <ScarletWitchIcon className="w-14 h-14" />
                          </div>
                        </div>

                        {/* Risk Level Label */}
                        <span className={`text-sm font-semibold capitalize ${
                          watcher.llm_zombie_risk.level === "high" ? "text-red-400"
                          : watcher.llm_zombie_risk.level === "medium" ? "text-yellow-400"
                          : "text-emerald-400"
                        }`}>
                          {watcher.llm_zombie_risk.level} Risk
                        </span>
                        
                        {/* High Risk Areas */}
                        {watcher.llm_zombie_risk.high_risk_areas && watcher.llm_zombie_risk.high_risk_areas.length > 0 && (
                          <div className="pt-2 mt-2 border-t border-zinc-700/30 w-full">
                            <div className="flex flex-wrap gap-1.5 justify-center">
                              {watcher.llm_zombie_risk.high_risk_areas.slice(0, 3).map((area, i) => (
                                <span key={i} className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded-md">
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 flex-1 flex items-center justify-center">Not analyzed</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                  <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    Description
                  </h3>
                  <div className="text-sm text-zinc-300 leading-relaxed text-justify prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-headings:text-zinc-200 prose-strong:text-zinc-200">
                    <ReactMarkdown>
                      {watcher.llm_business_context || "No analysis available."}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Architecture */}
                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/50">
                  <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                    <Server className="w-4 h-4 text-purple-400" />
                    Architecture
                  </h3>
                  <div className="text-sm text-zinc-300 leading-relaxed text-justify prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:text-zinc-200 prose-headings:text-base prose-strong:text-zinc-200 prose-code:text-emerald-400 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    <ReactMarkdown>
                      {watcher.llm_architecture || "No architecture analysis available."}
                    </ReactMarkdown>
                  </div>
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
              </div>
            )}
          </div>
        </div>

        {/* Candidate Schedule Modal */}
        <AnimatePresence>
          {showScheduleModal && candidatesToSchedule.length > 0 && (
            <CandidateScheduleModal
              candidates={candidatesToSchedule}
              watcherId={watcherId}
              userId={userId}
              applicationUrl={watcher?.application_url || null}
              onClose={() => {
                setShowScheduleModal(false);
                setCandidatesToSchedule([]);
              }}
              onScheduleComplete={handleScheduleComplete}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
