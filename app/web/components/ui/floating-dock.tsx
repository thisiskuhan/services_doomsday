"use client";

import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { useRef, useState } from "react";

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void; variant?: "default" | "danger" | "watcher" }[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void; variant?: "default" | "danger" | "watcher" }[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: {
                    delay: idx * 0.05,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                {item.onClick ? (
                  <button
                    onClick={item.onClick}
                    data-variant={item.variant}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border transition-colors group",
                      item.variant === "danger"
                        ? "border-zinc-800 hover:border-red-500/50"
                        : item.variant === "watcher"
                        ? "border-zinc-800 hover:border-yellow-500/50"
                        : "border-zinc-800 hover:border-emerald-500/50"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 text-zinc-500 transition-colors",
                      item.variant === "danger" ? "group-hover:text-red-400" : item.variant === "watcher" ? "group-hover:text-yellow-400" : "group-hover:text-emerald-400"
                    )}>{item.icon}</div>
                  </button>
                ) : (
                  <a
                    href={item.href}
                    data-variant={item.variant}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border transition-colors group",
                      item.variant === "danger"
                        ? "border-zinc-800 hover:border-red-500/50"
                        : item.variant === "watcher"
                        ? "border-zinc-800 hover:border-yellow-500/50"
                        : "border-zinc-800 hover:border-emerald-500/50"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 text-zinc-500 transition-colors",
                      item.variant === "danger" ? "group-hover:text-red-400" : item.variant === "watcher" ? "group-hover:text-yellow-400" : "group-hover:text-emerald-400"
                    )}>{item.icon}</div>
                  </a>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 transition-colors"
      >
        <IconLayoutNavbarCollapse className="h-5 w-5 text-emerald-400" />
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void; variant?: "default" | "danger" | "watcher" }[];
  className?: string;
}) => {
  const mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden h-16 items-end gap-4 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 px-4 pb-3 md:flex shadow-lg shadow-black/20",
        className,
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
  variant = "default",
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href: string;
  onClick?: () => void;
  variant?: "default" | "danger" | "watcher";
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  const heightTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [20, 40, 20],
  );

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  const content = (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 border transition-colors group",
        variant === "danger"
          ? "border-zinc-700/50 hover:border-red-500/50"
          : variant === "watcher"
          ? "border-zinc-700/50 hover:border-yellow-500/50"
          : "border-zinc-700/50 hover:border-emerald-500/30"
      )}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className={cn(
              "absolute -top-8 left-1/2 w-fit rounded-md border bg-zinc-900 px-2 py-0.5 text-xs whitespace-pre shadow-lg",
              variant === "danger"
                ? "border-red-500/30 text-red-400"
                : variant === "watcher"
                ? "border-yellow-500/30 text-yellow-400"
                : "border-emerald-500/30 text-emerald-400"
            )}
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{ width: widthIcon, height: heightIcon }}
        className={cn(
          "flex items-center justify-center transition-colors text-zinc-500",
          variant === "danger"
            ? "group-hover:text-red-400"
            : variant === "watcher"
            ? "group-hover:text-yellow-400"
            : "group-hover:text-emerald-400"
        )}
      >
        {icon}
      </motion.div>
    </motion.div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="cursor-hover" data-variant={variant}>
        {content}
      </button>
    );
  }

  return (
    <a href={href} className="cursor-hover" data-variant={variant}>
      {content}
    </a>
  );
}
