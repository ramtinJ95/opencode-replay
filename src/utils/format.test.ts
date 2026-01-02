/**
 * Tests for date/time and number formatting utilities
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatDuration,
  formatTokens,
  formatCost,
  formatDiff,
  formatRelativeTime,
  formatBytes,
} from "./format"

// =============================================================================
// FIXED TIMESTAMPS FOR DETERMINISTIC TESTS
// =============================================================================

// Jan 15, 2024, 2:30:00 PM UTC
const BASE_TIMESTAMP = 1705329000000

// =============================================================================
// formatDate
// =============================================================================

describe("formatDate", () => {
  test("formats timestamp as date string", () => {
    const result = formatDate(BASE_TIMESTAMP)
    // Note: Output depends on locale, but should contain these elements
    expect(result).toContain("2024")
    expect(result).toContain("15")
  })

  test("handles different months", () => {
    // Dec 25, 2023
    const december = formatDate(1703505600000)
    expect(december).toContain("2023")
    expect(december).toContain("25")
  })
})

// =============================================================================
// formatDateTime
// =============================================================================

describe("formatDateTime", () => {
  test("formats timestamp with date and time", () => {
    const result = formatDateTime(BASE_TIMESTAMP)
    expect(result).toContain("2024")
    expect(result).toContain("15")
    // Should contain time component
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

// =============================================================================
// formatTime
// =============================================================================

describe("formatTime", () => {
  test("formats timestamp as time only", () => {
    const result = formatTime(BASE_TIMESTAMP)
    // Should be time format like "2:30 PM" or "14:30"
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

// =============================================================================
// formatDuration
// =============================================================================

describe("formatDuration", () => {
  test("returns 0s for zero duration", () => {
    expect(formatDuration(1000, 1000)).toBe("0s")
  })

  test("returns 0s for negative duration", () => {
    expect(formatDuration(2000, 1000)).toBe("0s")
  })

  test("formats seconds only", () => {
    expect(formatDuration(0, 5000)).toBe("5s")
    expect(formatDuration(0, 59000)).toBe("59s")
  })

  test("formats minutes and seconds", () => {
    expect(formatDuration(0, 60000)).toBe("1m")
    expect(formatDuration(0, 90000)).toBe("1m 30s")
    expect(formatDuration(0, 120000)).toBe("2m")
    expect(formatDuration(0, 125000)).toBe("2m 5s")
  })

  test("formats hours and minutes", () => {
    expect(formatDuration(0, 3600000)).toBe("1h")
    expect(formatDuration(0, 3660000)).toBe("1h 1m")
    expect(formatDuration(0, 7200000)).toBe("2h")
    expect(formatDuration(0, 7320000)).toBe("2h 2m")
  })

  test("works with non-zero start time", () => {
    expect(formatDuration(1000, 6000)).toBe("5s")
    expect(formatDuration(BASE_TIMESTAMP, BASE_TIMESTAMP + 90000)).toBe("1m 30s")
  })
})

// =============================================================================
// formatTokens
// =============================================================================

describe("formatTokens", () => {
  test("formats small numbers as-is", () => {
    expect(formatTokens(0)).toBe("0")
    expect(formatTokens(1)).toBe("1")
    expect(formatTokens(999)).toBe("999")
  })

  test("formats thousands with k suffix", () => {
    expect(formatTokens(1000)).toBe("1.0k")
    expect(formatTokens(1500)).toBe("1.5k")
    expect(formatTokens(10000)).toBe("10.0k")
    expect(formatTokens(999999)).toBe("1000.0k")
  })

  test("formats millions with M suffix", () => {
    expect(formatTokens(1000000)).toBe("1.00M")
    expect(formatTokens(1500000)).toBe("1.50M")
    expect(formatTokens(10000000)).toBe("10.00M")
  })
})

// =============================================================================
// formatCost
// =============================================================================

describe("formatCost", () => {
  test("returns dash for zero cost", () => {
    expect(formatCost(0)).toBe("—")
  })

  test("formats very small costs with 4 decimals", () => {
    expect(formatCost(0.0001)).toBe("$0.0001")
    expect(formatCost(0.0099)).toBe("$0.0099")
  })

  test("formats small costs with 3 decimals", () => {
    expect(formatCost(0.01)).toBe("$0.010")
    expect(formatCost(0.125)).toBe("$0.125")
    expect(formatCost(0.999)).toBe("$0.999")
  })

  test("formats larger costs with 2 decimals", () => {
    expect(formatCost(1)).toBe("$1.00")
    expect(formatCost(1.5)).toBe("$1.50")
    expect(formatCost(10.99)).toBe("$10.99")
    expect(formatCost(100)).toBe("$100.00")
  })
})

// =============================================================================
// formatDiff
// =============================================================================

describe("formatDiff", () => {
  test("returns 0 for no changes", () => {
    expect(formatDiff(0, 0)).toBe("0")
  })

  test("formats additions only", () => {
    expect(formatDiff(10, 0)).toBe("+10")
    expect(formatDiff(100, 0)).toBe("+100")
  })

  test("formats deletions only", () => {
    expect(formatDiff(0, 5)).toBe("-5")
    expect(formatDiff(0, 50)).toBe("-50")
  })

  test("formats both additions and deletions", () => {
    expect(formatDiff(10, 5)).toBe("+10 -5")
    expect(formatDiff(100, 50)).toBe("+100 -50")
  })
})

// =============================================================================
// formatRelativeTime
// =============================================================================

describe("formatRelativeTime", () => {
  // Store original Date.now and mock it for deterministic tests
  let originalNow: typeof Date.now
  const mockNow = BASE_TIMESTAMP + 3600000 // 1 hour after BASE_TIMESTAMP

  beforeEach(() => {
    originalNow = Date.now
    Date.now = () => mockNow
  })

  afterEach(() => {
    Date.now = originalNow
  })

  test("returns 'just now' for recent timestamps", () => {
    expect(formatRelativeTime(mockNow - 30000)).toBe("just now") // 30s ago
    expect(formatRelativeTime(mockNow - 59000)).toBe("just now") // 59s ago
  })

  test("returns minutes ago", () => {
    expect(formatRelativeTime(mockNow - 60000)).toBe("1m ago")
    expect(formatRelativeTime(mockNow - 300000)).toBe("5m ago")
    expect(formatRelativeTime(mockNow - 3540000)).toBe("59m ago")
  })

  test("returns hours ago", () => {
    expect(formatRelativeTime(mockNow - 3600000)).toBe("1h ago")
    expect(formatRelativeTime(mockNow - 7200000)).toBe("2h ago")
    expect(formatRelativeTime(mockNow - 82800000)).toBe("23h ago")
  })

  test("returns 'yesterday' for 1 day ago", () => {
    expect(formatRelativeTime(mockNow - 86400000)).toBe("yesterday")
  })

  test("returns days ago for 2-6 days", () => {
    expect(formatRelativeTime(mockNow - 172800000)).toBe("2d ago")
    expect(formatRelativeTime(mockNow - 518400000)).toBe("6d ago")
  })

  test("returns formatted date for 7+ days ago", () => {
    const result = formatRelativeTime(mockNow - 604800000) // 7 days
    expect(result).toContain("2024") // Should be a formatted date
  })

  test("handles future timestamps by returning formatted date", () => {
    const result = formatRelativeTime(mockNow + 86400000) // 1 day in future
    expect(result).toContain("2024")
  })
})

// =============================================================================
// formatBytes
// =============================================================================

describe("formatBytes", () => {
  test("formats bytes", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(1)).toBe("1 B")
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(1023)).toBe("1023 B")
  })

  test("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(1536)).toBe("1.5 KB")
    expect(formatBytes(10240)).toBe("10.0 KB")
    expect(formatBytes(1048575)).toBe("1024.0 KB")
  })

  test("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB")
    expect(formatBytes(1572864)).toBe("1.5 MB")
    expect(formatBytes(10485760)).toBe("10.0 MB")
  })
})
