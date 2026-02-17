import argon2 from "argon2";

// Hash a password using Argon2id with sensible defaults.
export async function hashPassword(password: string) {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 1 << 16, // 65536 KiB = 64 MiB
    parallelism: 1,
  });
}

// Verify a candidate password against a stored hash.
export async function verifyPassword(hash: string, candidate: string) {
  try {
    return await argon2.verify(hash, candidate);
  } catch (err) {
    return false;
  }
}

// Example usage (in your route/server handlers):
//
// import { hashPassword, verifyPassword } from "~/lib/auth";
// import { prisma } from "~/lib/prisma"; // your prisma client
//
// // Sign up
// const hashed = await hashPassword(plaintextPassword);
// await prisma.account.create({ data: { email, passwordHash: hashed } });
//
// // Login
// const user = await prisma.account.findUnique({ where: { email } });
// const ok = user && await verifyPassword(user.passwordHash, candidatePassword);

export default { hashPassword, verifyPassword };
