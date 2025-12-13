"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ShieldOff, Skull } from "lucide-react";
import { useEffect } from "react";

export type ConfirmDialogVariant = "danger" | "warning" | "zombie";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    confirmBg: "bg-red-500 hover:bg-red-600",
    borderColor: "border-red-500/30",
    glowColor: "shadow-red-500/20",
  },
  warning: {
    icon: ShieldOff,
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    confirmBg: "bg-amber-500 hover:bg-amber-600",
    borderColor: "border-amber-500/30",
    glowColor: "shadow-amber-500/20",
  },
  zombie: {
    icon: Skull,
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
    confirmBg: "bg-purple-500 hover:bg-purple-600",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/20",
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, isLoading, onClose]);

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={!isLoading ? onClose : undefined}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md px-4"
          >
            <div
              className={`bg-zinc-900 border ${config.borderColor} rounded-2xl shadow-2xl ${config.glowColor} overflow-hidden`}
            >
              {/* Header with icon */}
              <div className="relative p-6 pb-4">
                {/* Close button */}
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Icon */}
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${config.iconBg}`}>
                    <Icon className={`w-6 h-6 ${config.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="px-6 pb-4">
                <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 p-4 bg-zinc-950/50 border-t border-zinc-800">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-xl transition-all disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium text-white ${config.confirmBg} rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      <span>Processing...</span>
                    </>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
