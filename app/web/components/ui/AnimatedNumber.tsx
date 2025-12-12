"use client";

import { useEffect, useRef, useState, memo } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}

/**
 * Smooth counting animation that animates from 0 on mount,
 * and animates between values on change.
 * Uses requestAnimationFrame for optimal performance.
 */
export const AnimatedCounter = memo(function AnimatedCounter({
  value,
  duration = 1200,
  delay = 0,
  className = "",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const prevValueRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Handle initial delay before starting animation
  useEffect(() => {
    if (delay > 0 && !hasStarted) {
      const timer = setTimeout(() => {
        setHasStarted(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setHasStarted(true);
    }
  }, [delay, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const startValue = prevValueRef.current ?? 0;
    const endValue = value;

    // Skip if same value and not first animation
    if (prevValueRef.current !== null && startValue === endValue) {
      return;
    }

    // If value is 0, just set it directly (no animation needed for 0→0)
    if (startValue === 0 && endValue === 0) {
      setDisplayValue(0);
      prevValueRef.current = 0;
      return;
    }

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
        startTimeRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration, hasStarted]);

  return <span className={`tabular-nums ${className}`}>{displayValue}</span>;
});
