import type { Metadata } from "next";
import "./globals.css";
import "./community/community.css";
import AuthProvider from "./_components/AuthProvider";
export const metadata: Metadata = {
  title: "Apertus Local Lab",
  description:
    "Interactive physics, structures, and a living town in a local-first simulation lab.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
