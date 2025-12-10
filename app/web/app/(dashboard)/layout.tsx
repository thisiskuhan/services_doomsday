"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Spotlight } from "@/components/ui/spotlight-new";
import { FloatingDock } from "@/components/ui/floating-dock";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { Home, Eye, LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const dockItems = [
    {
      title: "Home",
      icon: <Home className="w-full h-full" />,
      href: "/home",
    },
    {
      title: "Watchers",
      icon: <Eye className="w-full h-full" />,
      href: "/watchers",
      variant: "watcher" as const,
    },
    {
      title: "Logout",
      icon: <LogOut className="w-full h-full" />,
      href: "#",
      onClick: handleLogout,
      variant: "danger" as const,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] relative overflow-hidden cursor-none">
      {/* Custom Cursor */}
      <CustomCursor />

      {/* Spotlight Background - Same as login page */}
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
          backgroundSize: "50px 50px",
        }}
      />

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[128px] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen pb-24">
        {children}
      </div>

      {/* Floating Dock Navigation - Fixed at bottom */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock
          items={dockItems}
          desktopClassName="shadow-xl shadow-black/30"
          mobileClassName=""
        />
      </div>
    </div>
  );
}
