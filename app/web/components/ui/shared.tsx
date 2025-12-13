"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Route,
  Timer,
  MessageSquare,
  Cpu,
  Server,
  RefreshCw,
  Waves,
} from "lucide-react";
import { CANDIDATE_STATUS_CONFIG, WATCHER_STATUS_CONFIG, getZombieScoreLevel } from "@/lib/utils";

// ===== Types =====

export type GlowColor = "emerald" | "yellow" | "red" | "grey";

// ===== Animated Border Glow Component =====

interface AnimatedBorderGlowProps {
  color?: GlowColor;
  duration?: number;
  isHovered?: boolean;
  alwaysAnimate?: boolean;
  className?: string;
}

const COLOR_CONFIG = {
  emerald: { solid: "rgb(16, 185, 129)", glow: "rgba(16, 185, 129, 0.6)" },
  yellow: { solid: "rgb(234, 179, 8)", glow: "rgba(234, 179, 8, 0.6)" },
  red: { solid: "rgb(239, 68, 68)", glow: "rgba(239, 68, 68, 0.6)" },
  grey: { solid: "rgb(161, 161, 170)", glow: "rgba(161, 161, 170, 0.6)" },
};

export function AnimatedBorderGlow({
  color = "grey",
  duration = 4,
  isHovered,
  alwaysAnimate = false,
  className = "",
}: AnimatedBorderGlowProps) {
  const [rotation, setRotation] = useState(0);
  const { solid } = COLOR_CONFIG[color];
  
  const isHoverControlled = isHovered !== undefined;
  const shouldShow = alwaysAnimate || isHovered === true;
  const shouldAnimate = shouldShow;

  // Smooth rotation using requestAnimationFrame
  useEffect(() => {
    if (!shouldAnimate) return;
    
    let animationId: number;
    let startTime: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const newRotation = (elapsed / (duration * 1000)) * 360;
      setRotation(newRotation % 360);
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [shouldAnimate, duration]);

  const gradientStyle = {
    background: `conic-gradient(from ${rotation}deg, transparent 0%, transparent 30%, ${solid} 50%, transparent 70%, transparent 100%)`,
    filter: "blur(6px)",
  };

  if (isHoverControlled) {
    return (
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            key="border-glow"
            className={`absolute -inset-[1px] overflow-hidden rounded-2xl pointer-events-none z-0 ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="absolute inset-0" style={gradientStyle} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // For always-animate
  return (
    <motion.div
      className={`absolute -inset-[1px] overflow-hidden rounded-2xl pointer-events-none z-0 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0" style={gradientStyle} />
    </motion.div>
  );
}

// ===== Animated Card Wrapper =====

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  initialAnimation?: boolean;
  delay?: number;
  glowColor?: GlowColor;
}

export function AnimatedCard({
  children,
  className = "",
  initialAnimation = false,
  delay = 0,
  glowColor = "grey",
}: AnimatedCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={initialAnimation ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={initialAnimation ? { delay } : undefined}
      className="relative rounded-xl p-px"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatedBorderGlow isHovered={isHovered} color={glowColor} duration={4} />
      <div className={`relative bg-zinc-900/90 backdrop-blur-sm rounded-xl p-5 z-10 ${className}`}>
        {children}
      </div>
    </motion.div>
  );
}

// ===== Entity Icon Component =====

interface EntityIconProps {
  type: string;
  size?: "sm" | "md" | "lg";
}

export function EntityIcon({ type, size = "md" }: EntityIconProps) {
  const sizeClass = size === "lg" ? "w-8 h-8" : size === "md" ? "w-5 h-5" : "w-4 h-4";
  
  const icons: Record<string, React.ReactNode> = {
    http_endpoint: <Route className={`${sizeClass} text-blue-400`} />,
    cron_job: <Timer className={`${sizeClass} text-purple-400`} />,
    queue_worker: <MessageSquare className={`${sizeClass} text-orange-400`} />,
    serverless_function: <Cpu className={`${sizeClass} text-cyan-400`} />,
    websocket: <Waves className={`${sizeClass} text-green-400`} />,
    grpc_service: <Server className={`${sizeClass} text-pink-400`} />,
    graphql_resolver: <RefreshCw className={`${sizeClass} text-amber-400`} />,
  };

  return icons[type] || <Server className={`${sizeClass} text-zinc-400`} />;
}

// ===== Status Badge Components =====

interface CandidateStatusBadgeProps {
  status: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function CandidateStatusBadge({ status, showLabel = true, size = "md" }: CandidateStatusBadgeProps) {
  const config = CANDIDATE_STATUS_CONFIG[status as keyof typeof CANDIDATE_STATUS_CONFIG] || CANDIDATE_STATUS_CONFIG.pending;
  
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-[10px]" 
    : "px-3 py-1 text-sm";
  
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`rounded-full ${config.dot} ${dotSize} ${status === "active" ? "animate-pulse" : ""}`} />
      {showLabel && config.label}
    </span>
  );
}

interface WatcherStatusBadgeProps {
  status: string;
}

export function WatcherStatusBadge({ status }: WatcherStatusBadgeProps) {
  const config = WATCHER_STATUS_CONFIG[status as keyof typeof WATCHER_STATUS_CONFIG] || WATCHER_STATUS_CONFIG.pending_schedule;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// ===== Risk Score Display =====

interface RiskScoreProps {
  score: number | null;
  showBar?: boolean;
  size?: "sm" | "md";
}

export function RiskScore({ score, showBar = true, size = "md" }: RiskScoreProps) {
  if (score === null) return <span className="text-zinc-500">Not analyzed</span>;

  const percentage = Math.round(score * 100);
  
  let color = "text-emerald-400";
  let barColor = "from-emerald-600 via-emerald-500 to-emerald-400";
  if (percentage >= 70) {
    color = "text-red-400";
    barColor = "from-red-600 via-red-500 to-red-400";
  } else if (percentage >= 40) {
    color = "text-yellow-400";
    barColor = "from-yellow-600 via-yellow-500 to-yellow-400";
  }

  const textSize = size === "sm" ? "text-sm" : "text-lg";

  if (!showBar) {
    return <span className={`font-bold ${color} ${textSize}`}>{percentage}%</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full bg-gradient-to-r ${barColor}`}
          />
        </div>
        {/* Scarlet Witch (Wanda) Icon at the tip of progress bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0, left: 0 }}
          animate={{ opacity: 1, scale: 1, left: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10"
        >
          <Image
            src="/scarlet-witch.svg"
            alt="Scarlet Witch"
            width={40}
            height={40}
            className="object-contain drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          />
        </motion.div>
      </div>
      <span className={`font-bold ${color} ${textSize}`}>{percentage}%</span>
    </div>
  );
}

// ===== Stat Card =====

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "yellow" | "red" | "purple";
}

export function StatCard({ label, value, icon, color = "emerald" }: StatCardProps) {
  const colorClasses = {
    emerald: "text-emerald-400 bg-emerald-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    red: "text-red-400 bg-red-500/10",
    purple: "text-purple-400 bg-purple-500/10",
  };

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ===== Hover Border Glow (Alias for AnimatedBorderGlow with isHovered) =====

interface HoverBorderGlowProps {
  isHovered: boolean;
  duration?: number;
  color?: GlowColor;
}

export function HoverBorderGlow({ isHovered, duration = 4, color = "grey" }: HoverBorderGlowProps) {
  return <AnimatedBorderGlow isHovered={isHovered} duration={duration} color={color} />;
}

// ===== Zombie Score Display Component =====

interface ZombieScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showEmoji?: boolean;
}

export function ZombieScoreBadge({ 
  score, 
  size = "md", 
  showLabel = true,
  showEmoji = true 
}: ZombieScoreBadgeProps) {
  const level = getZombieScoreLevel(score);
  
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-1",
    md: "px-2 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };
  
  const scoreClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <span className={`inline-flex items-center ${sizeClasses[size]} font-medium rounded-full ${level.bgColor} ${level.textColor} border ${level.borderColor}`}>
      {showEmoji && <span>{level.emoji}</span>}
      <span className={`font-bold ${scoreClasses[size]}`}>{score}</span>
      {showLabel && <span className="opacity-80">{level.label}</span>}
    </span>
  );
}

// ===== Verdict Badge for W3 results =====

interface VerdictBadgeProps {
  verdict: "zombie" | "healthy" | "pending" | "watching";
  size?: "sm" | "md";
}

export function VerdictBadge({ verdict, size = "md" }: VerdictBadgeProps) {
  const configs = {
    zombie: { 
      emoji: "", 
      label: "ZOMBIE", 
      bg: "bg-red-500/20", 
      text: "text-red-400",
      border: "border-red-500/50",
      animate: true 
    },
    healthy: { 
      emoji: "", 
      label: "HEALTHY", 
      bg: "bg-green-500/20", 
      text: "text-green-400",
      border: "border-green-500/50",
      animate: false 
    },
    pending: { 
      emoji: "", 
      label: "PENDING", 
      bg: "bg-purple-500/20", 
      text: "text-purple-400",
      border: "border-purple-500/50",
      animate: true 
    },
    watching: { 
      emoji: "", 
      label: "WATCHING", 
      bg: "bg-blue-500/20", 
      text: "text-blue-400",
      border: "border-blue-500/50",
      animate: true 
    },
  };
  
  const config = configs[verdict];
  
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-[10px] gap-1" 
    : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <motion.span 
      className={`inline-flex items-center ${sizeClasses} font-bold rounded-full ${config.bg} ${config.text} border ${config.border}`}
      animate={config.animate ? { scale: [1, 1.02, 1] } : undefined}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </motion.span>
  );
}
