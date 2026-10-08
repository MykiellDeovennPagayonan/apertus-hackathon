import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function checkPassword(password: string, encoded?: string) {
  const valid = /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(encoded ?? "");
  const parts = (valid ? encoded : undefined)?.split(":");
  // Missing users still pay the same password derivation cost.
  const key = await derive(
    password,
    parts?.[1] ?? "00000000000000000000000000000000",
  );
  const expected = Buffer.from(parts?.[2] ?? "00".repeat(64), "hex");
  return timingSafeEqual(key, expected) && valid;
}
