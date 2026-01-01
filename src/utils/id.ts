/**
 * ID parsing utilities for OpenCode IDs
 *
 * OpenCode IDs follow the pattern: "{prefix}_{timestamp}{random}"
 * Examples:
 *   - ses_4957d04cdffeJwdujYPBCKpIsb (session)
 *   - msg_b6a82fb38001Ei3X3A63gRCfuN (message)
 *   - prt_990882f75002cw7B1Eg1BdaxzV (part)
 *
 * The timestamp portion is hex-encoded milliseconds.
 */

/**
 * Extract the timestamp from an OpenCode ID
 * Returns the Date if parsing succeeds, null otherwise
 */
export function parseIdTimestamp(id: string): Date | null {
  // Extract timestamp portion (after prefix_)
  // The format is: prefix_[hex timestamp][random chars]
  // The hex timestamp is typically 12 characters
  const match = id.match(/^[a-z]+_([0-9a-f]+)/i)
  if (!match) return null

  const hex = match[1]
  if (!hex || hex.length < 10) return null

  // Try to parse as hex timestamp (milliseconds)
  // The timestamp is in the first ~12 hex chars
  const timestampHex = hex.slice(0, 12)
  const ms = parseInt(timestampHex, 16)

  if (isNaN(ms) || ms <= 0) return null

  // Sanity check: should be a reasonable timestamp (after year 2020, before 2100)
  const minTimestamp = new Date("2020-01-01").getTime()
  const maxTimestamp = new Date("2100-01-01").getTime()

  if (ms < minTimestamp || ms > maxTimestamp) return null

  return new Date(ms)
}

/**
 * Compare two OpenCode IDs chronologically
 * IDs are designed to sort chronologically by string comparison
 */
export function compareIds(a: string, b: string): number {
  return a.localeCompare(b)
}

/**
 * Get the prefix from an ID (ses, msg, prt, etc.)
 */
export function getIdPrefix(id: string): string | null {
  const match = id.match(/^([a-z]+)_/)
  return match ? match[1] ?? null : null
}

/**
 * Check if an ID has a specific prefix
 */
export function isSessionId(id: string): boolean {
  return id.startsWith("ses_")
}

export function isMessageId(id: string): boolean {
  return id.startsWith("msg_")
}

export function isPartId(id: string): boolean {
  return id.startsWith("prt_")
}
