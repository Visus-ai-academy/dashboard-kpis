import { randomBytes } from "crypto";

export function generateAccessCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}
