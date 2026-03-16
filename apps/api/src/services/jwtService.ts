import jwt from 'jsonwebtoken'
import { pbkdf2Sync, randomBytes } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET ?? 'cfr-dev-secret-change-in-production'
const JWT_EXPIRY = '7d'
const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const KEY_BYTES = 32

export type JwtPayload = {
  userId: string
  tenantId: string
  email: string
  name: string
  role: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY, issuer: 'copilot-flight-recorder' })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'copilot-flight-recorder' }) as JwtPayload
    return payload
  } catch {
    return null
  }
}

export function hashPassword(password: string, salt?: Buffer): string {
  const actualSalt = salt ?? randomBytes(SALT_BYTES)
  const derived = pbkdf2Sync(password, actualSalt, PBKDF2_ITERATIONS, KEY_BYTES, 'sha256')
  return `${actualSalt.toString('hex')}:${derived.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.includes(':')) return false
  const [saltHex] = stored.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const result = hashPassword(password, salt)
  if (result.length !== stored.length) return false
  let diff = 0
  for (let i = 0; i < result.length; i++) {
    diff |= result.charCodeAt(i) ^ stored.charCodeAt(i)
  }
  return diff === 0
}
