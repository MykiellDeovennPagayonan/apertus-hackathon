"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AccountControl({
  navigation = true,
}: {
  navigation?: boolean;
}) {
  const { data } = useSession();
  return (
    <>
      {navigation && (
        <>
          <Link href="/community">Community</Link>{" "}
          <Link href="/projects">My projects</Link>{" "}
        </>
      )}
      {data?.user.id ? (
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
