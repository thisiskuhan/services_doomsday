"use client";

import { motion } from "framer-motion";
import { Spotlight } from "@/components/ui/spotlight-new";
import Image from "next/image";

// Dr. Doom Icon for the loader - uses actual SVG from public folder
const DoomIcon = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <Image src="/dr-doom.svg" alt="Dr. Doom" fill className="object-contain" priority />
  </div>
);

interface DoomLoaderProps {
  text?: string;
  subText?: string;
  fullScreen?: boolean;
}

export function DoomLoader({ text = "Loading...", subText, fullScreen = false }: DoomLoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center">
      {/* Outer glow container */}
      <div className="relative">
        {/* Pulsing glow rings */}
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ width: 160, height: 160, top: -20, left: -20 }}
        />
        
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-400/30 blur-lg"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
          style={{ width: 140, height: 140, top: -10, left: -10 }}
        />

        {/* Rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-emerald-500/50"
          style={{ width: 130, height: 130, top: -5, left: -5 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Orbiting dot */}
          <motion.div
            className="absolute w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_#10b981]"
            style={{ top: -6, left: "50%", marginLeft: -6 }}
          />
        </motion.div>

        {/* Counter-rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-dashed border-emerald-500/30"
          style={{ width: 150, height: 150, top: -15, left: -15 }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Dr. Doom Icon with pulse */}
        <motion.div
          className="relative z-10 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <DoomIcon className="w-28 h-28" />
        </motion.div>

        {/* Scanning line effect */}
        <motion.div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
          style={{ width: 120, marginLeft: 0 }}
          animate={{
            top: [0, 112, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Text with typing effect */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.p
          className="text-emerald-400 font-medium text-lg tracking-wide"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
        {subText && (
          <p className="text-zinc-600 text-sm mt-2">{subText}</p>
        )}
      </motion.div>

      {/* Bottom decorative elements */}
      <div className="flex items-center gap-2 mt-6">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-emerald-500/50"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  );

  // Full screen version with spotlight background (for login page)
  if (fullScreen) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] relative overflow-hidden flex flex-col items-center justify-center">
        {/* Spotlight Background */}
        <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(145, 100%, 40%, .12) 0, hsla(145, 80%, 30%, .04) 50%, hsla(145, 60%, 20%, 0) 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(145, 100%, 45%, .08) 0, hsla(145, 80%, 35%, .03) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(160, 100%, 40%, .06) 0, hsla(160, 80%, 30%, .02) 80%, transparent 100%)"
          translateY={-300}
          width={600}
          height={1400}
          smallWidth={280}
          duration={8}
          xOffset={120}
        />

        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,255,65,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Ambient glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[128px] pointer-events-none" />

        {/* Loader content */}
        <div className="relative z-10">
          {content}
        </div>
      </div>
    );
  }

  // Default inline version (for dashboard loading states)
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)]">
      {content}
    </div>
  );
}
