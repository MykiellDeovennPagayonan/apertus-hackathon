import { createHash, randomBytes } from "node:crypto";
import { env } from "node:process";
import { MongoServerError, ObjectId } from "mongodb";
import { getDatabase } from "../database/client";
import { emailAddress, type LabUser, rateLimit } from "./accounts";
import { hashPassword } from "./password";

type Purpose = "verify" | "reset";
type Link = { hash: string; expires: Date };
interface AccountUser extends LabUser {
  verification?: Link;
  reset?: Link;
}
export type DeliverLink = (
  email: string,
  purpose: Purpose,
  url: string,
) => Promise<void>;
class AccountError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new AccountError("JSON content is required.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AccountError("A request body is required.", 400);
  let text = "";
  let size = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new AccountError("Request is too large.", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid body");
    return Object.fromEntries(Object.entries(body));
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError("Invalid JSON.", 400);
  } finally {
    reader.releaseLock();
  }
}

export async function handleAccountRequest(
  request: Request,
  action: string,
  deliver: DeliverLink,
) {
  const respond = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  try {
    const base = env.NEXTAUTH_URL;
    if (!base) throw new AccountError("Account services are unavailable.", 503);
    if (request.headers.get("origin") !== new URL(base).origin)
      throw new AccountError("Request origin is not allowed.", 403);
    if (!["register", "resend", "verify", "forgot", "reset"].includes(action))
      throw new AccountError("Unknown account action.", 404);
    const body = await readBody(request);
    const { db } = await getDatabase();
    const users = db.collection<AccountUser>("users");
    // Database-backed limits work across server instances. No client IP header is trusted.
    if (!(await rateLimit(db, "account:global", 300, 60)))
      throw new AccountError("Too many requests. Try again later.", 429);
    if (action === "verify" || action === "reset") {
      if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token))
        throw new AccountError("This link has expired or is invalid.", 410);
      const field = action === "verify" ? "verification" : "reset";
      if (
        action === "reset" &&
        (typeof body.password !== "string" ||
          body.password.length < 15 ||
          body.password.length > 128)
      )
        throw new AccountError(
          "Use a password between 15 and 128 characters.",
          400,
        );
      const filter = {
        [`${field}.hash`]: digest(body.token),
        [`${field}.expires`]: { $gt: new Date() },
      };
      const user =
        action === "verify"
          ? await users.findOneAndUpdate(
              filter,
              {
                $set: { emailVerified: new Date() },
                $unset: { verification: "" },
              },
              { returnDocument: "after" },
            )
          : await users.findOneAndUpdate(
              filter,
              {
                $set: {
                  passwordHash: await hashPassword(String(body.password)),
                },
                $inc: { sessionVersion: 1 },
                $unset: { reset: "" },
              },
              { returnDocument: "after" },
            );
      if (!user)
        throw new AccountError("This link has expired or is invalid.", 410);
      return respond({ ok: true });
    }
    const email = emailAddress(body.email);
    if (!email) throw new AccountError("Enter a valid email address.", 400);
    if (!(await rateLimit(db, `account:${email}`, 5, 900)))
      throw new AccountError("Too many requests. Try again later.", 429);
    const password = body.password;
    if (
      action === "register" &&
      (typeof password !== "string" ||
        password.length < 15 ||
        password.length > 128)
    )
      throw new AccountError(
        "Use a password between 15 and 128 characters.",
        400,
      );
    let user = await users.findOne({ email });
    if (action === "register") {
      // Never attach a password to an existing OAuth or unverified account.
      if (user) return respond({ ok: true });
      const account: AccountUser = {
        _id: new ObjectId(),
        email,
        emailVerified: null,
        passwordHash: await hashPassword(String(password)),
        sessionVersion: 0,
      };
      try {
        await users.insertOne(account);
        user = account;
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000)
          return respond({ ok: true });
        throw error;
      }
    }
    const purpose: Purpose = action === "forgot" ? "reset" : "verify";
    if (
      !user?.passwordHash ||
      (purpose === "verify" ? Boolean(user.emailVerified) : !user.emailVerified)
    )
      return respond({ ok: true });
    const token = randomBytes(32).toString("hex");
    const field = purpose === "verify" ? "verification" : "reset";
    const expires = new Date(
      Date.now() + (purpose === "verify" ? 24 * 60 : 30) * 60_000,
    );
    await users.updateOne(
      { _id: user._id },
      { $set: { [field]: { hash: digest(token), expires } } },
    );
    const url = new URL(
      `/auth/${purpose === "verify" ? "verify-email" : "reset-password"}`,
      base,
    );
    url.searchParams.set("token", token);
    try {
      await deliver(email, purpose, url.toString());
    } catch (error) {
      await users.updateOne(
        { _id: user._id, [`${field}.hash`]: digest(token) },
        { $unset: { [field]: "" } },
      );
      throw error;
    }
    return respond({ ok: true });
  } catch (error) {
    if (error instanceof AccountError)
      return respond({ error: error.message }, error.status);
    console.error(
      "Account request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return respond(
      { error: "Account services are unavailable. Please try again later." },
      503,
    );
  }
}
