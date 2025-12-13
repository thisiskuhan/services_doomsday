/**
 * Watchers Page
 *
 * Displays all zombie watchers for the authenticated user.
 * Features:
 *   - Watcher cards grid with status and zombie count
 *   - Create new watcher form with GitHub integration
 *   - SSE streaming for real-time watcher creation progress
 *   - Watcher detail modal with candidates list
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { PinContainer } from "@/components/ui/3d-pin";
import { WatcherCreationLoader, WATCHER_CREATION_STEPS } from "@/components/ui/WatcherCreationLoader";
import { WatcherForm } from "@/components/watchers/WatcherForm";
import { WatcherCard } from "@/components/watchers/WatcherCard";
import { WatcherDetailModal } from "@/components/watchers/WatcherDetailModal";
import { LokiIcon } from "@/components/ui/CustomCursor";
import { DoomLoader } from "@/components/ui/DoomLoader";
import { Plus, Skull } from "lucide-react";

export interface ZombieWatcher {
  id: string;
  name: string;
  repo: string;
  status: "pending_schedule" | "partially_scheduled" | "active" | "paused";
  zombiesFound: number;
  lastScan: string;
  confidence: number;
  activeCandidates?: number;
  pendingCandidates?: number;
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
    token: string;
  }>;
}

export default function WatchersPage() {
  const { user, loading: authLoading } = useAuth();
  const [watchers, setWatchers] = useState<ZombieWatcher[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Multi-step loader state
  const [showLoader, setShowLoader] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailWatcherId, setDetailWatcherId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<"overview" | "candidates" | "analysis">("overview");
  
  // Router and search params for navigation from candidate detail
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch watchers on mount and when user changes
  const fetchWatchers = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch(`/api/watchers?userId=${user.uid}`);
      const data = await response.json();
      
      if (response.ok && data.watchers) {
        setWatchers(data.watchers);
      }
    } catch (error) {
      console.error("Error fetching watchers:", error);
    } finally {
      setHasFetched(true);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid && !hasFetched) {
      fetchWatchers();
    }
  }, [user?.uid, hasFetched, fetchWatchers]);

  // Handle query params for opening watcher from candidate detail page
  useEffect(() => {
    const openWatcher = searchParams.get("openWatcher");
    const tab = searchParams.get("tab") as "overview" | "candidates" | "analysis" | null;
    
    if (openWatcher) {
      setDetailWatcherId(openWatcher);
      setInitialTab(tab || "overview");
      setShowDetailModal(true);
      
      // Clear the URL params without triggering a navigation
      router.replace("/watchers", { scroll: false });
    }
  }, [searchParams, router]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Map Kestra task to step index
  // Kestra tasks: clone_and_discover → llm_repo_analysis → detect_dependencies → llm_candidate_analysis → store_watcher → store_candidates → output_success
  const getStepFromTask = useCallback((taskId: string): number => {
    const taskToStepMap: Record<string, number> = {
      // Step 0: validate (handled before Kestra execution starts)
      // Step 1: Clone & Discover entities
      clone_and_discover: 1,
      // Step 2: LLM repo analysis + dependency detection
      llm_repo_analysis: 2,
      detect_dependencies: 2,
      // Step 3: LLM candidate analysis
      llm_candidate_analysis: 3,
      // Step 4: Store watcher & candidates
      store_watcher: 4,
      store_candidates: 4,
      // Step 5: Complete
      output_success: 5,
    };
    return taskToStepMap[taskId] ?? 0;
  }, []);

  // Start SSE streaming for execution updates
  const startExecutionStream = useCallback((executionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    let hasReceivedData = false;
    let lastState = "";

    const eventSource = new EventSource(`/api/watchers/stream/${executionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        hasReceivedData = true;
        const data = JSON.parse(event.data);
        console.log("SSE Update:", data);

        if (data.state) {
          lastState = data.state;
        }

        // Capture error message if present
        if (data.error) {
          setErrorMessage(data.error);
        }

        // Update step based on taskId
        if (data.taskId) {
          const stepIndex = getStepFromTask(data.taskId);
          console.log(`Task ${data.taskId} -> Step ${stepIndex}`);
          if (stepIndex > 0) {
            setCurrentStep(stepIndex);
          }
        }

        if (data.state === "SUCCESS") {
          console.log("Execution SUCCESS - setting step 5 and completing");
          eventSource.close();
          setCurrentStep(5);
          setIsComplete(true);
          // Refresh watchers list
          fetchWatchers();
        }

        if (data.state === "FAILED" || data.state === "KILLED") {
          console.log("Execution FAILED/KILLED", data);
          eventSource.close();
          setIsFailed(true);
          // Capture failed task info for error message
          if (data.error) {
            setErrorMessage(data.error);
          } else if (data.taskId) {
            setErrorMessage(`Workflow failed at task: ${data.taskId}`);
          }
        }
      } catch (error) {
        console.error("SSE parse error:", error);
      }
    };

    eventSource.onerror = () => {
      // EventSource fires onerror when connection closes - this is normal
      // Only treat as error if we haven't received success/failed state
      console.log("SSE connection ended, lastState:", lastState, "hasReceivedData:", hasReceivedData);
      
      eventSource.close();
      
      // If we already handled SUCCESS or FAILED in onmessage, don't override
      if (lastState === "SUCCESS" || lastState === "FAILED" || lastState === "KILLED") {
        return;
      }

      // If we never received data, it's likely a real connection error
      if (!hasReceivedData) {
        console.error("SSE connection failed - no data received");
        setIsFailed(true);
        setTimeout(() => {
          setIsCreating(false);
          setShowLoader(false);
        }, 2000);
      }
      // Otherwise the stream just ended normally mid-execution
      // We could poll for status here, but for now just let it be
    };
  }, [getStepFromTask, fetchWatchers]);

  const handleCreateWatcher = async (formData: NewWatcherForm) => {
    if (!user) return;

    // Clear any previous validation errors
    setValidationError(null);

    // Initialize and show loader
    setCurrentStep(0);
    setIsComplete(false);
    setIsFailed(false);
    setShowLoader(true);
    setIsCreating(true);

    try {
      // Trigger workflow via API
      // Handle both full URL and owner/repo format
      const repoUrl = formData.repo.startsWith("https://") 
        ? formData.repo 
        : `https://github.com/${formData.repo}`;
      
      const response = await fetch("/api/watchers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          repoUrl,
          repoDescription: formData.repoDescription,
          applicationUrl: formData.applicationUrl || undefined,
          userId: user.uid,
          userEmail: user.email || undefined,
          githubToken: formData.githubToken || undefined,
          observabilitySources:
            formData.observabilitySources.length > 0
              ? formData.observabilitySources
              : undefined,
        }),
      });

      const result = await response.json();
      console.log("Create watcher response:", response.status, result);

      if (!response.ok || !result.success) {
        // Show validation error to user
        const errorMsg = result.error || "Failed to create watcher";
        console.error("Watcher creation failed:", errorMsg);
        setValidationError(errorMsg);
        setShowLoader(false);
        setIsCreating(false);
        return;
      }

      if (!result.executionId) {
        throw new Error("Invalid response from server");
      }

      console.log("Workflow triggered:", result);
      setCurrentStep(1);

      // Start SSE streaming for real-time updates
      startExecutionStream(result.executionId);

    } catch (error) {
      console.error("Error creating watcher:", error);
      setIsFailed(true);

      setTimeout(() => {
        setIsCreating(false);
        setShowLoader(false);
      }, 1500);
    }
  };

  const handleOpenDetail = (watcherId: string) => {
    setDetailWatcherId(watcherId);
    setShowDetailModal(true);
  };

  // Delete watcher handler
  const handleDeleteWatcher = async (watcherId: string) => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch(`/api/watchers/${watcherId}?userId=${user.uid}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove watcher from local state
        setWatchers((prev) => prev.filter((w) => w.id !== watcherId));
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete watcher");
      }
    } catch (err) {
      console.error("Delete error:", err);
      throw err;
    }
  };

  const hasWatchers = watchers.length > 0;

  if (authLoading || !hasFetched) {
    return (
      <DoomLoader 
        text="Summoning Watchers..." 
        subText="Dr. Doom is preparing your zombie hunters"
      />
    );
  }

  return (
    <div className={`flex flex-col items-center px-4 ${hasWatchers ? "py-12" : "h-[calc(100vh-80px)] justify-center"}`}>
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
              data-variant="captain"
            >
              <div
                onClick={() => setShowForm(true)}
                className="bg-zinc-900/50 backdrop-blur-xl border border-dashed border-zinc-700 hover:border-blue-500/50 rounded-2xl p-6 h-full min-h-[200px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-zinc-900/70 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] group"
              >
                <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Plus className="w-7 h-7 text-blue-500" />
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
                onClick={() => handleOpenDetail(watcher.id)}
              />
            ))}
          </div>
        ) : (
          /* Empty State - 3D Pin - Centered */
          <div className="flex flex-col items-center justify-center">
            <PinContainer
              title="With Glorious Purpose"
              href="#"
              containerClassName="cursor-hover"
              onClick={() => setShowForm(true)}
            >
              <div
                onClick={() => setShowForm(true)}
                className="flex flex-col items-center justify-center w-[280px] h-[280px] md:w-[320px] md:h-[320px] cursor-pointer"
              >
                {/* Loki Icon */}
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 flex items-center justify-center mb-6 border border-yellow-500/20">
                  <LokiIcon className="w-16 h-16 md:w-18 md:h-18" />
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
            onClose={() => {
              if (!isCreating) {
                setShowForm(false);
                setValidationError(null);
              }
            }}
            isCreating={isCreating}
            validationError={validationError}
          />
        )}
      </AnimatePresence>

      {/* Watcher Creation Loader - Spectacular SSE-powered modal */}
      <WatcherCreationLoader
        steps={WATCHER_CREATION_STEPS}
        currentStep={currentStep}
        isComplete={isComplete}
        isFailed={isFailed}
        isVisible={showLoader}
        errorMessage={errorMessage}
        onClose={() => {
          // Reset all loader states
          setShowLoader(false);
          setIsCreating(false);
          setIsFailed(false);
          setIsComplete(false);
          setCurrentStep(0);
          setErrorMessage(null);
          // Close the form if open
          setShowForm(false);
          // Refresh watchers list (in case of success)
          if (isComplete) {
            fetchWatchers();
          }
        }}
        onRetry={() => {
          // Reset loader states but keep form open for retry
          setShowLoader(false);
          setIsFailed(false);
          setIsComplete(false);
          setCurrentStep(0);
          setErrorMessage(null);
          // Keep isCreating false and form open
          setIsCreating(false);
          // Make sure form is visible
          setShowForm(true);
        }}
      />

      {/* Watcher Detail Modal */}
      <AnimatePresence>
        {showDetailModal && detailWatcherId && user && (
          <WatcherDetailModal
            watcherId={detailWatcherId}
            userId={user.uid}
            initialTab={initialTab}
            onClose={() => {
              setShowDetailModal(false);
              setDetailWatcherId(null);
              setInitialTab("overview"); // Reset to default for next open
              // Refresh watchers after modal closes to pick up any changes
              fetchWatchers();
            }}
            onDelete={handleDeleteWatcher}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
