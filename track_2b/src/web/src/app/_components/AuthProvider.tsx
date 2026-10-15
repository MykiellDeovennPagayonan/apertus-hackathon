"use client";

import { SessionContext, SessionProvider, useSession } from "next-auth/react";
import { Fragment, type ReactNode } from "react";
import LoadingState from "./LoadingState";

function AccountBoundary({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  if (status === "loading") return <LoadingState />;
  // Account changes dispose the old workspace and its in-memory save revisions.
  return <Fragment key={data?.user.id ?? "guest"}>{children}</Fragment>;
}

export default function AuthProvider({
  children,
  accountFeaturesEnabled = true,
}: {
  children: ReactNode;
  accountFeaturesEnabled?: boolean;
}) {
  if (!accountFeaturesEnabled)
    return (
      <SessionContext.Provider
        value={{
          data: null,
          status: "unauthenticated",
          update: async () => null,
        }}
      >
        {children}
      </SessionContext.Provider>
    );
  return (
    <SessionProvider>
      <AccountBoundary>{children}</AccountBoundary>
    </SessionProvider>
  );
}
