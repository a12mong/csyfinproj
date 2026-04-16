"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "@csyfinproj/shared";
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from "@/lib/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token) {
      setState({ user, token, isLoading: false });
    } else {
      setState({ user: null, token: null, isLoading: false });
    }
  }, []);

  function login(token: string, user: User) {
    setToken(token);
    setUser(user);
    setState({ user, token, isLoading: false });
  }

  function logout() {
    removeToken();
    removeUser();
    setState({ user: null, token: null, isLoading: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
