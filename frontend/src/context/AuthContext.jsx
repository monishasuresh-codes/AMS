import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("ams_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("ams_token"));

  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getMe();
        setUser(data.user);
        localStorage.setItem("ams_user", JSON.stringify(data.user));
      } catch (err) {
        console.warn("Session verification failed:", err.message);
        setUser(null);
        setToken(null);
        localStorage.removeItem("ams_token");
        localStorage.removeItem("ams_user");
      } finally {
        setLoading(false);
      }
    }

    verifySession();

    const handleAuthChange = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener("ams-auth-change", handleAuthChange);
    return () => window.removeEventListener("ams-auth-change", handleAuthChange);
  }, [token]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("ams_token", data.token);
    localStorage.setItem("ams_user", JSON.stringify(data.user));
    return data.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem("ams_token");
      localStorage.removeItem("ams_user");
    }
  };

  const hasPermission = (permissionName) => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    return user.permissions?.includes(permissionName) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "ADMIN",
        isEmployee: user?.role === "EMPLOYEE",
        hasPermission,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
