"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Skull, Heart, Eye } from "lucide-react";

type ActionStatus = "loading" | "success" | "error";
type ActionType = "kill" | "false_alert" | "watch_more";

interface ActionResult {
  success: boolean;
  action: ActionType;
  message: string;
  error?: string;
  details?: string;
}

const actionConfig: Record<ActionType, { icon: React.ReactNode; title: string; color: string; bg: string }> = {
  kill: {
    icon: <Skull className="w-8 h-8" />,
    title: "Kill Order Confirmed",
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/30",
  },
  false_alert: {
    icon: <Heart className="w-8 h-8" />,
    title: "Marked as Healthy",
    color: "text-green-500",
    bg: "bg-green-500/10 border-green-500/30",
  },
  watch_more: {
    icon: <Eye className="w-8 h-8" />,
    title: "Observation Extended",
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
};

function ActionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<ActionStatus>("loading");
  const [result, setResult] = useState<ActionResult | null>(null);
  const hasProcessed = useRef(false);

  const token = searchParams.get("token");
  const action = searchParams.get("action") as ActionType;

  const processAction = useCallback(async (actionToken: string, actionType: ActionType) => {
    try {
      const res = await fetch(`/api/actions/w3?token=${actionToken}&action=${actionType}`);
      const data = await res.json();
      
      if (data.success) {
        setStatus("success");
        setResult(data);
      } else {
        setStatus("error");
        setResult({
          success: false,
          action: actionType,
          message: data.error || "Action failed",
          error: data.error,
          details: data.details,
        });
      }
    } catch (err) {
      setStatus("error");
      setResult({
        success: false,
        action: actionType,
        message: "Network error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    // Prevent double execution with ref
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    if (!token || !action) {
      // Invalid params - show error after mount
      requestAnimationFrame(() => {
        setStatus("error");
        setResult({
          success: false,
          action: action || "kill",
          message: "Invalid action link",
          error: "Missing token or action parameter",
        });
      });
      return;
    }

    processAction(token, action);
  }, [token, action, processAction]);

  const config = actionConfig[action] || actionConfig.kill;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            🧟 Services Doomsday
          </h1>
          <p className="text-gray-500 text-sm mt-1">Zombie Detection System</p>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {status === "loading" && (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Processing Action
              </h2>
              <p className="text-gray-400">Please wait...</p>
            </div>
          )}

          {status === "success" && result && (
            <div className="text-center">
              <div className={`w-20 h-20 ${config.bg} border rounded-full flex items-center justify-center mx-auto mb-6`}>
                <div className={config.color}>{config.icon}</div>
              </div>
              <h2 className={`text-2xl font-bold ${config.color} mb-3`}>
                {config.title}
              </h2>
              <p className="text-gray-300 mb-6">{result.message}</p>
              <div className="flex items-center justify-center gap-2 text-green-500 mb-6">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Action completed successfully</span>
              </div>
              <button
                onClick={() => router.push("/home")}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {status === "error" && result && (
            <div className="text-center">
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-500 mb-3">
                Action Failed
              </h2>
              <p className="text-gray-300 mb-4">{result.message}</p>
              {result.details && (
                <p className="text-gray-500 text-sm mb-6 font-mono bg-black/30 rounded-lg p-3">
                  {result.details}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push("/home")}
                  className="flex-1 py-3 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          This link expires in 7 days from email receipt
        </p>
      </div>
    </div>
  );
}

export default function ActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    }>
      <ActionContent />
    </Suspense>
  );
}