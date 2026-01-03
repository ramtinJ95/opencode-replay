/**
 * Tests for markdown message rendering
 */

import { describe, test, expect } from "bun:test"
import { renderMessageMd, renderMessagesMd } from "./message"
import {
  createUserMessageWithParts,
  createAssistantMessageWithParts,
  createConversation,
  BASE_TIMESTAMP,
} from "../../../tests/fixtures"

// =============================================================================
// renderMessageMd - User Messages
// =============================================================================

describe("renderMessageMd - user messages", () => {
  test("renders user message with User header", () => {
    const messageWithParts = createUserMessageWithParts({}, "Hello world")
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("### User")
  })

  test("renders message time in italics", () => {
    const messageWithParts = createUserMessageWithParts()
    const md = renderMessageMd(messageWithParts)

    // Time should be in italics format
    expect(md).toMatch(/\*\d+:\d+ [AP]M\*/)
  })

  test("renders model info when present", () => {
    const messageWithParts = createUserMessageWithParts({
      model: { providerID: "anthropic", modelID: "claude-3" },
    })
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("anthropic/claude-3")
  })

  test("renders text content", () => {
    const messageWithParts = createUserMessageWithParts(
      {},
      "This is my test message"
    )
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("This is my test message")
  })
})

// =============================================================================
// renderMessageMd - Assistant Messages
// =============================================================================

describe("renderMessageMd - assistant messages", () => {
  test("renders assistant message with Assistant header", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {},
      { text: "Hello" }
    )
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("### Assistant")
  })

  test("renders model ID", () => {
    const messageWithParts = createAssistantMessageWithParts(
      { modelID: "claude-sonnet-4" },
      { text: "Response" }
    )
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("claude-sonnet-4")
  })

  test("renders token stats in blockquote", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {
        tokens: {
          input: 1500,
          output: 500,
          reasoning: 0,
        },
      },
      { text: "Response" }
    )
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("> Tokens:")
    expect(md).toContain("1.5k") // formatTokens output for 1500
  })

  test("renders cache stats when present", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {
        tokens: {
          input: 1000,
          output: 200,
          reasoning: 0,
          cache: { read: 500, write: 100 },
        },
      },
      { text: "Response" }
    )
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("Cache:")
  })

  test("renders cost when present", () => {
    const messageWithParts = createAssistantMessageWithParts(
      { cost: 0.0125 },
      { text: "Response" }
    )
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("Cost:")
    expect(md).toContain("$0.013")
  })

  test("renders finish reason when present", () => {
    const messageWithParts = createAssistantMessageWithParts(
      { finish: "stop" },
      { text: "Response" }
    )
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("Finish: stop")
  })

  test("does not render stats when not present", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {
        tokens: undefined,
        cost: undefined,
        finish: undefined,
      },
      { text: "Response" }
    )
    const md = renderMessageMd(messageWithParts)

    // Should not have a blockquote for stats
    expect(md).not.toContain("> Tokens:")
  })
})

// =============================================================================
// renderMessagesMd - Multiple messages
// =============================================================================

describe("renderMessagesMd", () => {
  test("renders empty array without errors", () => {
    const md = renderMessagesMd([])

    expect(md).toBe("")
  })

  test("renders multiple messages separated by horizontal rules", () => {
    const messages = createConversation([
      { userText: "Hello", assistantText: "Hi there!" },
    ])
    const md = renderMessagesMd(messages)

    expect(md).toContain("---")
    expect(md).toContain("Hello")
    expect(md).toContain("Hi there!")
  })

  test("renders messages in correct order", () => {
    const messages = createConversation([
      { userText: "First", assistantText: "Second" },
    ])
    const md = renderMessagesMd(messages)

    const firstIndex = md.indexOf("First")
    const secondIndex = md.indexOf("Second")

    expect(firstIndex).toBeLessThan(secondIndex)
  })
})

// =============================================================================
// Edge cases
// =============================================================================

describe("renderMessageMd edge cases", () => {
  test("handles message with empty parts array", () => {
    const messageWithParts = createUserMessageWithParts({}, "")
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain("### User")
  })

  test("handles message with zero cost", () => {
    const messageWithParts = createAssistantMessageWithParts(
      { cost: 0 },
      { text: "Response" }
    )
    const md = renderMessageMd(messageWithParts)

    // Zero cost should not be displayed
    expect(md).not.toContain("Cost:")
  })

  test("handles very long content", () => {
    const longContent = "x".repeat(10000)
    const messageWithParts = createUserMessageWithParts({}, longContent)
    const md = renderMessageMd(messageWithParts)

    expect(md).toContain(longContent)
  })
})
