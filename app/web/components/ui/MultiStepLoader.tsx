"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Circle, XCircle } from "lucide-react";

export interface LoadingStep {
  id: string;
  label: string;
}

interface MultiStepLoaderProps {
  steps: LoadingStep[];
  currentStep: number;
  isComplete: boolean;
  isFailed: boolean;
  isVisible: boolean;
}

export function MultiStepLoader({
  steps,
  currentStep,
  isComplete,
  isFailed,
  isVisible,
}: MultiStepLoaderProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#00ff41]/20 to-[#a78bfa]/20 mb-4"
              >
                {isComplete ? (
                  <CheckCircle2 className="w-8 h-8 text-[#00ff41]" />
                ) : isFailed ? (
                  <XCircle className="w-8 h-8 text-red-500" />
                ) : (
                  <Loader2 className="w-8 h-8 text-[#a78bfa] animate-spin" />
                )}
              </motion.div>
              <h3 className="text-xl font-semibold text-white">
                {isComplete
                  ? "Watcher Created!"
                  : isFailed
                  ? "Creation Failed"
                  : "Creating Watcher..."}
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                {isComplete
                  ? "Your watcher is ready to hunt zombies"
                  : isFailed
                  ? "Something went wrong"
                  : "Please wait while we set things up"}
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {steps.map((step, index) => {
                const isCurrentStep = index === currentStep;
                const isCompletedStep = index < currentStep || isComplete;
                const isFailedStep = isFailed && index === currentStep;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                      isCurrentStep && !isFailed
                        ? "bg-[#a78bfa]/10 border border-[#a78bfa]/30"
                        : isCompletedStep
                        ? "bg-[#00ff41]/5 border border-[#00ff41]/20"
                        : isFailedStep
                        ? "bg-red-500/10 border border-red-500/30"
                        : "bg-zinc-800/30 border border-transparent"
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {isCompletedStep ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-[#00ff41]" />
                        </motion.div>
                      ) : isFailedStep ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : isCurrentStep ? (
                        <Loader2 className="w-5 h-5 text-[#a78bfa] animate-spin" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className={`text-sm font-medium ${
                        isCompletedStep
                          ? "text-[#00ff41]"
                          : isCurrentStep
                          ? "text-white"
                          : isFailedStep
                          ? "text-red-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {step.label}
                    </span>

                    {/* Progress indicator for current step */}
                    {isCurrentStep && !isComplete && !isFailed && (
                      <motion.div
                        className="ml-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]"
                              animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    isFailed
                      ? "bg-red-500"
                      : isComplete
                      ? "bg-[#00ff41]"
                      : "bg-gradient-to-r from-[#a78bfa] to-[#00ff41]"
                  }`}
                  initial={{ width: "0%" }}
                  animate={{
                    width: isComplete
                      ? "100%"
                      : isFailed
                      ? `${((currentStep + 1) / steps.length) * 100}%`
                      : `${((currentStep + 0.5) / steps.length) * 100}%`,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-zinc-500 text-center mt-2">
                {isComplete
                  ? "Complete!"
                  : isFailed
                  ? "Failed at step " + (currentStep + 1)
                  : `Step ${currentStep + 1} of ${steps.length}`}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Default steps for watcher creation
export const WATCHER_CREATION_STEPS: LoadingStep[] = [
  { id: "validate", label: "Validating repository..." },
  { id: "clone", label: "Cloning repository..." },
  { id: "discover", label: "Discovering code entities..." },
  { id: "analyze", label: "AI analyzing codebase..." },
  { id: "store", label: "Storing watcher data..." },
  { id: "complete", label: "Finalizing setup..." },
];
