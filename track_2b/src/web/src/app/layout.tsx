import type { Metadata } from "next";
import "./globals.css";
import "./community/community.css";
import { connection } from "next/server";
import { accountFeaturesEnabled } from "../lib/deployment";
import AuthProvider from "./_components/AuthProvider";
import DeploymentProvider from "./_components/DeploymentProvider";
export const metadata: Metadata = {
  title: "pAperSim",
  description:
    "Interactive physics, structures, and a living town in a local-first simulation lab.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const accountsEnabled = accountFeaturesEnabled();
  return (
    <html lang="en">
      <body>
        <DeploymentProvider accountFeaturesEnabled={accountsEnabled}>
          <AuthProvider accountFeaturesEnabled={accountsEnabled}>
            {children}
          </AuthProvider>
        </DeploymentProvider>
      </body>
    </html>
  );
}
