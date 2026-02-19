import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { adminLogin, adminLogout, getAdminUser, isAdminAuthenticated } from '../lib/admin';

interface AdminUser {
  $id: string;
  email: string;
  name: string;
}

interface AdminContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const authed = await isAdminAuthenticated();
      if (authed) {
        const adminUser = await getAdminUser();
        if (adminUser) {
          setUser(adminUser);
          setIsAuthenticated(true);
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    const success = await adminLogin(email, password);
    if (success) {
      const adminUser = await getAdminUser();
      if (adminUser) {
        setUser(adminUser);
        setIsAuthenticated(true);
      }
    }
    setLoading(false);
    return success;
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AdminContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}