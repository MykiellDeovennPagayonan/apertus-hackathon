"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useOffline } from "./DeploymentProvider";

export default function AccountControl({
  navigation = true,
}: {
  navigation?: boolean;
}) {
  const { data } = useSession();
  const offline = useOffline();
  return (
    <>
      {navigation && (
        <>
          {!offline && <Link href="/community">Community</Link>}{" "}
          <Link href="/projects">My projects</Link>{" "}
        </>
      )}
      {offline ? (
        <span>Saved on this device</span>
      ) : data?.user.id ? (
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      ) : (
        <Link href="/auth/sign-in">Sign in</Link>
      )}
    </>
  );
}
