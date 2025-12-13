/**
 * Login Page
 *
 * Authentication page with GitHub OAuth sign-in.
 * Features:
 *   - Animated "DOOMSDAY" text background
 *   - Spotlight gradient effects
 *   - Custom Dr. Doom cursor
 *   - Initial loading animation (1.5s)
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { GithubAuthProvider, signInWithPopup } from "firebase/auth";
import { Spotlight } from "@/components/ui/spotlight-new";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { Github } from "lucide-react";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { DoomLoader } from "@/components/ui/DoomLoader";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const { setGithubToken } = useAuth();

  // Show DoomLoader for 1.5 seconds on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleGithubLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GithubAuthProvider();
      // Request scopes for repo access and webhook management
      provider.addScope("repo");              // Access private repos
      provider.addScope("admin:repo_hook");   // Create/manage webhooks for auto-rescan
      
      const result = await signInWithPopup(auth, provider);
      
      // Extract and store GitHub access token from OAuth credential
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGithubToken(credential.accessToken);
      }
      
      router.push("/home");
    } catch (err: unknown) {
      console.error("GitHub login error:", err);

      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string; message?: string };

        if (firebaseError.code === "auth/account-exists-with-different-credential") {
          setError("An account with this email already exists. Please sign in with your original provider.");
        } else if (firebaseError.code === "auth/popup-closed-by-user") {
          setError("Sign-in cancelled. Please try again.");
        } else if (firebaseError.code === "auth/operation-not-allowed") {
          setError("GitHub sign-in is not enabled. Please contact support.");
        } else {
          setError(firebaseError.message || "GitHub login failed.");
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : "GitHub login failed.";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show DoomLoader during initial 1.5s with full screen spotlight background
  if (showLoader) {
    return <DoomLoader fullScreen text="Doom is coming..." />;
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] relative overflow-hidden flex flex-col items-center justify-center antialiased cursor-none">
      {/* Custom Cursor with Dr. Doom */}
      <CustomCursor />

      {/* Spotlight Background - Avengers Doomsday Green/Grey Theme */}
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

      {/* Background Large Text - DOOMSDAY */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="w-full h-[50vh] md:h-[60vh] opacity-30">
          <TextHoverEffect text="DOOMSDAY" duration={0.2} />
        </div>
      </div>

      {/* Tagline - Centered exactly like DOOMSDAY */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
        <div className="text-center px-4 -mt-16 md:-mt-24">
          <TextGenerateEffect
            words="Hunt down zombie services draining your infrastructure."
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl !leading-[1.2] font-bold font-[family-name:var(--font-cinzel-decorative)]"
            textClassName="bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent"
            duration={0.2}
            filter={true}
          />
        </div>
      </div>

      {/* Main Content - Button and Footer */}
      <div className="relative z-20 flex flex-col items-center justify-end min-h-screen px-4 py-12 w-full mx-auto text-center">
        {/* Sign In Button - positioned in lower area */}
        <div className="flex flex-col items-center gap-4 mb-45">
            <HoverBorderGradient
              containerClassName="rounded-full"
              className="flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-[#0a0a0a] text-white font-medium text-sm md:text-base min-w-[180px] md:min-w-[220px]"
              duration={1.5}
              clockwise={true}
              onClick={handleGithubLogin}
              as="button"
              data-variant="neutral"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Github className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Sign in with GitHub</span>
                </>
              )}
            </HoverBorderGradient>

            {/* Error Message */}
            {error && (
              <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>

        {/* Footer - at very bottom */}
        <div className="text-center pb-4">
          <p className="text-zinc-600 text-xs md:text-sm">
            By signing in, you agree to join the hunt and eliminate the zombies
          </p>
          <p className="text-zinc-700 text-xs mt-2">
            © 2025 Services Doomsday - Kuhan Sundaram. All rights reserved.
          </p>
        </div>
      </div>

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[128px] pointer-events-none" />
    </div>
  );
}
