/**
 * Tests for ID parsing utilities
 */

import { describe, test, expect } from "bun:test"
import {
  parseIdTimestamp,
  compareIds,
  getIdPrefix,
  isSessionId,
  isMessageId,
  isPartId,
} from "./id"

// =============================================================================
// SAMPLE IDS (Following OpenCode format: {prefix}_{timestamp}{random})
// =============================================================================

const SAMPLE_SESSION_ID = "ses_4957d04cdffeJwdujYPBCKpIsb"
const SAMPLE_MESSAGE_ID = "msg_b6a82fb38001Ei3X3A63gRCfuN"
const SAMPLE_PART_ID = "prt_990882f75002cw7B1Eg1BdaxzV"

// =============================================================================
// parseIdTimestamp
// =============================================================================

describe("parseIdTimestamp", () => {
  test("returns null for session IDs (non-standard encoding)", () => {
    // The ID timestamp encoding is non-standard and documented to return null
    expect(parseIdTimestamp(SAMPLE_SESSION_ID)).toBeNull()
  })

  test("returns null for message IDs", () => {
    expect(parseIdTimestamp(SAMPLE_MESSAGE_ID)).toBeNull()
  })

  test("returns null for part IDs", () => {
    expect(parseIdTimestamp(SAMPLE_PART_ID)).toBeNull()
  })

  test("returns null for arbitrary strings", () => {
    expect(parseIdTimestamp("random_string")).toBeNull()
    expect(parseIdTimestamp("")).toBeNull()
  })
})

// =============================================================================
// compareIds
// =============================================================================

describe("compareIds", () => {
  test("returns 0 for identical IDs", () => {
    expect(compareIds(SAMPLE_SESSION_ID, SAMPLE_SESSION_ID)).toBe(0)
  })

  test("returns negative when first ID comes before second", () => {
    const earlier = "msg_a00000000000Abc"
    const later = "msg_b00000000000Xyz"
    expect(compareIds(earlier, later)).toBeLessThan(0)
  })

  test("returns positive when first ID comes after second", () => {
    const earlier = "msg_a00000000000Abc"
    const later = "msg_b00000000000Xyz"
    expect(compareIds(later, earlier)).toBeGreaterThan(0)
  })

  test("compares IDs lexicographically", () => {
    const ids = [
      "msg_c00000000000",
      "msg_a00000000000",
      "msg_b00000000000",
    ]
    const sorted = [...ids].sort(compareIds)
    expect(sorted).toEqual([
      "msg_a00000000000",
      "msg_b00000000000",
      "msg_c00000000000",
    ])
  })
})

// =============================================================================
// getIdPrefix
// =============================================================================

describe("getIdPrefix", () => {
  test("extracts prefix from session ID", () => {
    expect(getIdPrefix(SAMPLE_SESSION_ID)).toBe("ses")
  })

  test("extracts prefix from message ID", () => {
    expect(getIdPrefix(SAMPLE_MESSAGE_ID)).toBe("msg")
  })

  test("extracts prefix from part ID", () => {
    expect(getIdPrefix(SAMPLE_PART_ID)).toBe("prt")
  })

  test("returns null for IDs without underscore", () => {
    expect(getIdPrefix("nounderscore")).toBeNull()
  })

  test("returns null for IDs with non-alphabetic prefix", () => {
    expect(getIdPrefix("123_abc")).toBeNull()
  })

  test("returns null for empty string", () => {
    expect(getIdPrefix("")).toBeNull()
  })

  test("handles IDs with multiple underscores", () => {
    // Should only match the first prefix
    expect(getIdPrefix("abc_def_ghi")).toBe("abc")
  })
})

// =============================================================================
// isSessionId
// =============================================================================

describe("isSessionId", () => {
  test("returns true for valid session IDs", () => {
    expect(isSessionId(SAMPLE_SESSION_ID)).toBe(true)
    expect(isSessionId("ses_anything")).toBe(true)
  })

  test("returns false for message IDs", () => {
    expect(isSessionId(SAMPLE_MESSAGE_ID)).toBe(false)
  })

  test("returns false for part IDs", () => {
    expect(isSessionId(SAMPLE_PART_ID)).toBe(false)
  })

  test("returns false for IDs with similar prefix", () => {
    expect(isSessionId("session_123")).toBe(false)
    expect(isSessionId("sess_123")).toBe(false)
  })

  test("returns false for empty string", () => {
    expect(isSessionId("")).toBe(false)
  })
})

// =============================================================================
// isMessageId
// =============================================================================

describe("isMessageId", () => {
  test("returns true for valid message IDs", () => {
    expect(isMessageId(SAMPLE_MESSAGE_ID)).toBe(true)
    expect(isMessageId("msg_anything")).toBe(true)
  })

  test("returns false for session IDs", () => {
    expect(isMessageId(SAMPLE_SESSION_ID)).toBe(false)
  })

  test("returns false for part IDs", () => {
    expect(isMessageId(SAMPLE_PART_ID)).toBe(false)
  })

  test("returns false for IDs with similar prefix", () => {
    expect(isMessageId("message_123")).toBe(false)
    expect(isMessageId("msgs_123")).toBe(false)
  })

  test("returns false for empty string", () => {
    expect(isMessageId("")).toBe(false)
  })
})

// =============================================================================
// isPartId
// =============================================================================

describe("isPartId", () => {
  test("returns true for valid part IDs", () => {
    expect(isPartId(SAMPLE_PART_ID)).toBe(true)
    expect(isPartId("prt_anything")).toBe(true)
  })

  test("returns false for session IDs", () => {
    expect(isPartId(SAMPLE_SESSION_ID)).toBe(false)
  })

  test("returns false for message IDs", () => {
    expect(isPartId(SAMPLE_MESSAGE_ID)).toBe(false)
  })

  test("returns false for IDs with similar prefix", () => {
    expect(isPartId("part_123")).toBe(false)
    expect(isPartId("parts_123")).toBe(false)
  })

  test("returns false for empty string", () => {
    expect(isPartId("")).toBe(false)
  })
})
