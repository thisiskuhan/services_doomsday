"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { PinContainer } from "@/components/ui/3d-pin";
import { MultiStepLoader, WATCHER_CREATION_STEPS } from "@/components/ui/MultiStepLoader";
import { WatcherForm } from "@/components/watchers/WatcherForm";
import { WatcherCard } from "@/components/watchers/WatcherCard";
import { ScheduleModal } from "@/components/watchers/ScheduleModal";
import { LokiIcon } from "@/components/ui/CustomCursor";
import { Plus, Skull } from "lucide-react";

export interface ZombieWatcher {
  id: string;
  name: string;
  repo: string;
  status: "pending_schedule" | "scheduled" | "active" | "paused";
  zombiesFound: number;
  lastScan: string;
  confidence: number;
  observationType?: "uniform" | "varied" | null;
  scanFrequencyMinutes?: number | null;
  analysisPeriodDays?: number | null;
}

export interface NewWatcherForm {
  name: string;
  repo: string;
  repoDescription: string;
  applicationUrl: string;
  githubToken: string;
  observabilitySources: Array<{
    url: string;
    type: string;
  }>;
  observabilityAuth: string;
}

// Mock data - replace with actual API call
const mockWatchers: ZombieWatcher[] = [];

export default function WatchersPage() {
  const { user } = useAuth();
  const [watchers, setWatchers] = useState<ZombieWatcher[]>(mockWatchers);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Multi-step loader state
  const [showLoader, setShowLoader] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedWatcher, setSelectedWatcher] = useState<ZombieWatcher | null>(null);

  // Poll Kestra execution status
  const pollExecutionStatus = useCallback(async (executionId: string) => {
    try {
      const response = await fetch(`/api/watchers/status?executionId=${executionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch execution status");
      }

      return data;
    } catch (error) {
      console.error("Error polling status:", error);
      throw error;
    }
  }, []);

  // Map Kestra task to step index
  const getStepFromTask = useCallback((taskId: string): number => {
    const taskToStepMap: Record<string, number> = {
      validate_inputs: 0,
      clone_repo: 1,
      discover_entities: 2,
      extract_metadata: 3,
      store_watcher_firebase: 4,
      store_candidates_firebase: 4,
      finalize: 5,
    };
    return taskToStepMap[taskId] ?? 0;
  }, []);

  const handleCreateWatcher = async (formData: NewWatcherForm) => {
    if (!user) return;

    // Initialize and show loader
    setCurrentStep(0);
    setIsComplete(false);
    setIsFailed(false);
    setShowLoader(true);
    setIsCreating(true);

    try {
      // Trigger workflow via API
      const response = await fetch("/api/watchers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          repoUrl: `https://github.com/${formData.repo}`,
          repoDescription: formData.repoDescription,
          applicationUrl: formData.applicationUrl || undefined,
          userId: user.uid,
          githubToken: formData.githubToken || undefined,
          observabilitySources:
            formData.observabilitySources.length > 0
              ? formData.observabilitySources
              : undefined,
          observabilityAuth: formData.observabilityAuth || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create watcher");
      }

      if (!result.executionId) {
        throw new Error("Invalid response from server");
      }

      console.log("Workflow triggered:", result);
      setCurrentStep(1);

      // Start polling for status updates
      let pollCount = 0;
      const maxPolls = 120;
      const pollInterval = 1000;

      pollingRef.current = setInterval(async () => {
        pollCount++;

        if (pollCount > maxPolls) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsComplete(true);

          setTimeout(() => {
            setIsCreating(false);
            setShowLoader(false);
            setShowForm(false);
          }, 2000);
          return;
        }

        try {
          const status = await pollExecutionStatus(result.executionId);

          if (status.taskId) {
            const stepIndex = getStepFromTask(status.taskId);
            setCurrentStep(stepIndex);
          } else {
            if (pollCount > 5 && pollCount <= 15) {
              setCurrentStep(2);
            } else if (pollCount > 15 && pollCount <= 25) {
              setCurrentStep(3);
            } else if (pollCount > 25) {
              setCurrentStep(4);
            }
          }

          if (status.state === "SUCCESS") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setCurrentStep(5);
            setIsComplete(true);

            setTimeout(() => {
              setIsCreating(false);
              setShowLoader(false);
              setShowForm(false);
              // Add new watcher to list
              const newWatcher: ZombieWatcher = {
                id: result.executionId,
                name: formData.name,
                repo: formData.repo,
                status: "pending_schedule",
                zombiesFound: status.candidatesFound || 0,
                lastScan: "Just created",
                confidence: 0,
              };
              setWatchers((prev) => [newWatcher, ...prev]);
            }, 2500);
          }

          if (status.state === "FAILED" || status.state === "KILLED") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsFailed(true);

            setTimeout(() => {
              setIsCreating(false);
              setShowLoader(false);
            }, 2000);
          }
        } catch (pollError) {
          console.error("Polling error:", pollError);
        }
      }, pollInterval);
    } catch (error) {
      console.error("Error creating watcher:", error);
      setIsFailed(true);

      setTimeout(() => {
        setIsCreating(false);
        setShowLoader(false);
      }, 1500);
    }
  };

  const handleSchedule = (watcher: ZombieWatcher) => {
    setSelectedWatcher(watcher);
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (scheduleData: {
    scanFrequencyMinutes: number;
    analysisPeriodDays: number;
    forAllServices: boolean;
  }) => {
    if (!selectedWatcher) return;

    try {
      const response = await fetch(`/api/watchers/${selectedWatcher.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleData),
      });

      if (response.ok) {
        setShowScheduleModal(false);
        setWatchers((prev) =>
          prev.map((w) =>
            w.id === selectedWatcher.id
              ? {
                  ...w,
                  status: "scheduled" as const,
                  observationType: scheduleData.forAllServices ? "uniform" : "varied",
                }
              : w
          )
        );
      } else {
        const error = await response.json();
        alert(error.error || "Failed to schedule observation");
      }
    } catch (err) {
      console.error("Schedule error:", err);
      alert("Failed to schedule observation");
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const hasWatchers = watchers.length > 0;

  return (
    <div className={`flex flex-col items-center px-4 ${hasWatchers ? "min-h-screen py-12" : "h-[calc(100vh-80px)] justify-center"}`}>
      {/* Header - Only show when there are watchers */}
      {hasWatchers && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
              Zombie Watchers
            </span>
          </h1>
          <p className="text-zinc-500">
            {`${watchers.length} watcher${watchers.length > 1 ? "s" : ""} hunting for zombies`}
          </p>
        </motion.div>
      )}

      {/* Main Content */}
      <div className={`relative z-10 w-full max-w-6xl ${!hasWatchers ? "flex flex-col items-center justify-center" : ""}`}>
        {hasWatchers ? (
          /* Watchers Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create New Watcher Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="cursor-hover"
            >
              <div
                onClick={() => setShowForm(true)}
                className="bg-zinc-900/50 backdrop-blur-xl border border-dashed border-zinc-700 hover:border-emerald-500/50 rounded-2xl p-6 h-full min-h-[200px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-zinc-900/70 group"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <Plus className="w-7 h-7 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium mb-1">Create New Watcher</p>
                  <p className="text-zinc-500 text-sm">Add a new repository to monitor</p>
                </div>
              </div>
            </motion.div>

            {/* Watcher Cards */}
            {watchers.map((watcher, index) => (
              <WatcherCard
                key={watcher.id}
                watcher={watcher}
                index={index}
                onSchedule={() => handleSchedule(watcher)}
              />
            ))}
          </div>
        ) : (
          /* Empty State - 3D Pin - Centered */
          <div className="flex flex-col items-center justify-center">
            <PinContainer
              title="Create Watcher"
              href="#"
              containerClassName="cursor-hover"
            >
              <div
                onClick={() => setShowForm(true)}
                className="flex flex-col items-center justify-center w-[280px] h-[280px] md:w-[320px] md:h-[320px] cursor-pointer"
              >
                {/* Loki Icon */}
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center mb-6 border border-yellow-500/20">
                  <LokiIcon className="w-12 h-12 md:w-14 md:h-14" />
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                  Create New Watcher
                </h3>

                {/* Description */}
                <p className="text-zinc-400 text-sm md:text-base text-center max-w-[240px] leading-relaxed">
                  Watchers are observators that look for{" "}
                  <span className="text-yellow-400 font-medium">service zombies</span>{" "}
                  in your repository
                </p>

                {/* Zombie Icons */}
                <div className="flex items-center gap-2 mt-6">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0.3 }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    >
                      <Skull className="w-5 h-5 text-zinc-600" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </PinContainer>

            {/* Hint Text - Below the card */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-zinc-600 text-sm mt-12"
            >
              Hover and click to create your first watcher
            </motion.p>
          </div>
        )}
      </div>

      {/* Watcher Form Modal */}
      <AnimatePresence>
        {showForm && (
          <WatcherForm
            onSubmit={handleCreateWatcher}
            onClose={() => !isCreating && setShowForm(false)}
            isCreating={isCreating}
          />
        )}
      </AnimatePresence>

      {/* Multi-Step Loader */}
      <MultiStepLoader
        steps={WATCHER_CREATION_STEPS}
        currentStep={currentStep}
        isComplete={isComplete}
        isFailed={isFailed}
        isVisible={showLoader}
      />

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && selectedWatcher && (
          <ScheduleModal
            watcher={selectedWatcher}
            onSubmit={handleScheduleSubmit}
            onClose={() => setShowScheduleModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
