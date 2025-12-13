"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Circle, XCircle, X } from "lucide-react";

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
  errorMessage?: string;
  onClose?: () => void;
}

export function MultiStepLoader({
  steps,
  currentStep,
  isComplete,
  isFailed,
  isVisible,
  errorMessage,
  onClose,
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
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl relative"
          >
            {/* Close button - show when failed or complete */}
            {(isFailed || isComplete) && onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400 hover:text-white" />
              </button>
            )}
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  isFailed 
                    ? "bg-gradient-to-br from-red-500/20 to-red-600/20" 
                    : "bg-gradient-to-br from-[#00ff41]/20 to-[#a78bfa]/20"
                }`}
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
                  ? "Something went wrong during workflow execution"
                  : "Please wait while we set things up"}
              </p>
              {/* Error message box */}
              {isFailed && errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-left"
                >
                  <p className="text-xs text-red-400 font-mono break-all">
                    {errorMessage}
                  </p>
                </motion.div>
              )}
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

            {/* Action buttons for failed/complete state */}
            {(isFailed || isComplete) && onClose && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 flex justify-center"
              >
                <button
                  onClick={onClose}
                  className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    isFailed
                      ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                      : "bg-[#00ff41]/20 hover:bg-[#00ff41]/30 text-[#00ff41] border border-[#00ff41]/30"
                  }`}
                >
                  {isFailed ? "Close & Try Again" : "Done"}
                </button>
              </motion.div>
            )}
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
