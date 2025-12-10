"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

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
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-zinc-400">{getGreeting()}, </span>
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <p className="text-zinc-500 text-lg md:text-xl">
            Welcome to Services Doomsday
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-8 shadow-xl"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 font-medium">System Online</span>
          </div>
          <p className="text-zinc-400 text-sm md:text-base">
            Navigate to <span className="text-emerald-400 font-medium">Watchers</span> to start hunting zombie services
          </p>
        </motion.div>

        {/* Quick Stats - Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 grid grid-cols-3 gap-4"
        >
          {[
            { label: "Active Watchers", value: "0" },
            { label: "Zombies Found", value: "0" },
            { label: "PRs Created", value: "0" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="bg-zinc-900/30 border border-zinc-800/30 rounded-xl p-4"
            >
              <p className="text-2xl md:text-3xl font-bold text-white mb-1">
                {stat.value}
              </p>
              <p className="text-xs md:text-sm text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
