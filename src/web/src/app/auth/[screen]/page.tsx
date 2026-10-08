import { notFound } from "next/navigation";
import { linkIsValid } from "../../../lib/auth/accounts";
import { authConfigured, googleConfigured } from "../../../lib/auth/server";
import AuthScreen, { type Screen } from "../AuthScreen";

const screens: Screen[] = [
  "sign-in",
  "sign-up",
  "forgot-password",
  "reset-password",
  "verify-email",
];

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { screen } = await params;
  const selected = screens.find((value) => value === screen);
  if (!selected) notFound();
  const query = await searchParams;
  const value = (key: string) =>
    typeof query[key] === "string" ? query[key] : "";
  let expired = selected === "reset-password" && !value("token");
  let unavailable = false;
  if (
    authConfigured() &&
    value("token") &&
    (selected === "reset-password" || selected === "verify-email")
  ) {
    try {
      expired = !(await linkIsValid(
        value("token"),
        selected === "reset-password" ? "reset" : "verification",
      ));
    } catch {
      unavailable = true;
    }
  }
  return (
    <AuthScreen
      screen={selected}
      token={value("token")}
      email={value("email")}
      providerError={Boolean(value("error"))}
      configured={authConfigured()}
      // Keep incomplete password/email flows disabled until routes and delivery are connected.
      emailFlowsReady={false}
      google={googleConfigured()}
      initialExpired={expired}
      unavailable={unavailable}
    />
  );
}
