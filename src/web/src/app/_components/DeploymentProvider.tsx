"use client";

import { createContext, type ReactNode, useContext } from "react";

const OfflineContext = createContext(false);
export const useOffline = () => useContext(OfflineContext);

export default function DeploymentProvider({
  offline,
  children,
}: {
  offline: boolean;
  children: ReactNode;
}) {
  return (
    <OfflineContext.Provider value={offline}>
      {children}
    </OfflineContext.Provider>
  );
}
