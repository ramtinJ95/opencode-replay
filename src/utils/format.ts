/**
 * Date/time and number formatting utilities
 */

/**
 * Format a timestamp as a date string (e.g., "Jan 15, 2024")
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Format a timestamp as a date+time string (e.g., "Jan 15, 2024, 2:30 PM")
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Format a timestamp as a time string (e.g., "2:30 PM")
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Format a duration between two timestamps (e.g., "5m 30s", "1h 20m")
 */
export function formatDuration(startMs: number, endMs: number): string {
  const diff = endMs - startMs

  // Handle negative or zero durations
  if (diff <= 0) return "0s"

  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

/**
 * Format token count with k/M suffix for large numbers
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString()
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k`
  return `${(tokens / 1000000).toFixed(2)}M`
}

/**
 * Format cost in dollars
 */
export function formatCost(cost: number): string {
  if (cost === 0) return "—"
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

/**
 * Format a number with +/- prefix for diffs
 */
export function formatDiff(additions: number, deletions: number): string {
  const parts: string[] = []
  if (additions > 0) parts.push(`+${additions}`)
  if (deletions > 0) parts.push(`-${deletions}`)
  return parts.join(" ") || "0"
}

/**
 * Format relative time (e.g., "2 hours ago", "yesterday")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  // Handle future timestamps (clock skew or malformed data)
  if (diff < 0) return formatDate(timestamp)

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  return formatDate(timestamp)
}
