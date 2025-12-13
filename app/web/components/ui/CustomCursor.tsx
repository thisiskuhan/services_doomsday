"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

// Dr. Doom Icon Component - uses actual SVG from public folder
const DoomIcon = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <Image src="/dr-doom.svg" alt="Dr. Doom" fill className="object-contain" priority />
  </div>
);

// Iron Man Icon Component for Logout - uses actual SVG from public folder
const IronManIcon = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <Image src="/ironman.svg" alt="Iron Man" fill className="object-contain" priority />
  </div>
);

// Loki Icon Component for Watchers - uses actual SVG from public folder
// Exported for reuse in other components
export const LokiIcon = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <Image src="/loki.svg" alt="Loki" fill className="object-contain" priority />
  </div>
);

// Scarlet Witch Icon Component - uses actual SVG from public folder
export const ScarletWitchIcon = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <Image src="/scarlet-witch.svg" alt="Scarlet Witch" fill className="object-contain" priority />
  </div>
);

// Captain America Icon Component - uses actual SVG from public folder
export const CaptainAmericaIcon = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <Image src="/captain-america.svg" alt="Captain America" fill className="object-contain" priority />
  </div>
);

export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDanger, setIsDanger] = useState(false);
  const [isWatcher, setIsWatcher] = useState(false);
  const [isCaptain, setIsCaptain] = useState(false);
  const [isWanda, setIsWanda] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    // Detect hoverable elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const hoverableElement = target.closest("button") || target.closest("a") || target.closest(".cursor-hover");
      const variantElement = target.closest("[data-variant]");
      
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.classList.contains("cursor-hover") ||
        hoverableElement ||
        variantElement
      ) {
        setIsHovering(true);
        // Check if it's a danger, watcher, captain, or wanda variant
        const elementWithVariant = variantElement || hoverableElement || target;
        const variant = elementWithVariant?.getAttribute("data-variant");
        setIsDanger(variant === "danger");
        setIsWatcher(variant === "watcher");
        setIsCaptain(variant === "captain");
        setIsWanda(variant === "wanda");
      } else {
        setIsHovering(false);
        setIsDanger(false);
        setIsWatcher(false);
        setIsCaptain(false);
        setIsWanda(false);
      }
    };

    window.addEventListener("mousemove", updatePosition);
    window.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", updatePosition);
      window.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Main cursor */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        animate={{
          x: position.x - (isHovering ? 30 : 16),
          y: position.y - (isHovering ? 65 : 16),
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 28,
          mass: 0.5,
        }}
      >
        {isHovering ? (
          /* Icon when hovering - Iron Man for logout, Loki for watchers, Captain America for create, Wanda for delete, Dr. Doom for others */
          <div
            className={`${isWanda ? "w-[47px] h-[47px]" : isWatcher ? "w-[57px] h-[57px]" : isCaptain ? "w-[59px] h-[59px]" : isDanger ? "w-[55px] h-[55px]" : "w-[60px] h-[60px]"} ${isDanger ? "drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" : isWatcher ? "drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]" : isCaptain ? "drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" : isWanda ? "drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" : "drop-shadow-[0_0_10px_rgba(0,255,65,0.6)]"}`}
          >
            {isDanger ? (
              <IronManIcon className="w-full h-full" />
            ) : isWatcher ? (
              <LokiIcon className="w-full h-full" />
            ) : isCaptain ? (
              <CaptainAmericaIcon className="w-full h-full" />
            ) : isWanda ? (
              <ScarletWitchIcon className="w-full h-full" />
            ) : (
              <DoomIcon className="w-full h-full" />
            )}
          </div>
        ) : (
          /* Default crosshair cursor */
          <div className="w-8 h-8 border-2 rounded-full border-zinc-400 mix-blend-difference">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-px h-3 bg-zinc-400"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-px bg-zinc-400"></div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Trailing dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9998]"
        animate={{
          x: position.x - 2,
          y: position.y - 2,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
          mass: 0.3,
        }}
      >
        <div
          className={`w-1 h-1 rounded-full ${
            isHovering ? (isDanger ? "bg-red-500" : isWatcher ? "bg-yellow-500" : isCaptain ? "bg-blue-500" : isWanda ? "bg-red-500" : "bg-[#00ff41]") : "bg-zinc-600"
          }`}
        ></div>
      </motion.div>
    </>
  );
}
