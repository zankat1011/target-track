import React, { createContext, useContext, useState, useEffect } from "react";
import { SESSION_KEY } from "../utils/constants";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  const login = (role, mobile) => {
    setIsDemoMode(false);
    setSession({ role, mobile });
  };

  const logout = () => {
    setIsDemoMode(false);
    setSession(null);
  };

  const startDemo = () => {
    setIsDemoMode(true);
  };

  const exitDemo = () => {
    setIsDemoMode(false);
  };

  return (
    <AuthContext.Provider value={{ session, isDemoMode, login, logout, startDemo, exitDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
