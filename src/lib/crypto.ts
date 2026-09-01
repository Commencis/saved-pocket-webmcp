import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getDerivedKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHash("sha256").update(secret).digest();
}

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
// prefix so we can detect already-encrypted values and skip double-encryption
const MAGIC = "enc:";

export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ciphered = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return MAGIC + Buffer.concat([iv, tag, ciphered]).toString("base64");
}

export function decrypt(encoded: string): string {
  if (!encoded.startsWith(MAGIC)) {
    // Not encrypted (legacy plaintext row or server env key) — return as-is
    return encoded;
  }
  const key = getDerivedKey();
  const buf = Buffer.from(encoded.slice(MAGIC.length), "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphered = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphered).toString("utf8") + decipher.final("utf8");
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(MAGIC);
}
