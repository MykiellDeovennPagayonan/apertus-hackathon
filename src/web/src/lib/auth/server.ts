import { env } from "node:process";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { type AuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDatabase } from "../database/client";

export function authConfigured() {
  return Boolean(
    env.MONGODB_URI?.trim() &&
      env.MONGODB_DB_NAME?.trim() &&
      env.NEXTAUTH_URL?.trim() &&
      env.GOOGLE_CLIENT_ID?.trim() &&
      env.GOOGLE_CLIENT_SECRET?.trim() &&
      env.NEXTAUTH_SECRET &&
      env.NEXTAUTH_SECRET.length >= 32,
  );
}

export function getAuthOptions(): AuthOptions {
  if (!authConfigured())
    throw new Error("Authentication configuration is missing.");
  return {
    secret: env.NEXTAUTH_SECRET,
    adapter: MongoDBAdapter(async () => (await getDatabase()).client, {
      databaseName: env.MONGODB_DB_NAME,
    }),
    providers: [
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      }),
    ],
    session: { strategy: "database" },
    callbacks: {
      session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
  };
}

export async function getLibrarySession() {
  if (!authConfigured()) return null;
  return getServerSession(getAuthOptions());
}
