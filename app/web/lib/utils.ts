/**
 * Utility Functions and Constants Module
 *
 * Provides common utilities for the application:
 *   - cn(): Tailwind CSS class merging utility
 *   - formatDate(): Human-readable date formatting
 *   - formatRelativeTime(): Relative time (e.g., "2h ago")
 *   - formatRelativeTimeVerbose(): Verbose relative time with pluralization
 *   - extractRepoName(): Extract repo name from GitHub URL
 *   - parseJavaMapString(): Parse Java/Groovy Map toString format
 *   - getZombieScoreLevel(): Get zombie score classification
 *
 * Constants:
 *   - ENTITY_TYPES: Supported entity type configurations
 *   - CANDIDATE_STATUS_CONFIG: Candidate status styling
 *   - WATCHER_STATUS_CONFIG: Watcher status styling
 *   - OBSERVABILITY_SOURCE_TYPES: Supported observability sources
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | null): string {
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
    return "Unknown";
  }
}

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Unknown";
  }
}

export function formatRelativeTimeVerbose(dateString: string | null): string {
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
    return "Unknown";
  }
}

export function extractRepoName(repoUrl: string): string {
  if (!repoUrl) return "";
  const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
  if (match) return match[1].replace(/\/$/, "");
  return repoUrl;
}

export function parseJavaMapString(str: string): Record<string, string> | null {
  if (!str || typeof str !== 'string') return null;
  
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  
  const inner = trimmed.slice(1, -1);
  const result: Record<string, string> = {};
  
  const regex = /(\w+)=([^,}]+(?:,(?!\s*\w+=)[^,}]*)*)/g;
  let match;
  while ((match = regex.exec(inner)) !== null) {
    result[match[1].trim()] = match[2].trim();
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

export const ENTITY_TYPES = {
  http_endpoint: { label: "HTTP Endpoint", color: "blue" },
  cron_job: { label: "Cron Job", color: "purple" },
  queue_worker: { label: "Queue Worker", color: "orange" },
  serverless_function: { label: "Serverless Function", color: "cyan" },
  websocket: { label: "WebSocket", color: "green" },
  grpc_service: { label: "gRPC Service", color: "pink" },
  graphql_resolver: { label: "GraphQL Resolver", color: "amber" },
} as const;

export const CANDIDATE_STATUS_CONFIG = {
  pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-500", label: "Pending Schedule" },
  active: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500", label: "Observing" },
  paused: { bg: "bg-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-500", label: "Paused" },
  completed: { bg: "bg-blue-500/20", text: "text-blue-400", dot: "bg-blue-500", label: "Completed" },
  inactive: { bg: "bg-zinc-600/20", text: "text-zinc-500", dot: "bg-zinc-600", label: "Inactive" },
  // W3/W4 statuses
  pending_review: { bg: "bg-purple-500/20", text: "text-purple-400", dot: "bg-purple-500", label: "Pending Review" },
  confirmed_zombie: { bg: "bg-red-500/20", text: "text-red-400", dot: "bg-red-500", label: "Confirmed Zombie" },
  killed: { bg: "bg-red-600/20", text: "text-red-500", dot: "bg-red-600", label: "Killed" },
  healthy: { bg: "bg-green-500/20", text: "text-green-400", dot: "bg-green-500", label: "Healthy" },
} as const;

export interface ZombieScoreLevel {
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export function getZombieScoreLevel(score: number): ZombieScoreLevel {
  if (score >= 80) {
    return { 
      label: "ZOMBIE", 
      emoji: "", 
      color: "red",
      textColor: "text-red-400",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500/50"
    };
  }
  if (score >= 60) {
    return { 
      label: "HIGH RISK", 
      emoji: "", 
      color: "orange",
      textColor: "text-orange-400",
      bgColor: "bg-orange-500/20",
      borderColor: "border-orange-500/50"
    };
  }
  if (score >= 40) {
    return { 
      label: "SUSPECT", 
      emoji: "", 
      color: "yellow",
      textColor: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/50"
    };
  }
  if (score >= 20) {
    return { 
      label: "LOW RISK", 
      emoji: "", 
      color: "blue",
      textColor: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/50"
    };
  }
  return { 
    label: "HEALTHY", 
    emoji: "", 
    color: "green",
    textColor: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/50"
  };
}

export const WATCHER_STATUS_CONFIG = {
  pending_schedule: { bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-500", label: "Pending Schedule" },
  partially_scheduled: { bg: "bg-amber-500/20", text: "text-amber-400", dot: "bg-amber-500", label: "Partially Scheduled" },
  scheduled: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500", label: "Scheduled" },
  active: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500", label: "Active" },
  paused: { bg: "bg-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-500", label: "Paused" },
} as const;

export const OBSERVABILITY_SOURCE_TYPES = [
  { id: "prometheus", value: "prometheus", label: "Prometheus", placeholder: "https://prometheus.example.com/api/v1/query" },
  { id: "grafana", value: "grafana", label: "Grafana", placeholder: "https://grafana.example.com" },
  { id: "loki", value: "loki", label: "Loki", placeholder: "https://loki.example.com/loki/api/v1/query" },
  { id: "datadog", value: "datadog", label: "Datadog", placeholder: "https://api.datadoghq.com" },
  { id: "cloudwatch", value: "cloudwatch", label: "CloudWatch", placeholder: "arn:aws:logs:region:account:log-group" },
  { id: "newrelic", value: "newrelic", label: "New Relic", placeholder: "https://api.newrelic.com" },
  { id: "custom", value: "custom", label: "Custom", placeholder: "https://..." },
] as const;
