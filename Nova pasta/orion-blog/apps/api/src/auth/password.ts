/*Author: Erik Marques*/
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function deriveKey(password: string, salt: string, keyLength: number, options: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await deriveKey(password, salt, KEY_LENGTH, { N: 16_384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [, n, r, p, salt, expectedHex] = encoded.split("$");
  if (!n || !r || !p || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const derived = await deriveKey(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
