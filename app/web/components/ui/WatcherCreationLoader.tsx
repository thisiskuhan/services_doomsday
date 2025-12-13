"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, XCircle, Zap, X, RotateCcw, ArrowRight } from "lucide-react";
import { LokiIcon } from "@/components/ui/CustomCursor";
import Image from "next/image";

export interface LoadingStep {
  id: string;
  label: string;
  description?: string;
}

interface WatcherCreationLoaderProps {
  steps: LoadingStep[];
  currentStep: number;
  isComplete: boolean;
  isFailed: boolean;
  isVisible: boolean;
  errorMessage?: string | null;
  onClose?: () => void;
  onRetry?: () => void;
}

// Animated border glow component
type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const AnimatedBorderGlow = ({ 
  duration = 1.5,
  isFailed = false,
  isComplete = false 
}: { 
  duration?: number;
  isFailed?: boolean;
  isComplete?: boolean;
}) => {
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  const getGradient = () => {
    if (isFailed) {
      return {
        TOP: "radial-gradient(30% 70% at 50% 0%, hsl(0, 100%, 50%) 0%, rgba(239, 68, 68, 0) 100%)",
        LEFT: "radial-gradient(25% 60% at 0% 50%, hsl(0, 100%, 50%) 0%, rgba(239, 68, 68, 0) 100%)",
        BOTTOM: "radial-gradient(30% 70% at 50% 100%, hsl(0, 100%, 50%) 0%, rgba(239, 68, 68, 0) 100%)",
        RIGHT: "radial-gradient(25% 60% at 100% 50%, hsl(0, 100%, 50%) 0%, rgba(239, 68, 68, 0) 100%)",
      };
    }
    if (isComplete) {
      return {
        TOP: "radial-gradient(30% 70% at 50% 0%, hsl(142, 100%, 50%) 0%, rgba(34, 197, 94, 0) 100%)",
        LEFT: "radial-gradient(25% 60% at 0% 50%, hsl(142, 100%, 50%) 0%, rgba(34, 197, 94, 0) 100%)",
        BOTTOM: "radial-gradient(30% 70% at 50% 100%, hsl(142, 100%, 50%) 0%, rgba(34, 197, 94, 0) 100%)",
        RIGHT: "radial-gradient(25% 60% at 100% 50%, hsl(142, 100%, 50%) 0%, rgba(34, 197, 94, 0) 100%)",
      };
    }
    return {
      TOP: "radial-gradient(30% 70% at 50% 0%, hsl(50, 100%, 50%) 0%, rgba(234, 179, 8, 0) 100%)",
      LEFT: "radial-gradient(25% 60% at 0% 50%, hsl(50, 100%, 50%) 0%, rgba(234, 179, 8, 0) 100%)",
      BOTTOM: "radial-gradient(30% 70% at 50% 100%, hsl(50, 100%, 50%) 0%, rgba(234, 179, 8, 0) 100%)",
      RIGHT: "radial-gradient(25% 60% at 100% 50%, hsl(50, 100%, 50%) 0%, rgba(234, 179, 8, 0) 100%)",
    };
  };

  const movingMap = getGradient();

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection((prevState) => rotateDirection(prevState));
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0"
      style={{ filter: "blur(4px)" }}
      initial={{ background: movingMap[direction] }}
      animate={{ background: movingMap[direction] }}
      transition={{ ease: "linear", duration: duration }}
    />
  );
};

// Floating particles effect
const FloatingParticles = ({ isComplete, isFailed }: { isComplete: boolean; isFailed: boolean }) => {
  // Pre-generate stable random values using useMemo pattern
  const particleData = [
    { x: -150, duration: 3.5 },
    { x: -100, duration: 4.2 },
    { x: -50, duration: 3.8 },
    { x: 0, duration: 4.5 },
    { x: 50, duration: 3.3 },
    { x: 100, duration: 4.0 },
    { x: 150, duration: 3.6 },
    { x: -120, duration: 4.3 },
    { x: -80, duration: 3.9 },
    { x: 30, duration: 4.1 },
    { x: 80, duration: 3.4 },
    { x: 130, duration: 4.4 },
  ];
  const color = isFailed ? "#ef4444" : isComplete ? "#22c55e" : "#eab308";
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particleData.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ backgroundColor: color }}
          initial={{
            x: particle.x,
            y: 400,
            opacity: 0,
          }}
          animate={{
            y: -50,
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

// Pulsing ring effect - evolving circles around Loki
const PulsingRings = ({ isComplete, isFailed }: { isComplete: boolean; isFailed: boolean }) => {
  const color = isFailed ? "border-red-500" : isComplete ? "border-green-500" : "border-yellow-500";
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full border ${color}`}
          style={{ width: '6rem', height: '6rem' }}
          initial={{ scale: 0.5, opacity: 0.8 }}
          animate={{
            scale: [0.5, 1.2, 1.8, 2.5],
            opacity: [0.8, 0.5, 0.2, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

export function WatcherCreationLoader({
  steps,
  currentStep,
  isComplete,
  isFailed,
  isVisible,
  errorMessage,
  onClose,
  onRetry,
}: WatcherCreationLoaderProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
          {/* Background ambient glow */}
          <div 
            className={`absolute inset-0 opacity-20 ${
              isFailed ? "bg-red-900" : isComplete ? "bg-green-900" : "bg-yellow-900"
            }`} 
            style={{
              background: isFailed 
                ? "radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.15) 0%, transparent 70%)"
                : isComplete
                ? "radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.15) 0%, transparent 70%)"
                : "radial-gradient(circle at 50% 50%, rgba(234, 179, 8, 0.15) 0%, transparent 70%)"
            }}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative p-px rounded-2xl max-w-4xl w-full mx-4"
          >
            {/* Animated border glow */}
            <AnimatedBorderGlow duration={1} isFailed={isFailed} isComplete={isComplete} />

            {/* Main content - Horizontal layout */}
            <div className="relative bg-zinc-950/95 border border-zinc-800/50 rounded-2xl p-6 md:p-8 overflow-hidden">
              {/* Close button - only show when complete or failed */}
              {(isComplete || isFailed) && onClose && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-white transition-colors"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
              {/* Floating particles */}
              <FloatingParticles isComplete={isComplete} isFailed={isFailed} />

              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                {/* Left side - Icon and status */}
                <div className="flex flex-col items-center justify-center md:w-56 shrink-0 relative">
                  {/* Loki centered in pulsing rings */}
                  <div className="relative flex items-center justify-center mb-4">
                    <PulsingRings isComplete={isComplete} isFailed={isFailed} />
                    
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                      className={`relative inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full z-10 ${
                        isFailed 
                          ? "bg-gradient-to-br from-red-500/20 to-red-600/10 border-2 border-red-500/30" 
                          : isComplete 
                          ? "bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500/30"
                          : "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/30"
                      }`}
                    >
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-green-400" />
                      </motion.div>
                    ) : isFailed ? (
                      <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <Image 
                          src="/scarlet-witch.svg" 
                          alt="Scarlet Witch - Error" 
                          width={48} 
                          height={48}
                          className="w-10 h-10 md:w-12 md:h-12"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <LokiIcon className="w-12 h-12 md:w-14 md:h-14" />
                      </motion.div>
                    )}
                    
                    {/* Spinning ring around icon */}
                    {!isComplete && !isFailed && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-yellow-500 border-r-yellow-500/50"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                  </motion.div>
                  </div>

                  <motion.h3 
                    className={`text-lg md:text-xl font-bold text-center ${
                      isFailed ? "text-red-400" : isComplete ? "text-green-400" : "text-yellow-400"
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {isComplete
                      ? "Watcher Awakened!"
                      : isFailed
                      ? "Mischief"
                      : "Your saviour is here!"}
                  </motion.h3>
                  <motion.p 
                    className="text-zinc-500 text-xs md:text-sm mt-1 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {isComplete
                      ? "Ready to hunt"
                      : isFailed
                      ? "The purpose failed"
                      : "I am burdened with glorious purpose"}
                  </motion.p>
                </div>

                {/* Right side - Steps */}
                <div className="flex-1 flex flex-col">
                  {/* Steps grid - 2 columns on larger screens */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {steps.map((step, index) => {
                      const isCurrentStep = index === currentStep;
                      const isCompletedStep = index < currentStep || isComplete;
                      const isFailedStep = isFailed && index === currentStep;

                      return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                          className={`relative flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${
                            isCurrentStep && !isFailed
                              ? "bg-yellow-500/10 border border-yellow-500/30"
                              : isCompletedStep
                              ? "bg-green-500/5 border border-green-500/20"
                              : isFailedStep
                              ? "bg-red-500/10 border border-red-500/30"
                              : "bg-zinc-900/30 border border-zinc-800/30"
                          }`}
                        >
                          {/* Status Icon */}
                          <div className="relative shrink-0">
                            {isCompletedStep ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center"
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              </motion.div>
                            ) : isFailedStep ? (
                              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                <XCircle className="w-4 h-4 text-red-400" />
                              </div>
                            ) : isCurrentStep ? (
                              <motion.div 
                                className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center"
                                animate={{ boxShadow: ["0 0 0 0 rgba(234, 179, 8, 0.4)", "0 0 0 6px rgba(234, 179, 8, 0)"] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                              >
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <Zap className="w-4 h-4 text-yellow-400" />
                                </motion.div>
                              </motion.div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-zinc-800/50 flex items-center justify-center">
                                <Circle className="w-3 h-3 text-zinc-600" />
                              </div>
                            )}
                          </div>

                          {/* Label */}
                          <span
                            className={`text-xs md:text-sm font-medium truncate ${
                              isCompletedStep
                                ? "text-green-400"
                                : isCurrentStep
                                ? "text-yellow-400"
                                : isFailedStep
                                ? "text-red-400"
                                : "text-zinc-500"
                            }`}
                          >
                            {step.label}
                          </span>

                          {/* Current step dots */}
                          {isCurrentStep && !isComplete && !isFailed && (
                            <motion.div className="flex gap-0.5 ml-auto">
                              {[0, 1, 2].map((i) => (
                                <motion.div
                                  key={i}
                                  className="w-1 h-1 rounded-full bg-yellow-400"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                                />
                              ))}
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          isFailed
                            ? "bg-gradient-to-r from-red-600 to-red-400"
                            : isComplete
                            ? "bg-gradient-to-r from-green-600 to-green-400"
                            : "bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-500"
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
                        style={{
                          boxShadow: isFailed 
                            ? "0 0 12px rgba(239, 68, 68, 0.5)"
                            : isComplete
                            ? "0 0 12px rgba(34, 197, 94, 0.5)"
                            : "0 0 12px rgba(234, 179, 8, 0.5)"
                        }}
                      />
                    </div>
                    <p className={`text-xs font-medium mt-2 ${
                      isFailed ? "text-red-400" : isComplete ? "text-green-400" : "text-yellow-400"
                    }`}>
                      {isComplete
                        ? "Complete!"
                        : isFailed
                        ? `Failed at step ${currentStep + 1}`
                        : `Step ${currentStep + 1} of ${steps.length}`}
                    </p>
                  </div>

                  {/* Error message display */}
                  {isFailed && errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                    >
                      <p className="text-xs md:text-sm text-red-400 break-words">
                        <span className="font-semibold">Error: </span>
                        {errorMessage}
                      </p>
                    </motion.div>
                  )}

                  {/* Action buttons */}
                  {(isComplete || isFailed) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-4 flex gap-3 justify-end"
                    >
                      {isFailed && onRetry && (
                        <button
                          onClick={onRetry}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Try Again
                        </button>
                      )}
                      {onClose && (
                        <button
                          onClick={onClose}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isComplete
                              ? "bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:text-green-300 border border-green-500/30"
                              : "bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30"
                          }`}
                        >
                          {isComplete ? (
                            <>
                              Continue
                              <ArrowRight className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Close
                            </>
                          )}
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Updated steps for watcher creation with descriptions
export const WATCHER_CREATION_STEPS: LoadingStep[] = [
  { id: "validate", label: "Validating Repository", description: "Checking access and permissions..." },
  { id: "clone", label: "Cloning & Discovering", description: "Fetching code and finding entities..." },
  { id: "analyze-repo", label: "Analyzing Repository", description: "AI analyzing codebase structure..." },
  { id: "analyze-candidates", label: "Analyzing Candidates", description: "AI analyzing each entity..." },
  { id: "store", label: "Storing Data", description: "Saving watcher and candidates..." },
  { id: "complete", label: "Complete", description: "Watcher created successfully!" },
];
