"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AccountControl() {
  const { data } = useSession();
  return data?.user.id ? (
    <button type="button" onClick={() => void signOut({ callbackUrl: "/" })}>
      Sign out
    </button>
  ) : (
    <Link href="/auth/sign-in">Sign in</Link>
  );
}
