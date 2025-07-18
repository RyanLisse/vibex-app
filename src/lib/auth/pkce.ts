import { createHash, randomBytes } from 'crypto'

/**
 * Generates a secure random string for PKCE code verifier
 * @param length Length of the verifier (recommended: 32-96 bytes)
 * @returns Base64URL-encoded random string
 */
export function generateCodeVerifier(length = 32): string {
  const randomBytesBuffer = randomBytes(length)
  return base64URLEncode(randomBytesBuffer)
}

/**
 * Generates a code challenge from a code verifier using SHA-256
 * @param codeVerifier The code verifier to generate challenge from
 * @returns Base64URL-encoded SHA-256 hash of the code verifier
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = createHash('sha256').update(codeVerifier).digest()
  return base64URLEncode(hash)
}

/**
 * Encodes a buffer to a Base64URL string
 * @param buffer Buffer to encode
 * @returns Base64URL-encoded string
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
