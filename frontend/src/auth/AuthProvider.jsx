import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const KEY = "padharo_auth";

function loadUser() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  useEffect(() => {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  }, [user]);

  // role: "guest" | "host". Identity is email or phone.
  const login = ({ email, phone, name, role, is_admin }) =>
    setUser({
      email: email || null,
      phone: phone || null,
      name: name || (email ? email.split("@")[0] : phone) || "Guest",
      role: role || "guest",
      is_admin: !!is_admin,
    });
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
