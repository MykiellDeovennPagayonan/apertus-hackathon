"use client";

import { createContext, type ReactNode, useContext } from "react";

const AccountFeaturesContext = createContext(true);
export const useAccountFeaturesEnabled = () =>
  useContext(AccountFeaturesContext);

export default function DeploymentProvider({
  accountFeaturesEnabled,
  children,
}: {
  accountFeaturesEnabled: boolean;
  children: ReactNode;
}) {
  return (
    <AccountFeaturesContext.Provider value={accountFeaturesEnabled}>
      {children}
    </AccountFeaturesContext.Provider>
  );
}
