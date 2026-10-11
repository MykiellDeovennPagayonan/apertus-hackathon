import { env } from "node:process";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { ObjectId } from "mongodb";
import { type AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getDatabase } from "../database/client";
import { offlineEnabled } from "../deployment";
import { authorizePassword, type LabUser } from "./accounts";

export function googleConfigured() {
  if (offlineEnabled()) return false;
  return Boolean(
    env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function authConfigured() {
  if (offlineEnabled()) return false;
  return Boolean(
    env.MONGODB_URI?.trim() &&
      env.MONGODB_DB_NAME?.trim() &&
      env.NEXTAUTH_URL?.trim() &&
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
      CredentialsProvider({
        name: "Email and password",
        credentials: {
          email: { type: "email" },
          password: { type: "password" },
        },
        authorize(credentials) {
          return authorizePassword(credentials?.email, credentials?.password);
        },
      }),
      ...(googleConfigured()
        ? [
            GoogleProvider({
              clientId: env.GOOGLE_CLIENT_ID ?? "",
              clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
            }),
          ]
        : []),
    ],
    pages: { signIn: "/auth/sign-in", error: "/auth/sign-in" },
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.sub = user.id;
          const { db } = await getDatabase();
          const record = await db
            .collection<LabUser>("users")
            .findOne({ _id: new ObjectId(user.id) });
          token.sessionVersion =
            user.sessionVersion ?? record?.sessionVersion ?? 0;
        }
        return token;
      },
      async session({ session, token }) {
        session.user.id = "";
        if (token.sub && ObjectId.isValid(token.sub)) {
          const { db } = await getDatabase();
          const user = await db
            .collection<LabUser>("users")
            .findOne({ _id: new ObjectId(token.sub) });
          if (user && (user.sessionVersion ?? 0) === token.sessionVersion)
            session.user.id = token.sub;
        }
        return session;
      },
    },
  };
}

export async function getLibrarySession() {
  if (!authConfigured()) return null;
  return getServerSession(getAuthOptions());
}
