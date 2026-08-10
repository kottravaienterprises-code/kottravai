import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
interface GuestProfile {
  id: string;
  phone: string;
  is_guest: boolean;
}

interface GuestAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: GuestProfile | null;
  refreshProfile: () => Promise<void>;
  logoutGuest: () => Promise<void>;
}

const GuestAuthContext = createContext<GuestAuthContextType | undefined>(undefined);

export const GuestAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<GuestProfile | null>(null);

  const refreshProfile = async () => {
    console.log(`[${new Date().toISOString()}] GuestAuthContext: refreshProfile() called`);
    try {
      const response = await axios.get(`${API_ENDPOINTS.auth}/guest-profile`, { withCredentials: true });
      if (response.data.isAuthenticated) {
        setProfile(response.data.user);
        console.log(`[${new Date().toISOString()}] GuestAuthContext: setting isAuthenticated to TRUE`);
        setIsAuthenticated(true);
      } else {
        console.log(`[${new Date().toISOString()}] GuestAuthContext: setting isAuthenticated to FALSE`);
        setIsAuthenticated(false);
        setProfile(null);
      }
    } catch (err) {
      console.log(`[${new Date().toISOString()}] GuestAuthContext: setting isAuthenticated to FALSE (catch)`);
      setIsAuthenticated(false);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log(`[${new Date().toISOString()}] GuestAuthContext: Mounted, running initial refreshProfile()`);
    refreshProfile();
  }, []);

  console.log(`[${new Date().toISOString()}] GuestAuthContext Rendered: isAuthenticated=${isAuthenticated}`);


  const logoutGuest = async () => {
    try {
      await axios.post(`${API_ENDPOINTS.auth}/guest-logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error("Guest logout failed", err);
    }
    setIsAuthenticated(false);
    setProfile(null);
  };

  return (
    <GuestAuthContext.Provider value={{ isAuthenticated, isLoading, profile, refreshProfile, logoutGuest }}>
      {children}
    </GuestAuthContext.Provider>
  );
};

export const useGuestAuth = () => {
  const context = useContext(GuestAuthContext);
  if (!context) throw new Error('useGuestAuth must be used within GuestAuthProvider');
  return context;
};
