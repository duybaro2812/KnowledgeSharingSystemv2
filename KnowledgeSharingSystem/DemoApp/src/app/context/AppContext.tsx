import React, { createContext, useContext, useState } from 'react';
import { AppUser, currentUser as defaultUser, notifications as defaultNotifs } from '../data/mockData';

interface AppContextType {
  user: AppUser;
  setUser: (u: AppUser) => void;
  notifCount: number;
  markAllRead: () => void;
}

const AppContext = createContext<AppContextType>({
  user: defaultUser,
  setUser: () => {},
  notifCount: 3,
  markAllRead: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(defaultUser);
  const [notifCount, setNotifCount] = useState(
    defaultNotifs.filter(n => !n.isRead).length
  );

  const markAllRead = () => setNotifCount(0);

  return (
    <AppContext.Provider value={{ user, setUser, notifCount, markAllRead }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
