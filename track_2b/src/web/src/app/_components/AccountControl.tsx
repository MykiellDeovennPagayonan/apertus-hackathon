"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useAccountFeaturesEnabled } from "./DeploymentProvider";

export default function AccountControl() {
  const { data } = useSession();
  const accountsDisabled = !useAccountFeaturesEnabled();
  return (
    <>
      {accountsDisabled ? (
        <span>Saved in this browser</span>
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
