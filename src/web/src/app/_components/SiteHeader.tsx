"use client";

import Link from "next/link";
import AccountControl from "./AccountControl";
import { useOffline } from "./DeploymentProvider";
import "./SiteHeader.css";

export default function SiteHeader({
  active,
}: {
  active: "home" | "experiments" | "community" | "projects";
}) {
  const offline = useOffline();
  return (
    <header className="site-header">
      <Link href="/" className="site-header__brand" aria-label="Apertus home">
        <span aria-hidden="true">✳</span> apertus
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/" aria-current={active === "home" ? "page" : undefined}>
          Home
        </Link>
        <Link
          href="/experiments"
          aria-current={active === "experiments" ? "page" : undefined}
        >
          Experiments
        </Link>
        {!offline && (
          <Link
            href="/community"
            aria-current={active === "community" ? "page" : undefined}
          >
            Community
          </Link>
        )}
        <Link
          href="/projects"
          aria-current={active === "projects" ? "page" : undefined}
        >
          My projects
        </Link>
      </nav>
      <div className="site-header__account">
        <AccountControl />
      </div>
    </header>
  );
}
