"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useOffline } from "./DeploymentProvider";

export default function AccountControl() {
  const { data } = useSession();
  const offline = useOffline();
  return (
    <>
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
