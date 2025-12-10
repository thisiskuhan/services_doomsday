"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Dr. Doom Icon Component with CSS transition support
const DoomIcon = ({ className, color = "#10b981" }: { className?: string; color?: string }) => {
  const secondaryColor = color === "#a1a1aa" ? "#d4d4d8" : "#00ff41";
  return (
    <svg viewBox="0 0 1024 1024" className={className} xmlns="http://www.w3.org/2000/svg" style={{ transition: "all 0.3s ease-in-out" }}>
      <path style={{ transition: "fill 0.3s ease-in-out" }} d="M522.256856 836.991272c-70.478119 0-140.956238 0.38165-211.434357-0.127216-57.788241-0.413455-101.64624-31.676989-118.120819-82.849955-3.562071-11.099668-5.756561-22.358356-5.756561-34.125913 0.127217-135.644936-0.095413-271.321676 0.159021-406.966611 0.127217-70.732553 61.413921-133.227816 131.955648-133.545859 134.595397-0.572476 269.190794-0.572476 403.786191-0.031804 71.941113 0.318042 132.019256 62.399851 132.019257 134.69081 0.031804 133.545858-1.303972 267.091717 0.636084 400.60577 0.826909 55.81638-41.250054 119.106749-114.145293 121.333044-36.447619 1.113147-72.958847 1.017735-109.406466 1.20856-36.574836 0.190825-73.117868 0.031804-109.692705 0.031804v-0.22263z" fill={color} />
      <path style={{ transition: "fill 0.3s ease-in-out" }} d="M836.386993 505.87769c-213.533435-173.587353-447.326148-162.869336-628.38749 8.714353-3.752896-4.070938-1.781036-9.032394-1.81284-13.389571-0.159021-61.986396-0.190825-124.004597-0.095412-185.990993 0.095413-64.180886 51.4274-117.230301 115.290244-117.516538 131.923844-0.572476 263.879492-0.731497 395.803336-0.159022 68.697084 0.286238 118.725099 51.395596 119.106749 120.156288 0.349846 61.954592 0.095413 123.909184 0.095413 188.185483z" fill={secondaryColor} />
      <path d="M304.588875 516.468491c7.028729 10.495388 18.446439 10.972451 29.323477 13.071528 33.617045 6.519862 67.138678 13.453179 100.755723 19.877629 16.41097 3.116812 25.347952-4.198155 25.825014-20.768146 0.318042-11.640339 0.445259-23.312483-0.063608-34.921018-0.38165-8.269093 2.735162-10.113737 10.272758-8.110072 10.177346 2.735162 20.4183 5.533932 30.818275 7.124142 12.721682 1.940057 12.848899 10.081933 8.587136 18.223809-14.057459 26.747337-21.436034 56.03901-33.076374 83.64506-4.548001 10.781626-2.130882 19.559586 7.092338 26.588316 0.826909 0.636084 1.81284 1.144951 2.576141 1.844644 40.423145 36.543032 33.362611 29.291673 73.785756-4.039134 7.283163-6.010995 9.286828-13.484983 5.502128-22.676398-11.672143-28.178526-19.400565-57.883654-33.553437-85.139858-4.039134-7.79203-5.247694-16.124732 8.110072-18.00118 12.976116-1.81284 29.482498-11.354101 37.560767-6.360842 9.127807 5.629344 2.671553 24.171196 3.148616 37.0519 0.795105 21.817685 8.428114 28.878218 29.514303 24.934497 35.23906-6.615275 70.414511-13.421375 105.558157-20.513713 19.527782-3.943721 23.21707-9.096003 23.471504-29.228064 0.095413-6.869708 0.540671-13.707613 0.826909-20.577321 6.583471-2.003665 10.908842 2.703357 15.615865 5.661148 18.700873 11.767556 35.970556 25.538777 53.780911 38.546697 16.220145 11.831164 21.467839 26.047644 16.379166 44.875734-2.576141 11.290493-10.272758 17.905768-20.100258 22.899028-16.02932 8.110072-32.090443 16.188341-47.833525 24.80728-20.768146 11.354101-31.61338 28.719197-31.358946 52.922198 0.318042 30.722862 0.222629 61.445725 0.031804 92.136783-0.222629 34.952822-21.372426 56.516073-56.134422 57.311178-14.280088 0.318042-28.623785-0.477063-42.872069 0.254433-9.859304 0.508867-12.880703-2.957791-12.499053-12.626269 0.731497-18.510048 1.017735-37.083703 0.349846-55.561947-0.98593-27.288008-13.866634-39.437215-40.772991-39.500823-36.543032-0.095413-73.086064-0.127217-109.629096 0.031804-23.407895 0.095413-35.525297 10.431779-38.355871 33.394416-2.480728 20.004845-1.844644 40.168711-0.286238 60.237165 0.763301 9.763891-1.59021 14.757151-12.817095 14.057458-14.248284-0.858714-28.591981 0.063608-42.872069-0.286237-33.903283-0.826909-55.243905-22.00851-55.784576-56.070814-0.508867-30.182191-0.667888-60.396186 0.031804-90.546573 0.636084-27.60605-11.79936-46.306923-35.811535-58.392521-14.661739-7.378576-29.196261-14.947977-43.794391-22.421965-15.902103-8.110072-23.916762-20.354691-20.259279-38.705718 15.234214-25.157126 40.8366-39.214585 62.177222-57.820045 4.738827-4.134547 9.795695-8.046464 15.520452-10.940647 6.138212-3.085008 9.763891-2.671553 9.922912 5.661149 0.095413 9.318632-1.908252 18.859894 1.335777 28.051309z" fill="#d4d4d8" />
      <path d="M661.59108 473.151163c10.845234 1.685623 18.032984 7.283163 18.351026 19.336957 0.286238 11.163276-8.841569 20.736342-19.718607 19.782216-11.226884-1.017735-18.382831-6.8061-18.510047-19.177936-0.127217-13.294158 7.537597-18.60546 19.877628-19.941237z" fill="#fafafa" />
      <path d="M388.64739 512.111315c-13.325962-0.159021-23.21707-9.922912-21.913098-20.322888 1.367581-11.131472 7.505792-18.128397 19.718607-18.032984 11.672143 0.095413 20.036649 8.523527 19.114328 19.973041-0.954126 11.735752-7.951051 17.587726-16.919837 18.382831z" fill="#fafafa" />
    </svg>
  );
};

// Iron Man Icon Component for Logout
const IronManIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Helmet outer (red) */}
    <path d="M256 48c-88.4 0-160 71.6-160 160v96c0 88.4 71.6 160 160 160s160-71.6 160-160v-96c0-88.4-71.6-160-160-160z" fill="#b91c1c"/>
    {/* Ear pieces */}
    <rect x="72" y="180" width="28" height="80" rx="8" fill="#991b1b"/>
    <rect x="412" y="180" width="28" height="80" rx="8" fill="#991b1b"/>
    {/* Face plate (gold) */}
    <path d="M256 80c-72 0-128 56-128 128v80c0 72 56 128 128 128s128-56 128-128v-80c0-72-56-128-128-128z" fill="#eab308"/>
    {/* Forehead red sections */}
    <path d="M160 140c0-32 20-60 48-80l-24 100z" fill="#b91c1c"/>
    <path d="M352 140c0-32-20-60-48-80l24 100z" fill="#b91c1c"/>
    {/* Center forehead line */}
    <path d="M256 60v100" stroke="#b91c1c" strokeWidth="8" fill="none"/>
    {/* Eyes (light blue) */}
    <path d="M152 220l56 16v24l-56 16z" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="2"/>
    <path d="M360 220l-56 16v24l56 16z" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="2"/>
    {/* Mouth area */}
    <path d="M200 340c0 0 28 40 56 40s56-40 56-40v-20c0 0-28 20-56 20s-56-20-56-20z" fill="#b91c1c"/>
    {/* Chin */}
    <ellipse cx="256" cy="380" rx="40" ry="24" fill="#eab308"/>
  </svg>
);

// Loki Icon Component for Watchers (yellowish/gold)
// Loki Icon Component for Watchers (yellowish/gold) - exported for reuse
export const LokiIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Helmet base (gold) */}
    <path d="M256 80c-80 0-144 64-144 144v120c0 40 32 72 72 72h144c40 0 72-32 72-72V224c0-80-64-144-144-144z" fill="#eab308"/>
    {/* Left horn */}
    <path d="M112 200c-8-4-16 0-16 8v0c0 4 2 8 4 12l48 80c4 8 16 8 20 0l12-24c4-8 0-16-8-20l-60-56z" fill="#eab308" stroke="#334155" strokeWidth="4"/>
    <path d="M96 208c-20-60 20-140 40-160c4-4 8 0 8 4l-8 100c0 8-4 16-12 20l-28 36z" fill="#eab308" stroke="#334155" strokeWidth="4"/>
    {/* Right horn */}
    <path d="M400 200c8-4 16 0 16 8v0c0 4-2 8-4 12l-48 80c-4 8-16 8-20 0l-12-24c-4-8 0-16 8-20l60-56z" fill="#eab308" stroke="#334155" strokeWidth="4"/>
    <path d="M416 208c20-60-20-140-40-160c-4-4-8 0-8 4l8 100c0 8 4 16 12 20l28 36z" fill="#eab308" stroke="#334155" strokeWidth="4"/>
    {/* Helmet crown detail */}
    <path d="M168 180h176" stroke="#334155" strokeWidth="6" strokeLinecap="round"/>
    <path d="M184 156l72-36l72 36" stroke="#334155" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    {/* V shape on forehead */}
    <path d="M208 200l48 40l48-40" stroke="#334155" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Face (skin tone) */}
    <ellipse cx="256" cy="320" rx="88" ry="96" fill="#fce7d6"/>
    {/* Eyes */}
    <circle cx="220" cy="300" r="12" fill="#1e293b"/>
    <circle cx="292" cy="300" r="12" fill="#1e293b"/>
    <circle cx="222" cy="298" r="4" fill="#fafafa"/>
    <circle cx="294" cy="298" r="4" fill="#fafafa"/>
    {/* Eyebrows */}
    <path d="M200 276l32-8" stroke="#334155" strokeWidth="4" strokeLinecap="round"/>
    <path d="M312 276l-32-8" stroke="#334155" strokeWidth="4" strokeLinecap="round"/>
    {/* Mouth (slight smirk) */}
    <path d="M232 360c12 12 36 12 48 0" stroke="#334155" strokeWidth="4" fill="none" strokeLinecap="round"/>
  </svg>
);

export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDanger, setIsDanger] = useState(false);
  const [isNeutral, setIsNeutral] = useState(false);
  const [isWatcher, setIsWatcher] = useState(false);
  const [neutralToGreen, setNeutralToGreen] = useState(false);

  // Timer to transition neutral (grey) to green after 0.5 second
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isNeutral && isHovering) {
      timer = setTimeout(() => {
        setNeutralToGreen(true);
      }, 500);
    } else {
      setNeutralToGreen(false);
    }
    return () => clearTimeout(timer);
  }, [isNeutral, isHovering]);

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
      const hoverableElement = target.closest("button") || target.closest("a");
      
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.classList.contains("cursor-hover") ||
        hoverableElement
      ) {
        setIsHovering(true);
        // Check if it's a danger, neutral, or watcher variant
        const variantElement = hoverableElement || target;
        const variant = variantElement.getAttribute("data-variant");
        setIsDanger(variant === "danger");
        setIsNeutral(variant === "neutral");
        setIsWatcher(variant === "watcher");
      } else {
        setIsHovering(false);
        setIsDanger(false);
        setIsNeutral(false);
        setIsWatcher(false);
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
          /* Icon when hovering - Iron Man for logout, Loki for watchers, Dr. Doom for others */
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{ transition: "filter 0.3s ease-in-out" }}
            className={`w-[60px] h-[60px] ${isDanger ? "drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" : isWatcher ? "drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]" : (isNeutral && !neutralToGreen) ? "drop-shadow-[0_0_10px_rgba(161,161,170,0.6)]" : "drop-shadow-[0_0_10px_rgba(0,255,65,0.6)]"}`}
          >
            {isDanger ? (
              <IronManIcon className="w-full h-full" />
            ) : isWatcher ? (
              <LokiIcon className="w-full h-full" />
            ) : (
              <DoomIcon className="w-full h-full" color={(isNeutral && !neutralToGreen) ? "#a1a1aa" : "#10b981"} />
            )}
          </motion.div>
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
          stiffness: 150,
          damping: 15,
          mass: 0.1,
        }}
      >
        <div
          className={`w-1 h-1 rounded-full transition-colors duration-200 ${
            isHovering ? (isDanger ? "bg-red-500" : isWatcher ? "bg-yellow-500" : isNeutral ? "bg-zinc-400" : "bg-[#00ff41]") : "bg-zinc-600"
          }`}
        ></div>
      </motion.div>
    </>
  );
}
