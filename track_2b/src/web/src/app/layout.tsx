import type { Metadata } from "next";
import "./globals.css";
import "./community/community.css";
import { connection } from "next/server";
import { accountFeaturesEnabled } from "../lib/deployment";
import AuthProvider from "./_components/AuthProvider";
import DeploymentProvider from "./_components/DeploymentProvider";
const description =
  "A browser-based educational simulation authoring framework using Apertus to assemble editable simulations from reusable components.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.papersim.app"),
  title: "pAperSim",
  description,
  openGraph: {
    type: "website",
    siteName: "pAperSim",
    title: "pAperSim",
    description,
  },
  twitter: {
    card: "summary_large_image",
  },
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
