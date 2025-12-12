"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Extend Window interface to include our audio instance
declare global {
  interface Window {
    __globalAudio?: HTMLAudioElement;
    __globalAudioLoaded?: boolean;
    __globalAudioError?: boolean;
  }
}

// Helper to safely get localStorage value (handles SSR)
function getInitialMusicPreference(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("musicEnabled") === "true";
}

// Helper to get if music was playing
function getWasMusicPlaying(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("musicPlaying") === "true";
}

// Get or create the global audio instance (survives module re-evaluation)
function getGlobalAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  return window.__globalAudio || null;
}

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(getInitialMusicPreference);

  // Initialize global audio once (truly survives page navigation via window)
  useEffect(() => {
    // Check if audio already exists on window
    if (window.__globalAudio) {
      // Audio exists - sync our state with it
      setIsLoaded(window.__globalAudioLoaded || false);
      setHasError(window.__globalAudioError || false);
      // Sync playing state with actual audio state
      setIsPlaying(!window.__globalAudio.paused);
      return;
    }

    // Create new audio instance
    const audio = new Audio("/audio/loki-theme-1.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = "auto";
    
    // Store on window so it persists
    window.__globalAudio = audio;

    audio.addEventListener("canplaythrough", () => {
      window.__globalAudioLoaded = true;
      setIsLoaded(true);
      
      // Auto-resume if music was playing before
      if (getWasMusicPlaying()) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(console.warn);
      }
    });

    audio.addEventListener("error", () => {
      console.warn("Background music file not found. Add your music to /public/audio/<music_file>.mp3");
      window.__globalAudioError = true;
      setHasError(true);
    });

    audio.load();

    // No cleanup - we want the audio to persist!
  }, []);

  // Handle play/pause based on state
  useEffect(() => {
    const audio = getGlobalAudio();
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn("Audio playback failed:", err);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Save preference to localStorage (both enabled and currently playing state)
  useEffect(() => {
    if (hasInteracted) {
      localStorage.setItem("musicEnabled", "true");
    }
    localStorage.setItem("musicPlaying", isPlaying.toString());
  }, [isPlaying, hasInteracted]);

  const toggleMusic = useCallback(() => {
    setHasInteracted(true);
    setIsPlaying((prev) => !prev);
  }, []);

  // Don't show button if audio file is missing or not loaded yet
  if (hasError || !isLoaded) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.3 }}
      onClick={toggleMusic}
      className="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 hover:border-zinc-500 flex items-center justify-center transition-all group cursor-hover"
      title={isPlaying ? "Pause Music" : "Play Music"}
      aria-label={isPlaying ? "Pause background music" : "Play background music"}
    >
      {/* Animated rings when playing */}
      <AnimatePresence>
        {isPlaying && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0.5, 0], scale: [1, 1.8] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-emerald-500/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0.3, 0], scale: [1, 2.2] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
              className="absolute inset-0 rounded-full border border-emerald-500/30"
            />
          </>
        )}
      </AnimatePresence>

      {/* Music icon */}
      <div className="relative">
        {isPlaying ? (
          // Sound wave bars animation
          <div className="flex items-end gap-0.5 h-5">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-emerald-400 rounded-full"
                animate={{
                  height: ["8px", "16px", "8px"],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        ) : (
          // Muted music icon
          <svg
            className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
            />
            {/* Mute line */}
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              className="text-red-400"
              stroke="currentColor"
            />
          </svg>
        )}
      </div>

      {/* Tooltip */}
      <span className="absolute right-full mr-3 px-2 py-1 bg-zinc-800 text-xs text-zinc-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {isPlaying ? "Pause" : "Play"} Music
      </span>
    </motion.button>
  );
}
