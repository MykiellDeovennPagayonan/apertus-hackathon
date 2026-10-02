import type { Metadata } from "next";
import "./globals.css";
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
      <body>{children}</body>
    </html>
  );
}
