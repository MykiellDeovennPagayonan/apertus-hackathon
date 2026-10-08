import { createHash } from "node:crypto";
import type { Db, ObjectId } from "mongodb";
import { getDatabase } from "../database/client";
import { checkPassword } from "./password";

export interface LabUser {
  _id: ObjectId;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  passwordHash?: string;
  sessionVersion?: number;
}

export function emailAddress(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

export async function linkIsValid(
  token: string,
  purpose: "reset" | "verification",
) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const { db } = await getDatabase();
  const hash = createHash("sha256").update(token).digest("hex");
  return Boolean(
    await db.collection("users").findOne(
      {
        [`${purpose}.hash`]: hash,
        [`${purpose}.expires`]: { $gt: new Date() },
      },
      { projection: { _id: 1 } },
    ),
  );
}

export async function rateLimit(
  db: Db,
  identity: string,
  limit: number,
  seconds: number,
) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = createHash("sha256")
    .update(`${identity}:${bucket}`)
    .digest("hex");
  const record = await db
    .collection<{ _id: string; count: number; expires: Date }>("authLimits")
    .findOneAndUpdate(
      { _id: key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expires: new Date((bucket + 2) * seconds * 1000) },
      },
      { upsert: true, returnDocument: "after" },
    );
  return Boolean(record && record.count <= limit);
}

export async function authorizePassword(
  emailInput: unknown,
  password: unknown,
) {
  const email = emailAddress(emailInput);
  if (
    !email ||
    typeof password !== "string" ||
    !password ||
    password.length > 128
  )
    return null;
  const { db } = await getDatabase();
  if (!(await rateLimit(db, `login:${email}`, 10, 900))) return null;
  const user = await db.collection<LabUser>("users").findOne({ email });
  const matched = await checkPassword(password, user?.passwordHash);
  if (!matched || !user?.emailVerified) return null;
  return {
    id: user._id.toHexString(),
    email: user.email,
    name: user.name,
    image: user.image,
    sessionVersion: user.sessionVersion ?? 0,
  };
}
