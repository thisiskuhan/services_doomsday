"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckSquare,
  Square,
  PlayCircle,
  PauseCircle,
  Calendar,
  ChevronRight,
  Filter,
  Radio,
  RefreshCw,
  Play,
  Loader2,
  Skull,
} from "lucide-react";
import { formatRelativeTime, getDerivedCandidateStatus } from "@/lib/utils";
import { CandidateStatusBadge, EntityIcon, ZombieScoreBadge, VerdictBadge } from "@/components/ui/shared";
import { KillSuccessDialog } from "@/components/ui/KillSuccessDialog";

// Types - Flexible candidate interface that accepts ZombieCandidate
interface Candidate {
  candidate_id: number;
  entity_type: string;
  entity_signature: string;
  entity_name: string | null;
  file_path: string;
  method: string | null;
  route_path: string | null;
  status: string;
  llm_purpose?: string | null;
  llm_risk_score?: number | null;
  scan_frequency_minutes: number | null;
  analysis_period_hours: number | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
  observation_count: number;
  zombie_score?: number;
  human_action?: string | null;
  pr_url?: string | null;
  // Allow additional properties
  [key: string]: unknown;
}

// Helper to determine verdict from status
function getVerdictFromStatus(status: string): "zombie" | "healthy" | "pending" | "watching" | null {
  switch (status) {
    case "killed":
    case "confirmed_zombie":
      return "zombie";
    case "healthy":
      return "healthy";
    case "pending_review":
      return "pending";
    case "active":
      return "watching";
    default:
      return null;
  }
}

interface CandidateListProps {
  candidates: Candidate[];
  watcherId: string;
  userId: string;
  onScheduleClick: (candidates: Candidate[]) => void;
  onRefresh: () => void;
}

type StatusFilter = "all" | "pending" | "active" | "paused" | "inactive" | "pending_review" | "killed" | "healthy";

export function CandidateList({
  candidates,
  watcherId,
  userId,
  onScheduleClick,
  onRefresh,
}: CandidateListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // Kill success dialog state
  const [killSuccessOpen, setKillSuccessOpen] = useState(false);
  const [killExecutionId, setKillExecutionId] = useState("");
  const [killEntitySignature, setKillEntitySignature] = useState("");

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    if (statusFilter === "all") return candidates;
    return candidates.filter((c) => c.status === statusFilter);
  }, [candidates, statusFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    const counts = { 
      all: candidates.length, 
      pending: 0, 
      active: 0, 
      paused: 0, 
      inactive: 0,
      pending_review: 0,
      killed: 0,
      healthy: 0
    };
    candidates.forEach((c) => {
      if (c.status in counts) {
        counts[c.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [candidates]);

  const pendingCandidates = filteredCandidates.filter((c) => c.status === "pending");

  // Pause/Resume handlers
  const handlePause = async (candidateId: number) => {
    setActionLoading(candidateId);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "pause" }),
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to pause:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (candidateId: number) => {
    setActionLoading(candidateId);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "resume" }),
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to resume:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleKillZombie = async (candidateId: number, entitySignature: string) => {
    const confirmed = window.confirm(
      `⚠️ KILL ZOMBIE: This will create a Pull Request to remove "${entitySignature}".\n\nAre you sure this code is dead?`
    );
    if (!confirmed) return;

    setActionLoading(candidateId);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/kill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error?.includes("GitHub token required")) {
          alert("GitHub token required. Please go to the candidate detail page to provide a token.");
          router.push(`/watchers/${watcherId}/candidates/${candidateId}`);
          return;
        }
        throw new Error(data.error || "Failed to kill zombie");
      }
      
      // Show success dialog
      setKillExecutionId(data.executionId);
      setKillEntitySignature(entitySignature);
      setKillSuccessOpen(true);
      onRefresh();
    } catch (error) {
      console.error("Failed to kill zombie:", error);
      alert(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Selection handlers
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const pendingIds = pendingCandidates.map((c) => c.candidate_id);
    setSelectedIds(new Set(pendingIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleScheduleSelected = () => {
    const selected = candidates.filter((c) => selectedIds.has(c.candidate_id));
    if (selected.length > 0) {
      onScheduleClick(selected);
    }
  };

  const handleCandidateClick = (candidateId: number) => {
    router.push(`/watchers/${watcherId}/candidates/${candidateId}`);
  };

  const allPendingSelected = pendingCandidates.length > 0 && 
    pendingCandidates.every((c) => selectedIds.has(c.candidate_id));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Status Filter */}
        <div className="flex flex-wrap items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
          {(["all", "active", "pending", "pending_review", "killed", "healthy", "paused"] as StatusFilter[]).map((status) => {
            const displayLabel = status === "pending_review" ? "Review" 
              : status === "killed" ? "Killed" 
              : status === "healthy" ? "Healthy"
              : status.charAt(0).toUpperCase() + status.slice(1);
            
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-medium rounded-md transition-colors ${
                  statusFilter === status
                    ? status === "killed" ? "bg-red-500 text-white"
                      : status === "healthy" ? "bg-green-500 text-white"
                      : status === "pending_review" ? "bg-purple-500 text-white"
                      : "bg-emerald-500 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {displayLabel}
                {statusCounts[status] > 0 && (
                  <span className="ml-1 text-[9px] md:text-[10px] opacity-70">({statusCounts[status]})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Refresh candidates"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Bulk Actions */}
          {pendingCandidates.length > 0 && (
            <>
            <button
              onClick={allPendingSelected ? deselectAll : selectAll}
              className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {allPendingSelected ? (
                <>
                  <Square className="w-3 h-3" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-3 h-3" />
                  Select All Pending
                </>
              )}
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleScheduleSelected}
                className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Calendar className="w-3 h-3" />
                Schedule {selectedIds.size} Selected
              </button>
            )}
            </>
          )}
        </div>
      </div>

      {/* Candidate List */}
      <div className="space-y-2">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No candidates match this filter</p>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <div
              key={candidate.candidate_id}
              className="group bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 hover:border-zinc-600/50 transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Selection checkbox (only for pending) */}
                {candidate.status === "pending" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(candidate.candidate_id);
                    }}
                    className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition-colors"
                  >
                    {selectedIds.has(candidate.candidate_id) ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                )}

                {/* Entity Icon */}
                <div className="mt-0.5">
                  <EntityIcon type={candidate.entity_type} />
                </div>

                {/* Content */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleCandidateClick(candidate.candidate_id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white text-sm truncate">
                      {candidate.entity_name || candidate.entity_signature}
                    </span>
                    <CandidateStatusBadge status={getDerivedCandidateStatus(candidate.status, candidate.observation_end_at as string | null)} />
                    {candidate.zombie_score !== undefined && candidate.zombie_score !== null && (
                      <ZombieScoreBadge score={candidate.zombie_score} size="sm" showLabel={false} />
                    )}
                    {getVerdictFromStatus(candidate.status) && (
                      <VerdictBadge verdict={getVerdictFromStatus(candidate.status)!} size="sm" />
                    )}
                    {candidate.method && candidate.route_path && (
                      <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded">
                        {candidate.method} {candidate.route_path}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-zinc-500 font-mono mt-1 truncate">
                    {candidate.file_path}
                  </p>

                  {/* Schedule info for active candidates */}
                  {candidate.status === "active" && candidate.scan_frequency_minutes && (
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Every {candidate.scan_frequency_minutes}min
                      </span>
                      {candidate.last_observed_at && (
                        <span className="flex items-center gap-1">
                          <Radio className="w-3 h-3" />
                          Last: {formatRelativeTime(candidate.last_observed_at)}
                        </span>
                      )}
                      {candidate.observation_count > 0 && (
                        <span>{candidate.observation_count} observations</span>
                      )}
                    </div>
                  )}
                  
                  {/* Info for pending review */}
                  {candidate.status === "pending_review" && (
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-purple-400">
                      <span>Awaiting human decision</span>
                    </div>
                  )}
                  
                  {/* Info for killed zombies with PR link */}
                  {candidate.status === "killed" && candidate.pr_url && (
                    <div className="flex items-center gap-2 mt-2 text-[10px]">
                      <a 
                        href={candidate.pr_url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View PR
                      </a>
                    </div>
                  )}
                  
                  {/* Info for healthy (false alerts) */}
                  {candidate.status === "healthy" && (
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-green-400">
                      <span>Marked as healthy (false alert)</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {candidate.status === "pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onScheduleClick([candidate]);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                      title="Schedule observation"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </button>
                  )}
                  {candidate.status === "active" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePause(candidate.candidate_id);
                      }}
                      disabled={actionLoading === candidate.candidate_id}
                      className="p-1.5 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors disabled:opacity-50"
                      title="Pause observation"
                    >
                      {actionLoading === candidate.candidate_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PauseCircle className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {candidate.status === "paused" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResume(candidate.candidate_id);
                      }}
                      disabled={actionLoading === candidate.candidate_id}
                      className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50"
                      title="Resume observation"
                    >
                      {actionLoading === candidate.candidate_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {/* Kill Zombie button for pending_review, confirmed_zombie, or high-risk */}
                  {(candidate.status === "pending_review" || 
                    candidate.status === "confirmed_zombie" ||
                    (candidate.status === "active" && (candidate.zombie_score ?? 0) >= 70)) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKillZombie(candidate.candidate_id, candidate.entity_signature);
                      }}
                      disabled={actionLoading === candidate.candidate_id}
                      data-variant="wanda"
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      title="Kill zombie - Create PR to remove"
                    >
                      {actionLoading === candidate.candidate_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Skull className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleCandidateClick(candidate.candidate_id)}
                    className="p-1.5 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    title="View details"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Kill Success Dialog */}
      <KillSuccessDialog
        isOpen={killSuccessOpen}
        onClose={() => setKillSuccessOpen(false)}
        executionId={killExecutionId}
        entitySignature={killEntitySignature}
      />
    </div>
  );
}
