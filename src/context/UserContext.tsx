import React, { createContext, useContext, useState, useEffect } from 'react';
import { account } from '../lib/appwrite';
import { OAuthProvider } from 'appwrite';
import type { User } from '../types';

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (provider: OAuthProvider) => Promise<void>;
  logout: () => Promise<void>;
  updateLanguage: (lang: 'en' | 'ha') => Promise<void>;
  toggleFollow: (speakerId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const session = await account.get();
      const prefs = await account.getPrefs();
      setUser({ ...session, prefs } as User);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (provider: OAuthProvider) => {
    try {
      account.createOAuth2Session(
        provider,
        window.location.origin + '/settings',
        window.location.origin + '/settings'
      );
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateLanguage = async (lang: 'en' | 'ha') => {
    if (!user) return;
    try {
      const newPrefs = { ...user.prefs, language: lang };
      await account.updatePrefs(newPrefs);
      setUser({ ...user, prefs: newPrefs });
    } catch (error) {
      console.error('Failed to update language preference:', error);
    }
  };

  const toggleFollow = async (speakerId: string) => {
    if (!user) return;
    try {
      const following = user.prefs?.following || [];
      const newFollowing = following.includes(speakerId)
        ? following.filter((id) => id !== speakerId)
        : [...following, speakerId];

      const newPrefs = { ...user.prefs, following: newFollowing };
      await account.updatePrefs(newPrefs);
      setUser({ ...user, prefs: newPrefs });
    } catch (error) {
      console.error('Failed to update following:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, updateLanguage, toggleFollow }}>
      {children}
    </UserContext.Provider>
  );
}
