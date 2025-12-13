/**
 * Candidate Detail Page
 *
 * Displays detailed information about a zombie candidate:
 *   - Entity metadata (type, signature, file path, method)
 *   - Observation stats (total observations, traffic, errors)
 *   - Zombie score with risk assessment
 *   - Recent observation events timeline
 *   - Actions: Schedule, Pause/Resume, Kill Zombie (PR creation)
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { DoomLoader } from "@/components/ui/DoomLoader";
import { formatDate, formatRelativeTime, formatFutureTime, sanitizeErrorMessage, getDerivedCandidateStatus } from "@/lib/utils";
import {
  AnimatedCard,
  EntityIcon,
  CandidateStatusBadge,
  RiskScore,
  StatCard,
} from "@/components/ui/shared";
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  FileCode,
  GitBranch,
  ExternalLink,
  PlayCircle,
  PauseCircle,
  Radio,
  TrendingUp,
  Zap,
  Skull,
  Loader2,
} from "lucide-react";
import { TrafficChart } from "@/components/ui/TrafficChart";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Types
interface CandidateDetails {
  id: number;
  watcherId: string;
  watcherName: string;
  entityType: string;
  entitySignature: string;
  entityName: string | null;
  filePath: string;
  method: string | null;
  routePath: string | null;
  schedule: string | null;
  queueName: string | null;
  framework: string | null;
  status: string;
  llmPurpose: string | null;
  llmRiskScore: number | null;
  llmRiskReasoning: string | null;
  dependencyCount: number;
  callerCount: number;
  scanFrequencyMinutes: number | null;
  analysisPeriodHours: number | null;
  nextObservationAt: string | null;
  observationEndAt: string | null;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  observationCount: number;
  hasTraffic: boolean | null;
  lastTrafficAt: string | null;
  trafficCount: number;
  zombieScore: number;
  discoveredAt: string;
  updatedAt: string;
  applicationUrl: string | null;
  observabilityUrls: Record<string, string> | null;
  repoUrl: string;
  repoName: string;
}

interface ObservationStats {
  totalObservations: number;
  withTraffic: number;
  withErrors: number;
  avgResponseTime: number | null;
  firstObservation: string | null;
  lastObservation: string | null;
}

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

export default function CandidateDetailPage() {
  const { user, loading: authLoading, githubToken: authGithubToken } = useAuth();
  const params = useParams();
  const router = useRouter();

  const candidateId = params.candidateId as string;
  const watcherId = params.watcherId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateDetails | null>(null);
  const [stats, setStats] = useState<ObservationStats | null>(null);
  const [events, setEvents] = useState<ObservationEvent[]>([]);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [killLoading, setKillLoading] = useState(false);
  const [showGithubTokenModal, setShowGithubTokenModal] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [showOptOutConfirm, setShowOptOutConfirm] = useState(false);
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const hasAnimated = useRef(false);

  const fetchCandidate = useCallback(async (isRefresh = false) => {
    if (!user?.uid) return;

    try {
      if (!isRefresh) setLoading(true);
      if (isRefresh) setRefreshing(true);
      const response = await fetch(`/api/candidates/${candidateId}?userId=${user.uid}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch candidate");
      }

      setCandidate(data.candidate);
      setStats(data.observationStats);
      setEvents(data.recentEvents || []);
      hasAnimated.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [candidateId, user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      fetchCandidate();
    }
  }, [fetchCandidate, user?.uid]);

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scanFrequencyMinutes: 5,
    analysisPeriodMinutes: 60,
  });

  const handlePauseResume = async () => {
    if (!candidate || !user?.uid) return;

    // For pending candidates, show the schedule form instead
    if (candidate.status === "pending") {
      setShowScheduleForm(true);
      return;
    }

    setActionLoading(true);
    try {
      const action = candidate.status === "active" ? "pause" : "resume";
      const response = await fetch(`/api/candidates/${candidateId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          action,
          scanFrequencyMinutes: candidate.scanFrequencyMinutes || 5,
          analysisPeriodMinutes: (candidate.analysisPeriodHours || 1) * 60,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update schedule");
      }

      await fetchCandidate();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOptOut = async () => {
    if (!candidate || !user?.uid) return;

    setShowOptOutConfirm(false);
    setActionLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          action: "opt_out",
          pauseReason: "user_opt_out",
          scanFrequencyMinutes: candidate.scanFrequencyMinutes || 5,
          analysisPeriodMinutes: (candidate.analysisPeriodHours || 1) * 60,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to opt-out candidate");
      }

      await fetchCandidate();
    } catch (err) {
      console.error("Opt-out failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleKillZombie = async (token?: string) => {
    if (!candidate || !user?.uid) return;

    // Use token priority: passed token > local state > auth context token
    const effectiveToken = token || githubToken || authGithubToken || undefined;

    setShowKillConfirm(false);
    setKillLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/kill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          githubToken: effectiveToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If no token, prompt for one (pre-fill with auth token if available)
        if (data.error?.includes("GitHub token required")) {
          if (authGithubToken) {
            setGithubToken(authGithubToken);
          }
          setShowGithubTokenModal(true);
          return;
        }
        throw new Error(data.error || "Failed to trigger kill workflow");
      }

      // Success - show message and refresh
      alert(`Kill workflow triggered!\n\nExecution ID: ${data.executionId}\n\nA Pull Request will be created to remove the dead code.`);
      setShowGithubTokenModal(false);
      setGithubToken("");
      await fetchCandidate();
    } catch (err) {
      console.error("Kill zombie failed:", err);
      alert(`Failed to kill zombie: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setKillLoading(false);
    }
  };

  const handleStartObservation = async () => {
    if (!candidate || !user?.uid) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          action: "schedule",
          scanFrequencyMinutes: scheduleForm.scanFrequencyMinutes,
          analysisPeriodMinutes: scheduleForm.analysisPeriodMinutes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start observation");
      }

      setShowScheduleForm(false);
      await fetchCandidate();
    } catch (err) {
      console.error("Start observation failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!candidate || !user?.uid) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          action: "reschedule",
          scanFrequencyMinutes: scheduleForm.scanFrequencyMinutes,
          analysisPeriodMinutes: scheduleForm.analysisPeriodMinutes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reschedule");
      }

      setShowScheduleForm(false);
      await fetchCandidate();
    } catch (err) {
      console.error("Reschedule failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DoomLoader
        text="Loading Candidate..."
        subText="Fetching observation data"
      />
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Error</h3>
          </div>
          <p className="text-zinc-400 mb-4">{error || "Candidate not found"}</p>
          <button
            onClick={() => router.push(`/watchers?openWatcher=${candidate?.watcherId || watcherId}&tab=candidates`)}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const trafficPercentage = stats && stats.totalObservations > 0
    ? Math.round((stats.withTraffic / stats.totalObservations) * 100)
    : 0;

  return (
    <div className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button & Header */}
        <motion.div
          initial={hasAnimated.current ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.push(`/watchers?openWatcher=${candidate.watcherId}&tab=candidates`)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Watcher
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-zinc-800 rounded-xl">
                <EntityIcon type={candidate.entityType} size="lg" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">
                    {candidate.entityName || candidate.entitySignature}
                  </h1>
                  <CandidateStatusBadge status={getDerivedCandidateStatus(candidate.status, candidate.observationEndAt)} />
                </div>
                <p className="text-zinc-500 text-sm mt-1">
                  {candidate.entityType.replace("_", " ")}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {candidate.status === "active" && (
                <button
                  onClick={handlePauseResume}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <span className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                  ) : (
                    <PauseCircle className="w-4 h-4" />
                  )}
                  Pause
                </button>
              )}
              {(candidate.status === "paused" || candidate.status === "pending") && (
                <button
                  onClick={handlePauseResume}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  {candidate.status === "pending" ? "Start Observation" : "Resume"}
                </button>
              )}
              {candidate.status !== "inactive" ? (
                <button
                  onClick={() => setShowOptOutConfirm(true)}
                  disabled={actionLoading}
                  data-variant="wanda"
                  className="px-3 py-2 text-sm font-medium text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  title="Opt this service out from observation"
                >
                  {actionLoading ? (
                    <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Opt-out
                </button>
              ) : (
                <div className="px-3 py-2 text-sm font-medium text-zinc-400 bg-zinc-800/30 border border-zinc-700/40 rounded-lg">
                  Opted out
                </div>
              )}
              {/* Kill Zombie Button - for pending_review, confirmed_zombie, or high-risk active */}
              {(candidate.status === "pending_review" || 
                candidate.status === "confirmed_zombie" ||
                (candidate.status === "active" && candidate.zombieScore >= 70)) && (
                <button
                  onClick={() => setShowKillConfirm(true)}
                  disabled={killLoading || actionLoading}
                  data-variant="wanda"
                  className="px-4 py-2 text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  title="Create PR to remove this dead code"
                >
                  {killLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Skull className="w-4 h-4" />
                  )}
                  Kill Zombie
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* GitHub Token Modal */}
        {showGithubTokenModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowGithubTokenModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Skull className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">GitHub Token Required</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                To create a Pull Request, we need a GitHub token with repo write access.
                {githubToken && authGithubToken && githubToken === authGithubToken && (
                  <span className="block mt-2 text-emerald-400">
                    ✓ Token auto-filled from your login session
                  </span>
                )}
              </p>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder={authGithubToken ? "Using OAuth token" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowGithubTokenModal(false);
                    setGithubToken("");
                  }}
                  className="flex-1 px-4 py-2 text-zinc-400 hover:text-white border border-zinc-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleKillZombie(githubToken)}
                  disabled={!githubToken || killLoading}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {killLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Skull className="w-4 h-4" />
                  )}
                  Kill Zombie
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Schedule Form for Pending Candidates */}
        {showScheduleForm && candidate.status === "pending" && (
          <motion.div
            initial={hasAnimated.current ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-zinc-900/50 border border-emerald-500/30 rounded-xl p-5"
          >
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Configure Observation Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Scan Frequency (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={scheduleForm.scanFrequencyMinutes}
                  onChange={(e) => setScheduleForm(prev => ({ 
                    ...prev, 
                    scanFrequencyMinutes: Math.max(1, parseInt(e.target.value) || 1)
                  }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-zinc-500 mt-1">Min: 1 min, Max: 24 hours</p>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Analysis Period (minutes)
                </label>
                <input
                  type="number"
                  min={10}
                  max={525600}
                  value={scheduleForm.analysisPeriodMinutes}
                  onChange={(e) => setScheduleForm(prev => ({ 
                    ...prev, 
                    analysisPeriodMinutes: Math.max(10, parseInt(e.target.value) || 10)
                  }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-zinc-500 mt-1">Min: 10 min, Max: 365 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleStartObservation}
                disabled={actionLoading || scheduleForm.analysisPeriodMinutes <= scheduleForm.scanFrequencyMinutes}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
                Start Observation
              </button>
              <button
                onClick={() => setShowScheduleForm(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              {scheduleForm.analysisPeriodMinutes <= scheduleForm.scanFrequencyMinutes && (
                <p className="text-xs text-red-400">Analysis period must be greater than scan frequency</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          initial={hasAnimated.current ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={hasAnimated.current ? undefined : { delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <StatCard
            label="Observations"
            value={stats?.totalObservations || 0}
            icon={<Radio className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Traffic Detected"
            value={`${trafficPercentage}%`}
            icon={<Activity className="w-5 h-5" />}
            color={trafficPercentage > 50 ? "emerald" : trafficPercentage > 0 ? "yellow" : "red"}
          />
          <StatCard
            label="Avg Response"
            value={stats?.avgResponseTime ? `${stats.avgResponseTime}ms` : "N/A"}
            icon={<Zap className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Error Count"
            value={stats?.withErrors || 0}
            icon={<AlertTriangle className="w-5 h-5" />}
            color={stats?.withErrors && stats.withErrors > 0 ? "red" : "emerald"}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Observation Schedule */}
            {candidate.status === "active" && candidate.scanFrequencyMinutes && (
              <AnimatedCard
                initialAnimation={!hasAnimated.current}
                delay={0.2}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-semibold text-white">Observation Schedule</h2>
                  </div>
                  {!showScheduleForm && (
                    <button
                      onClick={() => {
                        setScheduleForm({
                          scanFrequencyMinutes: candidate.scanFrequencyMinutes || 5,
                          analysisPeriodMinutes: (candidate.analysisPeriodHours || 1) * 60,
                        });
                        setShowScheduleForm(true);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Reschedule
                    </button>
                  )}
                </div>
                
                {showScheduleForm ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">Scan Frequency</label>
                        <select
                          value={scheduleForm.scanFrequencyMinutes}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, scanFrequencyMinutes: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value={1}>Every 1 min</option>
                          <option value={5}>Every 5 min</option>
                          <option value={15}>Every 15 min</option>
                          <option value={30}>Every 30 min</option>
                          <option value={60}>Every 1 hour</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block">Analysis Period</label>
                        <select
                          value={scheduleForm.analysisPeriodMinutes}
                          onChange={(e) => setScheduleForm(prev => ({ ...prev, analysisPeriodMinutes: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value={60}>1 hour</option>
                          <option value={180}>3 hours</option>
                          <option value={360}>6 hours</option>
                          <option value={720}>12 hours</option>
                          <option value={1440}>24 hours</option>
                          <option value={4320}>3 days</option>
                          <option value={10080}>7 days</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleReschedule}
                        disabled={actionLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionLoading ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : null}
                        Save Changes
                      </button>
                      <button
                        onClick={() => setShowScheduleForm(false)}
                        disabled={actionLoading}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Scan Frequency</p>
                      <p className="text-sm font-medium text-white">
                        Every {candidate.scanFrequencyMinutes} min
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Analysis Period</p>
                      <p className="text-sm font-medium text-white">
                        {candidate.analysisPeriodHours ? `${candidate.analysisPeriodHours}h` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Next Observation</p>
                      <p className="text-sm font-medium text-white">
                        {formatFutureTime(candidate.nextObservationAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">
                        {candidate.observationEndAt && new Date(candidate.observationEndAt) <= new Date() 
                          ? "Observation Ended" 
                          : "Ends At"}
                      </p>
                      <p className={`text-sm font-medium ${
                        candidate.observationEndAt && new Date(candidate.observationEndAt) <= new Date()
                          ? "text-cyan-400"
                          : "text-white"
                      }`}>
                        {candidate.observationEndAt && new Date(candidate.observationEndAt) <= new Date()
                          ? formatRelativeTime(candidate.observationEndAt)
                          : formatFutureTime(candidate.observationEndAt)}
                      </p>
                    </div>
                  </div>
                )}
              </AnimatedCard>
            )}

            {/* Traffic Overview */}
            <AnimatedCard
              initialAnimation={!hasAnimated.current}
              delay={0.3}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h2 className="font-semibold text-white">Traffic Overview</h2>
                </div>
                <button
                  onClick={() => fetchCandidate(true)}
                  disabled={refreshing}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Traffic Chart */}
              <TrafficChart events={events} zombieScore={candidate.zombieScore} />
            </AnimatedCard>

            {/* LLM Analysis */}
            <AnimatedCard
              initialAnimation={!hasAnimated.current}
              delay={0.4}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-white">Zombie Risk Analysis</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-zinc-500">Current Risk Score</p>
                    {candidate.llmRiskScore !== null && candidate.llmRiskScore !== candidate.zombieScore / 100 && (
                      <p className="text-[10px] text-zinc-600">
                        Initial: {Math.round(candidate.llmRiskScore * 100)}%
                      </p>
                    )}
                  </div>
                  <RiskScore score={candidate.zombieScore / 100} />
                </div>

                {candidate.llmPurpose && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Purpose</p>
                    <p className="text-sm text-zinc-300 text-justify">{candidate.llmPurpose}</p>
                  </div>
                )}

                {candidate.llmRiskReasoning && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Risk Reasoning</p>
                    <p className="text-sm text-zinc-400 text-justify">{candidate.llmRiskReasoning}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-800">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Dependencies</p>
                    <p className="text-lg font-bold text-white">{candidate.dependencyCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Callers</p>
                    <p className="text-lg font-bold text-white">{candidate.callerCount}</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Event Logs */}
            <AnimatedCard
              initialAnimation={!hasAnimated.current}
              delay={0.25}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <h2 className="font-semibold text-white text-sm">Event Logs</h2>
                </div>
                {events.length > 0 && (
                  <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">{events.length}</span>
                )}
              </div>

              {events.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-zinc-500 text-xs">No events yet</p>
                </div>
              ) : (
                <div className={`space-y-1.5 ${showAllEvents ? "max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent" : ""}`}>
                  {(showAllEvents ? events : events.slice(0, 2)).map((event, index) => (
                    <motion.div
                      key={event.eventId}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="p-2 bg-zinc-800/40 rounded-lg hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        {event.trafficDetected ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        ) : event.errorType ? (
                          <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-white font-medium truncate">
                              {event.sourceType || "direct"}
                            </span>
                            {event.httpStatus && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${event.httpStatus < 400
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {event.httpStatus}
                              </span>
                            )}
                          </div>
                          {event.errorMessage && (
                            <p className="text-[10px] text-red-400 mt-0.5 line-clamp-2">{sanitizeErrorMessage(event.errorMessage)}</p>
                          )}
                          <p className="text-[10px] text-zinc-600 mt-1">
                            {formatRelativeTime(event.observedAt)}
                            {event.responseTimeMs && ` · ${event.responseTimeMs}ms`}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {events.length > 2 && (
                    <button
                      onClick={() => setShowAllEvents(!showAllEvents)}
                      className="w-full mt-2 py-1.5 text-[10px] text-zinc-500 hover:text-white bg-zinc-800/30 hover:bg-zinc-800/60 rounded transition-all flex items-center justify-center gap-1"
                    >
                      <span>{showAllEvents ? "Show less" : `Show ${events.length - 2} more`}</span>
                      <motion.svg
                        animate={{ rotate: showAllEvents ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </button>
                  )}
                </div>
              )}
            </AnimatedCard>

            {/* File Info */}
            <AnimatedCard
              initialAnimation={!hasAnimated.current}
              delay={0.3}
            >
              <div className="flex items-center gap-2 mb-4">
                <FileCode className="w-5 h-5 text-zinc-400" />
                <h2 className="font-semibold text-white">Source</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">File Path</p>
                  <p className="text-sm text-zinc-300 font-mono break-all">
                    {candidate.filePath}
                  </p>
                </div>
                {candidate.framework && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Framework</p>
                    <span className="text-sm px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded">
                      {candidate.framework}
                    </span>
                  </div>
                )}
                {candidate.schedule && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Cron Schedule</p>
                    <span className="text-sm font-mono text-zinc-300">{candidate.schedule}</span>
                  </div>
                )}
                {candidate.queueName && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Queue</p>
                    <span className="text-sm font-mono text-zinc-300">{candidate.queueName}</span>
                  </div>
                )}
              </div>
            </AnimatedCard>

            {/* Watcher Info */}
            <AnimatedCard
              initialAnimation={!hasAnimated.current}
              delay={0.4}
            >
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-white">Watcher</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Watcher Name</p>
                  <p className="text-sm text-white">{candidate.watcherName}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Repository</p>
                  <a
                    href={candidate.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-emerald-400 transition-colors"
                  >
                    <span className="font-mono">{candidate.repoName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {candidate.applicationUrl && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Application URL</p>
                    <a
                      href={candidate.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-emerald-400 transition-colors break-all"
                    >
                      <span>{candidate.applicationUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </AnimatedCard>

            {/* Timestamps */}
            <AnimatedCard
              initialAnimation={!hasAnimated.current}
              delay={0.5}
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-zinc-400" />
                <h2 className="font-semibold text-white">Timeline</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Discovered</p>
                  <p className="text-sm text-zinc-300">{formatDate(candidate.discoveredAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">First Observed</p>
                  <p className="text-sm text-zinc-300">
                    {candidate.firstObservedAt
                      ? formatDate(candidate.firstObservedAt)
                      : "Not yet"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Last Observed</p>
                  <p className="text-sm text-zinc-300">
                    {candidate.lastObservedAt
                      ? formatDate(candidate.lastObservedAt)
                      : "Not yet"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Last Updated</p>
                  <p className="text-sm text-zinc-300">{formatDate(candidate.updatedAt)}</p>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </div>

      {/* Opt-out Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showOptOutConfirm}
        onClose={() => setShowOptOutConfirm(false)}
        onConfirm={handleOptOut}
        title="Opt-out from Observation"
        message="Are you sure you want to opt this service out from observation? This will stop all monitoring for this candidate. You can re-enable observation from the Watcher settings."
        confirmText="Opt-out"
        cancelText="Cancel"
        variant="warning"
        isLoading={actionLoading}
      />

      {/* Kill Zombie Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showKillConfirm}
        onClose={() => setShowKillConfirm(false)}
        onConfirm={() => handleKillZombie()}
        title="Kill Zombie"
        message={`This will create a Pull Request to remove "${candidate?.entitySignature || 'this code'}" from your codebase. Are you sure this code is dead and should be removed?`}
        confirmText="Kill Zombie"
        cancelText="Cancel"
        variant="zombie"
        isLoading={killLoading}
      />
    </div>
  );
}
