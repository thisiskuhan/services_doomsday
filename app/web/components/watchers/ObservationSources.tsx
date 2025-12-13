"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    X,
    Check,
    AlertCircle,
    Loader2,
    ExternalLink,
    Trash2,
    Eye,
    EyeOff
} from "lucide-react";
import { parseJavaMapString, OBSERVABILITY_SOURCE_TYPES } from "@/lib/utils";

// Source can be either array format (from creation) or object format
type ObservabilitySource = {
  type: string;
  url: string;
  token?: string | null;
  userId?: string | null;
};

type ObservabilityData = ObservabilitySource[] | Record<string, string> | null;

interface ObservationSourcesProps {
  watcherId: string;
  applicationUrl: string | null;
  existingSources: ObservabilityData;
  onSourcesChange: () => void;
}

// Normalize data to array format
function normalizeSourcesData(data: ObservabilityData): ObservabilitySource[] {
  if (!data) return [];
  
  // Already an array
  if (Array.isArray(data)) {
    return data
      .map(item => {
        // If item is already an object with url
        if (item && typeof item === 'object' && 'url' in item) {
          return item as ObservabilitySource;
        }
        // If item is a Java Map string like "{url=..., type=...}"
        if (typeof item === 'string') {
          return parseJavaMapString(item);
        }
        return null;
      })
      .filter((s): s is ObservabilitySource => s !== null && !!s.url);
  }
  
  // Object format {type: url} - convert to array
  if (typeof data === 'object') {
    return Object.entries(data).map(([type, url]) => ({
      type,
      url: String(url),
      token: null
    }));
  }
  
  return [];
}

export function ObservationSources({
  watcherId,
  applicationUrl,
  existingSources,
  onSourcesChange,
}: ObservationSourcesProps) {
  const normalizedSources = useMemo(() => normalizeSourcesData(existingSources), [existingSources]);
  const [sources, setSources] = useState<ObservabilitySource[]>(normalizedSources);
  const [isAdding, setIsAdding] = useState(false);
  const [newSourceType, setNewSourceType] = useState("prometheus");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceToken, setNewSourceToken] = useState("");
  const [newSourceUserId, setNewSourceUserId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  const handleValidate = async () => {
    if (!newSourceUrl.trim()) {
      setValidationResult({ valid: false, message: "Please enter a URL" });
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch(`/api/watchers/${watcherId}/sources/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: newSourceType,
          sourceUrl: newSourceUrl,
          token: newSourceToken || undefined,
        }),
      });

      const data = await response.json();
      setValidationResult({ valid: data.valid, message: data.message });
    } catch {
      setValidationResult({ valid: false, message: "Validation failed" });
    } finally {
      setValidating(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceUrl.trim()) {
      setValidationResult({ valid: false, message: "Please enter a URL" });
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/watchers/${watcherId}/sources`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          source: {
            type: newSourceType,
            url: newSourceUrl,
            token: newSourceToken || null,
            userId: newSourceUserId || null,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add source");
      }

      setSources(normalizeSourcesData(data.sources));
      onSourcesChange();
      setIsAdding(false);
      setNewSourceUrl("");
      setNewSourceToken("");
      setNewSourceUserId("");
      setValidationResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add source");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSource = async (index: number) => {
    try {
      const response = await fetch(`/api/watchers/${watcherId}/sources`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          index,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove source");
      }

      setSources(normalizeSourcesData(data.sources));
      onSourcesChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove source");
    }
  };

  // Get source types not yet used (except custom which can be used multiple times)
  const usedTypes = new Set(sources.map(s => s.type));
  const availableTypes = OBSERVABILITY_SOURCE_TYPES.filter(
    (t) => !usedTypes.has(t.id) || t.id === "custom"
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case "prometheus": return "text-orange-400 bg-orange-500/10";
      case "grafana": return "text-yellow-400 bg-yellow-500/10";
      case "loki": return "text-cyan-400 bg-cyan-500/10";
      case "datadog": return "text-purple-400 bg-purple-500/10";
      case "cloudwatch": return "text-blue-400 bg-blue-500/10";
      case "newrelic": return "text-green-400 bg-green-500/10";
      default: return "text-zinc-400 bg-zinc-500/10";
    }
  };

  return (
    <div className="space-y-4">
      {/* Configured Sources */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Observability Sources</p>
        
        {sources.length === 0 ? (
          <p className="text-sm text-zinc-500 italic py-2">No sources configured</p>
        ) : (
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div
                key={`${source.type}-${index}`}
                className="bg-zinc-800/50 rounded-lg overflow-hidden group"
              >
                {/* Main row */}
                <div 
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                  onClick={() => setExpandedSource(expandedSource === index ? null : index)}
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                  <span className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${getTypeColor(source.type)}`}>
                    {source.type}
                  </span>
                  <span className="flex-1 text-sm text-zinc-300 truncate font-mono">
                    {source.url}
                  </span>
                  {source.token && (
                    <span className="text-xs text-zinc-500 px-1.5 py-0.5 bg-zinc-700/50 rounded">
                      Auth
                    </span>
                  )}
                  {/* Only show delete button if there's more than one source */}
                  {sources.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSource(index);
                      }}
                      data-variant="wanda"
                      className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove source"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Expanded details */}
                <AnimatePresence>
                  {expandedSource === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-700/50 bg-zinc-900/50"
                    >
                      <div className="p-3 space-y-2 text-xs">
                        <div>
                          <span className="text-zinc-500">URL: </span>
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline break-all"
                          >
                            {source.url}
                            <ExternalLink className="w-3 h-3 inline ml-1" />
                          </a>
                        </div>
                        {source.token && (
                          <div>
                            <span className="text-zinc-500">Token: </span>
                            <span className="text-zinc-400 font-mono">
                              {source.token.substring(0, 20)}...
                            </span>
                          </div>
                        )}
                        {source.userId && (
                          <div>
                            <span className="text-zinc-500">User ID: </span>
                            <span className="text-zinc-400 font-mono">{source.userId}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Source */}
      <AnimatePresence>
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-800/30 rounded-lg p-4 border border-zinc-700/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">Add Observation Source</p>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewSourceUrl("");
                  setNewSourceToken("");
                  setNewSourceUserId("");
                  setValidationResult(null);
                }}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector */}
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Source Type</label>
              <select
                value={newSourceType}
                onChange={(e) => {
                  setNewSourceType(e.target.value);
                  setValidationResult(null);
                }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {availableTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* URL input */}
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Endpoint URL</label>
              <input
                type="url"
                value={newSourceUrl}
                onChange={(e) => {
                  setNewSourceUrl(e.target.value);
                  setValidationResult(null);
                }}
                placeholder={OBSERVABILITY_SOURCE_TYPES.find((t) => t.id === newSourceType)?.placeholder}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Token input */}
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">API Token (optional)</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={newSourceToken}
                  onChange={(e) => setNewSourceToken(e.target.value)}
                  placeholder="Bearer token or API key"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* User ID input (for Grafana Cloud) */}
            {(newSourceType === "loki" || newSourceType === "prometheus" || newSourceType === "grafana") && (
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">User ID (for Grafana Cloud)</label>
                <input
                  type="text"
                  value={newSourceUserId}
                  onChange={(e) => setNewSourceUserId(e.target.value)}
                  placeholder="e.g., 1422306"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Validation Result */}
            {validationResult && (
              <div
                className={`flex items-center gap-2 text-xs ${
                  validationResult.valid ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {validationResult.valid ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {validationResult.message}
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={handleValidate}
                disabled={validating || !newSourceUrl.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {validating && <Loader2 className="w-3 h-3 animate-spin" />}
                Validate
              </button>
              <button
                onClick={handleAddSource}
                disabled={saving || !newSourceUrl.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                Add Source
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsAdding(true)}
            data-variant="watcher"
            className="w-full py-2 border border-dashed border-zinc-700 hover:border-yellow-500/50 rounded-lg text-sm text-zinc-500 hover:text-yellow-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Observation Source
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
