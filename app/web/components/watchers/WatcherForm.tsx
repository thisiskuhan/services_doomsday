"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Clock, Skull } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ObservabilitySource {
  url: string;
  type: string;
}

interface WatcherFormData {
  name: string;
  repo: string;
  repoDescription: string;
  applicationUrl: string;
  githubToken: string;
  observabilitySources: ObservabilitySource[];
  observabilityAuth: string;
}

interface WatcherFormProps {
  onSubmit: (data: WatcherFormData) => void;
  onClose: () => void;
  isCreating: boolean;
}

// Bottom gradient effect for buttons
const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

// Label + Input container
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

export function WatcherForm({ onSubmit, onClose, isCreating }: WatcherFormProps) {
  const [formData, setFormData] = useState<WatcherFormData>({
    name: "",
    repo: "",
    repoDescription: "",
    applicationUrl: "",
    githubToken: "",
    observabilitySources: [],
    observabilityAuth: "",
  });
  const [newObservabilityUrl, setNewObservabilityUrl] = useState("");
  const [newObservabilityType, setNewObservabilityType] = useState("prometheus");

  const handleAddObservabilitySource = () => {
    if (newObservabilityUrl.trim()) {
      setFormData({
        ...formData,
        observabilitySources: [
          ...formData.observabilitySources,
          { url: newObservabilityUrl.trim(), type: newObservabilityType },
        ],
      });
      setNewObservabilityUrl("");
      setNewObservabilityType("prometheus");
    }
  };

  const handleRemoveObservabilitySource = (index: number) => {
    setFormData({
      ...formData,
      observabilitySources: formData.observabilitySources.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.repo || !formData.repoDescription) {
      return;
    }
    onSubmit(formData);
  };

  const isValid = formData.name && formData.repo && formData.repoDescription;

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
        className="shadow-input bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Skull className="text-white" size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add New Watcher</h2>
              <p className="text-sm text-zinc-500">Create a zombie hunter for your repository</p>
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
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <div className="space-y-5 max-h-[calc(90vh-220px)] overflow-y-auto pr-2">
            {/* Watcher Name & Repository - Side by Side on Desktop */}
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
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
              <LabelInputContainer>
                <Label htmlFor="repo">
                  GitHub Repository <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="repo"
                  type="text"
                  value={formData.repo}
                  onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                  placeholder="owner/repo-name"
                  disabled={isCreating}
                  className="font-mono"
                />
              </LabelInputContainer>
            </div>

            {/* Repository Description */}
            <LabelInputContainer>
              <Label htmlFor="description">
                Describe this repository <span className="text-red-400">*</span>
              </Label>
              <motion.div
                className="group/input rounded-lg p-[2px] transition duration-300"
                whileHover={{
                  background: "radial-gradient(100px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(16, 185, 129, 0.6), transparent 80%)",
                }}
              >
                <textarea
                  id="description"
                  value={formData.repoDescription}
                  onChange={(e) => setFormData({ ...formData, repoDescription: e.target.value })}
                  placeholder="E-commerce backend API handling payments, inventory, and order processing"
                  disabled={isCreating}
                  rows={3}
                  className="shadow-input flex w-full rounded-lg border-none bg-zinc-800 px-4 py-3 text-sm text-white transition duration-400 placeholder:text-zinc-500 focus-visible:ring-[2px] focus-visible:ring-emerald-500/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 shadow-[0px_0px_1px_1px_#27272a] resize-none"
                />
              </motion.div>
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
                className="font-mono"
              />
              <p className="text-xs text-zinc-600">Where discovered endpoints can be tested</p>
            </LabelInputContainer>

            {/* GitHub Token */}
            <LabelInputContainer>
              <Label htmlFor="token">
                GitHub Personal Access Token <span className="text-zinc-600">(Optional)</span>
              </Label>
              <Input
                id="token"
                type="password"
                value={formData.githubToken}
                onChange={(e) => setFormData({ ...formData, githubToken: e.target.value })}
                placeholder="ghp_xxxxxxxxxxxxx"
                disabled={isCreating}
                className="font-mono"
              />
              <p className="text-xs text-zinc-600">Required for private repositories</p>
            </LabelInputContainer>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            {/* Observability Sources */}
            <LabelInputContainer>
              <Label>
                Observability Sources <span className="text-zinc-600">(Optional)</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={newObservabilityUrl}
                    onChange={(e) => setNewObservabilityUrl(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddObservabilitySource())}
                    placeholder="http://prometheus:9090/api/v1/query"
                    disabled={isCreating}
                    className="font-mono"
                  />
                </div>
                <select
                  value={newObservabilityType}
                  onChange={(e) => setNewObservabilityType(e.target.value)}
                  disabled={isCreating}
                  className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                >
                  <option value="prometheus">Prometheus</option>
                  <option value="grafana">Grafana</option>
                  <option value="loki">Loki</option>
                  <option value="datadog">Datadog</option>
                  <option value="cloudwatch">CloudWatch</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddObservabilitySource}
                  disabled={isCreating || !newObservabilityUrl.trim()}
                  className="group/btn relative bg-emerald-500 hover:bg-emerald-400 text-black p-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-hover"
                >
                  <Plus size={20} strokeWidth={2.5} />
                  <BottomGradient />
                </button>
              </div>
              {formData.observabilitySources.length > 0 && (
                <div className="space-y-2 mt-3">
                  {formData.observabilitySources.map((source, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-zinc-800/50 px-4 py-2.5 rounded-lg group border border-zinc-700/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs text-emerald-400 font-semibold uppercase px-2 py-1 bg-emerald-500/10 rounded flex-shrink-0">
                          {source.type}
                        </span>
                        <code className="text-sm text-zinc-300 truncate">{source.url}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveObservabilitySource(index)}
                        disabled={isCreating}
                        className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0 ml-2 cursor-hover"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-600">Add Prometheus, Grafana, or other observability sources</p>
            </LabelInputContainer>

            {/* Observability Auth Token */}
            {formData.observabilitySources.length > 0 && (
              <LabelInputContainer>
                <Label htmlFor="obsAuth">
                  Observability API Token <span className="text-zinc-600">(Optional)</span>
                </Label>
                <Input
                  id="obsAuth"
                  type="password"
                  value={formData.observabilityAuth}
                  onChange={(e) => setFormData({ ...formData, observabilityAuth: e.target.value })}
                  placeholder="Bearer token or API key"
                  disabled={isCreating}
                  className="font-mono"
                />
              </LabelInputContainer>
            )}

            {/* Info Box */}
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    Observation scheduling comes next
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    After creating the watcher, you&apos;ll configure scan frequency and
                    analysis period from the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-6" />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 hidden sm:block">
              Watcher will analyze code patterns
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
                className="group/btn relative flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0px_1px_0px_0px_rgba(255,255,255,0.1)_inset,0px_-1px_0px_0px_rgba(255,255,255,0.1)_inset] cursor-hover"
              >
                <Plus size={16} strokeWidth={2.5} />
                Add Watcher
                <BottomGradient />
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
