import crypto from "node:crypto";

type EncryptedPayload = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

function keyFromSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error("BETTER_AUTH_SECRET must be set for encryption.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptJson(value: Record<string, unknown>): EncryptedPayload {
  const key = keyFromSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(value);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const candidate = value as Partial<EncryptedPayload>;
  if (
    candidate.alg !== "aes-256-gcm" ||
    typeof candidate.iv !== "string" ||
    typeof candidate.tag !== "string" ||
    typeof candidate.data !== "string"
  ) {
    return {};
  }
  const key = keyFromSecret();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(candidate.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(candidate.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(candidate.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const parsed = JSON.parse(decrypted);
  return parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>)
    : {};
}
