import type { Metadata } from "next";
import type { ReactNode } from "react";
import PhysicsBackground from "./PhysicsBackground";

export const metadata: Metadata = {
  title: "Your account · Apertus Local Lab",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-scene">
      {children}
      <PhysicsBackground />
    </div>
  );
}
