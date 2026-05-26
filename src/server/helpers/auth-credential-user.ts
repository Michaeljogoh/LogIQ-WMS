import { generateRandomString, hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";

export function generateTemporaryPassword(): string {
  return generateRandomString(14);
}

export function splitName(fullName: string): {
  firstName: string | null;
  lastName: string | null;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

export async function upsertCredentialAuthUser(params: {
  email: string;
  name: string;
  password: string;
}) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const hash = await hashPassword(params.password);

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      accounts: { where: { providerId: "credential" } },
    },
  });

  if (existing) {
    const credential = existing.accounts[0];
    if (credential) {
      await db.account.update({
        where: { id: credential.id },
        data: { password: hash },
      });
    } else {
      await db.account.create({
        data: {
          userId: existing.id,
          accountId: existing.id,
          providerId: "credential",
          password: hash,
        },
      });
    }
    return db.user.update({
      where: { id: existing.id },
      data: {
        name: params.name.trim(),
        emailVerified: true,
      },
    });
  }

  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name: params.name.trim(),
      emailVerified: true,
    },
  });

  await db.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hash,
    },
  });

  return user;
}
