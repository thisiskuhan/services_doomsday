"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Skull, GitPullRequest, Copy } from "lucide-react";
import { useEffect, useState } from "react";

interface KillSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  executionId: string;
  entitySignature?: string;
}

export function KillSuccessDialog({
  isOpen,
  onClose,
  executionId,
  entitySignature,
}: KillSuccessDialogProps) {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const copyExecutionId = async () => {
    try {
      await navigator.clipboard.writeText(executionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = executionId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-100"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-101 w-full max-w-md px-4"
          >
            <div className="relative bg-zinc-900 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/10 overflow-hidden">
              {/* Animated background glow */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.1, 0.2, 0.1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-20 -left-20 w-40 h-40 bg-red-500/30 rounded-full blur-3xl"
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.1, 0.15, 0.1] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"
                />
              </div>

              {/* Content */}
              <div className="relative z-10">
                {/* Success icon animation */}
                <div className="flex justify-center pt-8 pb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="relative"
                  >
                    {/* Pulse rings */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 bg-red-500/20 rounded-full"
                    />
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.3 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                      className="absolute inset-0 bg-red-500/10 rounded-full"
                    />
                    
                    {/* Icon container */}
                    <div className="relative w-20 h-20 bg-linear-to-br from-red-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                      <Skull className="w-10 h-10 text-red-400" />
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="absolute -top-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-zinc-900"
                      >
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </motion.div>
                    </div>
                  </motion.div>
                </div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center px-6"
                >
                  <h3 className="text-xl font-bold text-white mb-2">
                    Kill Workflow Triggered!
                  </h3>
                  <p className="text-sm text-zinc-400">
                    The zombie elimination process has begun
                  </p>
                </motion.div>

                {/* Details */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="px-6 py-5 space-y-3"
                >
                  {/* Execution ID */}
                  <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Execution ID
                      </span>
                      <button
                        onClick={copyExecutionId}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-sm text-white break-all">
                      {executionId}
                    </p>
                  </div>

                  {/* Entity if provided */}
                  {entitySignature && (
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
                        Target Entity
                      </span>
                      <p className="font-mono text-sm text-red-400 break-all">
                        {entitySignature}
                      </p>
                    </div>
                  )}

                  {/* What happens next */}
                  <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <GitPullRequest className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-purple-200 font-medium">
                        Pull Request Incoming
                      </p>
                      <p className="text-xs text-purple-300/70 mt-1">
                        A PR will be created to safely remove the dead code. You&apos;ll receive an email notification once it&apos;s ready for review.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Action button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="px-6 pb-6"
                >
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-4 bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
                  >
                    <span>Got it</span>
                  </button>
                </motion.div>

                {/* Footer */}
                <div className="px-6 pb-4 text-center">
                  <p className="text-xs text-zinc-600">
                    Track progress in the Kestra dashboard
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
