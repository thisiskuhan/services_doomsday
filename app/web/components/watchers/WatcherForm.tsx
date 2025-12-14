"use client";

import { useState } from "react";
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from "framer-motion";
import { X, Plus, Clock, Trash2, ChevronDown, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LokiIcon } from "@/components/ui/CustomCursor";
import { cn, OBSERVABILITY_SOURCE_TYPES } from "@/lib/utils";
import { AnimatedBorderGlow } from "@/components/ui/shared";
import { useAuth } from "@/contexts/AuthContext";

interface ObservabilitySource {
  url: string;
  type: string;
  token: string;
  userId?: string;
}

interface WatcherFormData {
  name: string;
  repo: string;
  repoDescription: string;
  applicationUrl: string;
  githubToken: string;
  observabilitySources: ObservabilitySource[];
}

interface WatcherFormProps {
  onSubmit: (data: WatcherFormData) => void;
  onClose: () => void;
  isCreating: boolean;
  validationError?: string | null;
}

const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};

// Textarea with animated glow border (matching Input component)
const TextareaWithGlow = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const radius = 100;
  const [visible, setVisible] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      style={{
        background: useMotionTemplate`
          radial-gradient(
            ${visible ? radius + "px" : "0px"} circle at ${mouseX}px ${mouseY}px,
            rgba(16, 185, 129, 0.6),
            transparent 80%
          )
        `,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      className="group/input rounded-lg p-[2px] transition duration-300"
    >
      <textarea
        className={cn(
          "shadow-input flex w-full rounded-lg border-none bg-zinc-800 px-4 py-3 text-sm text-white transition duration-400 group-hover/input:shadow-none placeholder:text-zinc-500 focus-visible:ring-[2px] focus-visible:ring-emerald-500/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 shadow-[0px_0px_1px_1px_#27272a] resize-none",
          className
        )}
        {...props}
      />
    </motion.div>
  );
};

export function WatcherForm({ onSubmit, onClose, isCreating, validationError }: WatcherFormProps) {
  const { githubToken: authGithubToken } = useAuth();
  
  const [formData, setFormData] = useState<WatcherFormData>({
    name: "",
    repo: "",
    repoDescription: "",
    applicationUrl: "",
    githubToken: authGithubToken || "",
    observabilitySources: [{ url: "", type: "prometheus", token: "", userId: "" }],
  });
  const [expandedSource, setExpandedSource] = useState<number | null>(0);

  const handleAddSource = () => {
    setFormData({
      ...formData,
      observabilitySources: [
        ...formData.observabilitySources,
        { url: "", type: "prometheus", token: "", userId: "" },
      ],
    });
    setExpandedSource(formData.observabilitySources.length);
  };

  const handleRemoveSource = (index: number) => {
    if (formData.observabilitySources.length <= 1) return;
    const newSources = formData.observabilitySources.filter((_, i) => i !== index);
    setFormData({ ...formData, observabilitySources: newSources });
    if (expandedSource === index) {
      setExpandedSource(null);
    } else if (expandedSource !== null && expandedSource > index) {
      setExpandedSource(expandedSource - 1);
    }
  };

  const handleSourceChange = (index: number, field: keyof ObservabilitySource, value: string) => {
    const newSources = [...formData.observabilitySources];
    newSources[index] = { ...newSources[index], [field]: value };
    
    // Auto-extract userId from Grafana Cloud tokens
    if (field === "token" && value.startsWith("glc_")) {
      try {
        const tokenData = JSON.parse(atob(value.substring(4)));
        newSources[index].userId = tokenData.o || "";
      } catch {
        // Invalid token format, ignore
      }
    }
    
    setFormData({ ...formData, observabilitySources: newSources });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(formData);
  };

  const hasValidObservabilitySource = formData.observabilitySources.some(
    (source) => source.url.trim() !== ""
  );

  const isValid =
    formData.name.trim() !== "" &&
    formData.repo.trim() !== "" &&
    formData.repoDescription.trim() !== "" &&
    hasValidObservabilitySource;

  const getTypeConfig = (type: string) =>
    OBSERVABILITY_SOURCE_TYPES.find((t) => t.value === type) || OBSERVABILITY_SOURCE_TYPES[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
      onClick={() => !isCreating && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative shadow-input max-w-5xl w-full h-[78vh] overflow-visible p-px rounded-2xl"
      >
        {/* Animated glowing border */}
        <AnimatedBorderGlow duration={4} alwaysAnimate />
        
        {/* Inner modal content */}
        <div className="relative bg-zinc-900 border border-zinc-800/50 rounded-2xl overflow-hidden z-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-4">
            <LokiIcon className="w-12 h-12" />
            <div>
              <h2 className="text-lg font-bold text-white">Add New Watcher</h2>
              <p className="text-xs text-zinc-500">
                Watchers are observators with glorious purpose that look for service zombies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg disabled:opacity-50 cursor-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {/* Two Column Layout: Basic Info | Observability Sources */}
            <div className="flex flex-row gap-6 h-full">
              {/* Left Column: Basic Info */}
              <div className="w-1/2 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  Basic Information
                </h3>

                {/* Watcher Name */}
                <LabelInputContainer>
                  <Label htmlFor="name">
                    Watcher Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Payment Service Watcher"
                    disabled={isCreating}
                  />
                </LabelInputContainer>

                {/* Application Base URL */}
                <LabelInputContainer>
                  <Label htmlFor="appUrl">
                    Application Base URL <span className="text-zinc-600">(Optional)</span>
                  </Label>
                  <Input
                    id="appUrl"
                    type="url"
                    value={formData.applicationUrl}
                    onChange={(e) => setFormData({ ...formData, applicationUrl: e.target.value })}
                    placeholder="https://api.myapp.com"
                    disabled={isCreating}
                    className="font-mono text-sm"
                  />
                </LabelInputContainer>

                {/* Repository Description */}
                <LabelInputContainer>
                  <Label htmlFor="description">
                    Describe this repository <span className="text-red-400">*</span>
                  </Label>
                  <TextareaWithGlow
                    id="description"
                    value={formData.repoDescription}
                    onChange={(e) => setFormData({ ...formData, repoDescription: e.target.value })}
                    placeholder="E-commerce backend API handling payments, inventory, and order processing..."
                    disabled={isCreating}
                    rows={2}
                  />
                </LabelInputContainer>

                {/* GitHub Repository */}
                <LabelInputContainer>
                  <Label htmlFor="repo">
                    GitHub Repository <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="repo"
                    type="text"
                    value={formData.repo}
                    onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                    placeholder="https://github.com/owner/repo"
                    disabled={isCreating}
                    className="font-mono text-sm"
                  />
                </LabelInputContainer>

                {/* GitHub Token */}
                <LabelInputContainer>
                  <Label htmlFor="token">
                    GitHub Token {authGithubToken ? (
                      <span className="text-green-500">(Auto-filled from login ✓)</span>
                    ) : (
                      <span className="text-zinc-600">(Private repos)</span>
                    )}
                  </Label>
                  <Input
                    id="token"
                    type="password"
                    value={formData.githubToken}
                    onChange={(e) => setFormData({ ...formData, githubToken: e.target.value })}
                    placeholder={authGithubToken ? "Using OAuth token" : "ghp_xxxxxxxxxxxxx"}
                    disabled={isCreating}
                    className="font-mono text-sm"
                  />
                </LabelInputContainer>
              </div>

              {/* Vertical Divider */}
              <div className="w-px bg-gradient-to-b from-transparent via-zinc-700 to-transparent shrink-0" />

              {/* Right Column: Observability Sources */}
              <div className="w-1/2 flex flex-col">
                <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                      Observability Sources
                    </h3>
                    <p className="text-xs text-zinc-600 mt-1">
                      At least one source required
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSource}
                    disabled={isCreating}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50 cursor-hover"
                  >
                    <Plus size={14} />
                    Add Source
                  </button>
                </div>

                {/* Validation Warning */}
                {!hasValidObservabilitySource && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"
                  >
                    <AlertCircle size={16} />
                    <span className="text-xs">Add at least one observability source URL</span>
                  </motion.div>
                )}

                {/* Sources List */}
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {formData.observabilitySources.map((source, index) => (
                      <motion.div
                        key={index}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden"
                      >
                        {/* Source Header */}
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/80 transition-colors"
                          onClick={() => setExpandedSource(expandedSource === index ? null : index)}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-semibold uppercase px-2 py-1 rounded",
                                source.type === "prometheus" && "text-orange-400 bg-orange-500/10",
                                source.type === "grafana" && "text-yellow-400 bg-yellow-500/10",
                                source.type === "loki" && "text-cyan-400 bg-cyan-500/10",
                                source.type === "datadog" && "text-purple-400 bg-purple-500/10"
                              )}
                            >
                              {getTypeConfig(source.type).label}
                            </span>
                            <span className="text-xs text-zinc-400 truncate max-w-[120px] font-mono">
                              {source.url || "No URL"}
                            </span>
                            {source.token && (
                              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {formData.observabilitySources.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSource(index);
                                }}
                                disabled={isCreating}
                                className="text-zinc-500 hover:text-red-400 p-1 transition-colors disabled:opacity-50 cursor-hover"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <ChevronDown
                              size={16}
                              className={cn(
                                "text-zinc-500 transition-transform",
                                expandedSource === index && "rotate-180"
                              )}
                            />
                          </div>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence initial={false}>
                          {expandedSource === index && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-zinc-700/50"
                            >
                              <div className="p-3 space-y-3">
                                {/* Type Selector */}
                                <LabelInputContainer>
                                  <Label>Source Type</Label>
                                  <select
                                    value={source.type}
                                    onChange={(e) => handleSourceChange(index, "type", e.target.value)}
                                    disabled={isCreating}
                                    className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-50 w-full"
                                  >
                                    {OBSERVABILITY_SOURCE_TYPES.map((type) => (
                                      <option key={type.value} value={type.value}>
                                        {type.label}
                                      </option>
                                    ))}
                                  </select>
                                </LabelInputContainer>

                                {/* URL */}
                                <LabelInputContainer>
                                  <Label>
                                    Endpoint URL <span className="text-red-400">*</span>
                                  </Label>
                                  <Input
                                    type="url"
                                    value={source.url}
                                    onChange={(e) => handleSourceChange(index, "url", e.target.value)}
                                    placeholder={getTypeConfig(source.type).placeholder}
                                    disabled={isCreating}
                                    className="font-mono text-sm"
                                  />
                                </LabelInputContainer>

                                {/* Token */}
                                <LabelInputContainer>
                                  <Label>
                                    Access Token <span className="text-zinc-600">(if required)</span>
                                  </Label>
                                  <Input
                                    type="password"
                                    value={source.token}
                                    onChange={(e) => handleSourceChange(index, "token", e.target.value)}
                                    placeholder="Bearer token or API key"
                                    disabled={isCreating}
                                    className="font-mono text-sm"
                                  />
                                </LabelInputContainer>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                </div>

                {/* Info Box - pushed to bottom */}
                <div className="mt-auto bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Clock size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-zinc-300">
                        Scheduling comes next
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Configure scan frequency from the dashboard after creation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-6" />

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">Validation Failed</p>
                  <p className="text-xs text-red-300/80 mt-1">{validationError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 hidden sm:block">
              {formData.observabilitySources.filter((s) => s.url).length} source
              {formData.observabilitySources.filter((s) => s.url).length !== 1 ? "s" : ""} configured
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="flex-1 sm:flex-none px-5 py-2.5 text-zinc-400 hover:text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || isCreating}
                data-variant="watcher"
                className="group/btn relative flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-zinc-900 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0px_1px_0px_0px_rgba(255,255,255,0.2)_inset,0px_-1px_0px_0px_rgba(0,0,0,0.1)_inset] cursor-hover"
              >
                <Plus size={16} strokeWidth={2.5} />
                Create Watcher
                <BottomGradient />
              </button>
            </div>
          </div>
        </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
