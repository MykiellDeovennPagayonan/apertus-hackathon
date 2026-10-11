"use client";

import { SessionContext, SessionProvider, useSession } from "next-auth/react";
import { Fragment, type ReactNode } from "react";

function AccountBoundary({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  if (status === "loading") return <output>Opening your lab…</output>;
  // Account changes dispose the old workspace and its in-memory save revisions.
  return <Fragment key={data?.user.id ?? "guest"}>{children}</Fragment>;
}

export default function AuthProvider({
  children,
  offline = false,
}: {
  children: ReactNode;
  offline?: boolean;
}) {
  if (offline)
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
