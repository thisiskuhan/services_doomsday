"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedCounter } from "@/components/ui/AnimatedNumber";

interface Stats {
  watchers: { total: number; active: number };
  candidates: { total: number; tracked: number };
  zombies: { highRisk: number; mediumRisk: number; potential: number };
  observations: { last24h: number; candidatesObserved: number };
}

// Animated border glow component for the card
type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const CardBorderGlow = ({ duration = 1.5 }: { duration?: number }) => {
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (currentDirection: Direction): Direction => {
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = (currentIndex + 1) % directions.length;
    return directions[nextIndex];
  };

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(30% 70% at 50% 0%, hsl(0, 0%, 50%) 0%, rgba(161, 161, 170, 0) 100%)",
    LEFT: "radial-gradient(25% 60% at 0% 50%, hsl(0, 0%, 50%) 0%, rgba(161, 161, 170, 0) 100%)",
    BOTTOM: "radial-gradient(30% 70% at 50% 100%, hsl(0, 0%, 50%) 0%, rgba(161, 161, 170, 0) 100%)",
    RIGHT: "radial-gradient(25% 60% at 100% 50%, hsl(0, 0%, 50%) 0%, rgba(161, 161, 170, 0) 100%)",
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection((prevState) => rotateDirection(prevState));
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0"
      style={{ filter: "blur(2px)" }}
      initial={{ opacity: 0, background: movingMap[direction] }}
      animate={{ opacity: 1, background: movingMap[direction] }}
      transition={{ ease: "linear", duration: duration }}
    />
  );
};

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const response = await fetch(`/api/stats?userId=${user.uid}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      fetchStats();
      // Refresh stats every 30 seconds
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchStats, user?.uid]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const firstName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Developer";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium mb-4">
            <span className="text-zinc-400">{getGreeting()}, </span>
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <p className="text-zinc-500 text-lg md:text-xl">
            Welcome to Doom Castle
          </p>
          <p className="text-zinc-600 text-sm md:text-base mt-2">
            AI-powered zombie code hunter that watches your repos, detects unused services,
            <br />
            and helps you safely remove dead code.
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative rounded-2xl p-px"
        >
          <CardBorderGlow duration={1.5} />
          <div className="relative bg-zinc-900/90 backdrop-blur-xl rounded-2xl p-8 shadow-xl z-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-medium">System Online</span>
            </div>
            <p className="text-zinc-400 text-sm md:text-base">
              Navigate to <span className="text-emerald-400 font-medium">Watchers</span> to start hunting zombie services
            </p>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 grid grid-cols-3 gap-4"
        >
          {[
            { 
              label: "Active Watchers", 
              value: stats?.watchers.total ?? 0,
              subValue: stats?.watchers.active,
              subLabel: "scheduled",
              color: "emerald"
            },
            { 
              label: "Zombies Found", 
              value: stats?.zombies.potential ?? 0,
              subValue: stats?.zombies.highRisk,
              subLabel: "high risk",
              color: "red"
            },
            { 
              label: "Candidates", 
              value: stats?.candidates.total ?? 0,
              subValue: stats?.candidates.tracked,
              subLabel: "tracked",
              color: "blue"
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="group relative bg-zinc-900/30 border border-zinc-800/30 rounded-xl p-4 hover:border-zinc-700/50 transition-all duration-300 overflow-hidden"
            >
              {/* Glow effect on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${
                stat.color === "emerald" ? "from-emerald-500/5" :
                stat.color === "red" ? "from-red-500/5" :
                "from-blue-500/5"
              } to-transparent`} />
              
              <div className="relative z-10">
                {isLoading ? (
                  <div className="h-8 md:h-10 flex items-center">
                    <div className="w-8 h-6 bg-zinc-800/50 rounded animate-pulse" />
                  </div>
                ) : (
                  <p className={`text-2xl md:text-3xl font-semibold mb-1 ${
                    stat.color === "emerald" ? "text-emerald-400" :
                    stat.color === "red" ? "text-red-400" :
                    "text-blue-400"
                  }`}>
                    <AnimatedCounter 
                      value={stat.value} 
                      duration={800} 
                      delay={200 + i * 80} 
                    />
                  </p>
                )}
                <p className="text-xs md:text-sm text-zinc-500">{stat.label}</p>
                {stat.subValue !== undefined && stat.subValue > 0 && (
                  <p className="text-[10px] md:text-xs text-zinc-600 mt-1">
                    <span className={
                      stat.color === "emerald" ? "text-emerald-500/70" :
                      stat.color === "red" ? "text-red-500/70" :
                      "text-blue-500/70"
                    }>
                      {stat.subValue}
                    </span>
                    {" "}{stat.subLabel}
                  </p>
                )}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Last updated indicator */}
        {lastRefresh && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-zinc-600 text-xs mt-4"
          >
            Last updated: {lastRefresh.toLocaleTimeString()}
          </motion.p>
        )}
      </div>
    </div>
  );
}
