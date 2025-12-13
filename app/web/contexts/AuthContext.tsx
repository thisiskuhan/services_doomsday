/**
 * Authentication Context Provider
 *
 * Manages Firebase authentication state across the application.
 * Provides current user, loading state, and GitHub OAuth token.
 *
 * The GitHub token is captured during OAuth login and stored in sessionStorage.
 * This enables automatic webhook setup and private repo access.
 *
 * Exports:
 *   - useAuth(): Hook to access auth context (user, loading, githubToken, setGithubToken)
 *   - AuthProvider: Context provider component wrapping the app
 *
 * Usage:
 *   const { user, loading, githubToken } = useAuth();
 */
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const GITHUB_TOKEN_KEY = "doomsday_github_token";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  githubToken: string | null;
  setGithubToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  githubToken: null,
  setGithubToken: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubTokenState] = useState<string | null>(null);

  // Load token from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = sessionStorage.getItem(GITHUB_TOKEN_KEY);
      if (storedToken) {
        setGithubTokenState(storedToken);
      }
    }
  }, []);

  // Setter that also persists to sessionStorage
  const setGithubToken = useCallback((token: string | null) => {
    setGithubTokenState(token);
    if (typeof window !== "undefined") {
      if (token) {
        sessionStorage.setItem(GITHUB_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(GITHUB_TOKEN_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Clear token on logout
      if (!currentUser) {
        setGithubToken(null);
      }
    });

    return () => unsubscribe();
  }, [setGithubToken]);

  return (
    <AuthContext.Provider value={{ user, loading, githubToken, setGithubToken }}>
      {children}
    </AuthContext.Provider>
  );
}
