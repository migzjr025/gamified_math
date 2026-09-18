import { createHash } from "crypto";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, storedPassword: string) {
  return hashPassword(password) === storedPassword || storedPassword === password;
}
