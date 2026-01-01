/**
 * ID parsing utilities for OpenCode IDs
 *
 * OpenCode IDs follow the pattern: "{prefix}_{timestamp}{random}"
 * Examples:
 *   - ses_4957d04cdffeJwdujYPBCKpIsb (session)
 *   - msg_b6a82fb38001Ei3X3A63gRCfuN (message)
 *   - prt_990882f75002cw7B1Eg1BdaxzV (part)
 *
 * Note: The timestamp encoding in IDs is not standard hex milliseconds.
 * For reliable timestamps, use the `time.created` field from the JSON entities.
 * IDs are still designed to sort chronologically via string comparison.
 */

/**
 * Extract the timestamp from an OpenCode ID
 * Note: This may return null as the encoding is non-standard.
 * Prefer using entity.time.created for reliable timestamps.
 */
export function parseIdTimestamp(_id: string): Date | null {
  // The ID timestamp encoding is non-standard and unreliable for parsing.
  // Use the time.created field from the entity JSON instead.
  return null
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
