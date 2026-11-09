import { promisify } from "node:util";
import {
  randomBytes,
  scrypt as callbackScrypt,
  timingSafeEqual,
} from "node:crypto";

const scrypt = promisify(callbackScrypt);
const KEY_LENGTH = 64;

// Hash a password with a new random salt.
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

// Verify password against a stored scrypt salt and derived key.
export async function verifyPassword(password, storedValue) {
  const [algorithm, salt, storedHash] = String(storedValue).split("$");
  if (algorithm !== "scrypt" || !salt || !storedHash) return false;

  const storedBuffer = Buffer.from(storedHash, "hex");
  const derivedKey = await scrypt(password, salt, storedBuffer.length);
  const derivedBuffer = Buffer.from(derivedKey);

  return (
    storedBuffer.length === derivedBuffer.length &&
    timingSafeEqual(storedBuffer, derivedBuffer)
  );
}
