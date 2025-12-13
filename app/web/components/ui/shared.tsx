"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
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

export type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

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
  emerald: { hsl: "hsl(145, 80%, 45%)", rgba: "rgba(16, 185, 129, 0)" },
  yellow: { hsl: "hsl(45, 100%, 50%)", rgba: "rgba(234, 179, 8, 0)" },
  red: { hsl: "hsl(0, 80%, 50%)", rgba: "rgba(239, 68, 68, 0)" },
  grey: { hsl: "hsl(0, 0%, 50%)", rgba: "rgba(161, 161, 170, 0)" },
};

export function AnimatedBorderGlow({
  color = "grey",
  duration = 1,
  isHovered,
  alwaysAnimate = false,
  className = "",
}: AnimatedBorderGlowProps) {
  const [direction, setDirection] = useState<Direction>("TOP");

  const shouldAnimate = alwaysAnimate || isHovered;

  const { hsl, rgba } = COLOR_CONFIG[color];

  const movingMap = useMemo(
    () => ({
      TOP: `radial-gradient(30% 70% at 50% 0%, ${hsl} 0%, ${rgba} 100%)`,
      LEFT: `radial-gradient(25% 60% at 0% 50%, ${hsl} 0%, ${rgba} 100%)`,
      BOTTOM: `radial-gradient(30% 70% at 50% 100%, ${hsl} 0%, ${rgba} 100%)`,
      RIGHT: `radial-gradient(25% 60% at 100% 50%, ${hsl} 0%, ${rgba} 100%)`,
    }),
    [hsl, rgba]
  );

  useEffect(() => {
    if (!shouldAnimate) return;

    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const interval = setInterval(() => {
      setDirection((prev) => {
        const idx = directions.indexOf(prev);
        return directions[(idx + 1) % directions.length];
      });
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [shouldAnimate, duration]);

  // For hover-based glow, don't render if not hovered
  if (isHovered !== undefined && !isHovered) return null;

  return (
    <motion.div
      className={`absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0 ${className}`}
      style={{ filter: "blur(2px)" }}
      initial={{ opacity: alwaysAnimate ? 1 : 0, background: movingMap[direction] }}
      animate={{ opacity: 1, background: movingMap[direction] }}
      exit={{ opacity: 0 }}
      transition={{ ease: "linear", duration }}
    />
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
      <AnimatedBorderGlow isHovered={isHovered} color={glowColor} duration={0.8} />
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
  let bg = "bg-emerald-500";
  if (percentage >= 70) {
    color = "text-red-400";
    bg = "bg-red-500";
  } else if (percentage >= 40) {
    color = "text-yellow-400";
    bg = "bg-yellow-500";
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
            className="h-full bg-gradient-to-r from-red-600 via-red-500 to-red-400"
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

export function HoverBorderGlow({ isHovered, duration = 1, color = "grey" }: HoverBorderGlowProps) {
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

// ===== Zombie Score Progress Display =====

interface ZombieScoreProgressProps {
  score: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function ZombieScoreProgress({ score, size = "md", showLabel = true }: ZombieScoreProgressProps) {
  const level = getZombieScoreLevel(score);
  const percentage = Math.min(100, Math.max(0, score));
  
  const heightClass = size === "sm" ? "h-1.5" : "h-2";
  const textClass = size === "sm" ? "text-xs" : "text-sm";
  
  // Gradient based on score position
  const getGradient = () => {
    if (score >= 60) return "from-red-600 via-red-500 to-red-400";
    if (score >= 40) return "from-orange-600 via-orange-500 to-yellow-400";
    if (score >= 20) return "from-yellow-500 via-yellow-400 to-green-400";
    return "from-green-500 via-green-400 to-emerald-400";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <div className={`${heightClass} bg-zinc-800 rounded-full overflow-hidden`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full bg-gradient-to-r ${getGradient()}`}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`font-bold ${level.textColor} ${textClass}`}>{score}</span>
        {showLabel && (
          <span className={`${level.textColor} opacity-70 ${textClass}`}>
            {level.emoji}
          </span>
        )}
      </div>
    </div>
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
