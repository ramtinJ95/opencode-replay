/**
 * Tests for message rendering components
 */

import { describe, test, expect } from "bun:test"
import { JSDOM } from "jsdom"
import { renderMessage, renderMessages } from "./message"
import {
  createUserMessage,
  createAssistantMessage,
  createTextPart,
  createMessageWithParts,
  createUserMessageWithParts,
  createAssistantMessageWithParts,
  createConversation,
  BASE_TIMESTAMP,
} from "../../../tests/fixtures"

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse HTML and return DOM document
 */
function parseHtml(html: string): Document {
  const dom = new JSDOM(html)
  return dom.window.document
}

// =============================================================================
// renderMessage - User Messages
// =============================================================================

describe("renderMessage - user messages", () => {
  test("renders user message with correct role class", () => {
    const messageWithParts = createUserMessageWithParts({}, "Hello world")
    const html = renderMessage(messageWithParts)

    expect(html).toContain('class="message message-user"')
  })

  test("renders user message with message ID", () => {
    const messageWithParts = createUserMessageWithParts(
      { id: "msg_test_123" },
      "Hello"
    )
    const html = renderMessage(messageWithParts)

    expect(html).toContain('id="msg_test_123"')
  })

  test("renders User role label", () => {
    const messageWithParts = createUserMessageWithParts()
    const html = renderMessage(messageWithParts)
    const doc = parseHtml(html)

    const roleSpan = doc.querySelector(".message-role")
    expect(roleSpan?.textContent).toBe("User")
  })

  test("renders message time", () => {
    const messageWithParts = createUserMessageWithParts()
    const html = renderMessage(messageWithParts)

    expect(html).toContain('class="message-time"')
  })

  test("renders model info when present", () => {
    const messageWithParts = createUserMessageWithParts({
      model: { providerID: "anthropic", modelID: "claude-3" },
    })
    const html = renderMessage(messageWithParts)

    expect(html).toContain("anthropic/claude-3")
    expect(html).toContain('class="message-model"')
  })

  test("renders text content from parts", () => {
    const messageWithParts = createUserMessageWithParts(
      {},
      "This is my test message"
    )
    const html = renderMessage(messageWithParts)

    expect(html).toContain("This is my test message")
  })

  test("escapes HTML in message content", () => {
    const messageWithParts = createUserMessageWithParts(
      {},
      '<script>alert("xss")</script>'
    )
    const html = renderMessage(messageWithParts)

    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })
})

// =============================================================================
// renderMessage - Assistant Messages
// =============================================================================

describe("renderMessage - assistant messages", () => {
  test("renders assistant message with correct role class", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {},
      { text: "Hello" }
    )
    const html = renderMessage(messageWithParts)

    expect(html).toContain('class="message message-assistant"')
  })

  test("renders assistant message with message ID", () => {
    const messageWithParts = createAssistantMessageWithParts(
      { id: "msg_assistant_456" },
      { text: "Response" }
    )
    const html = renderMessage(messageWithParts)

    expect(html).toContain('id="msg_assistant_456"')
  })

  test("renders Assistant role label", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {},
      { text: "Hi" }
    )
    const html = renderMessage(messageWithParts)
    const doc = parseHtml(html)

    const roleSpan = doc.querySelector(".message-role")
    expect(roleSpan?.textContent).toBe("Assistant")
  })

  test("renders model ID", () => {
    const messageWithParts = createAssistantMessageWithParts(
      { modelID: "claude-sonnet-4" },
      { text: "Response" }
    )
    const html = renderMessage(messageWithParts)

    expect(html).toContain("claude-sonnet-4")
  })

  test("renders token stats when present", () => {
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
    const html = renderMessage(messageWithParts)

    expect(html).toContain("Tokens:")
    expect(html).toContain("1.5k") // formatTokens output for 1500
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
    const html = renderMessage(messageWithParts)

    expect(html).toContain("Cache:")
    expect(html).toContain("read")
  })

  test("renders cost when present", () => {
    const messageWithParts = createAssistantMessageWithParts(
      { cost: 0.0125 },
      { text: "Response" }
    )
    const html = renderMessage(messageWithParts)

    expect(html).toContain("Cost:")
    expect(html).toContain("$0.013") // formatCost output
  })

  test("renders finish reason when present", () => {
    const messageWithParts = createAssistantMessageWithParts(
      { finish: "stop" },
      { text: "Response" }
    )
    const html = renderMessage(messageWithParts)

    expect(html).toContain("Finish:")
    expect(html).toContain("stop")
  })

  test("does not render stats section when no stats present", () => {
    const message = createAssistantMessage({
      tokens: undefined,
      cost: undefined,
      finish: undefined,
    })
    const messageWithParts = createMessageWithParts(message, [
      createTextPart({ messageID: message.id, text: "Response" }),
    ])
    const html = renderMessage(messageWithParts)

    expect(html).not.toContain('class="message-stats"')
  })
})

// =============================================================================
// renderMessage - Parts rendering
// =============================================================================

describe("renderMessage - parts rendering", () => {
  test("renders text parts", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {},
      { text: "This is a response" }
    )
    const html = renderMessage(messageWithParts)

    expect(html).toContain("This is a response")
    expect(html).toContain('class="part part-text"')
  })

  test("renders tool parts", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {},
      { tools: [{ tool: "bash", output: "file1.txt" }] }
    )
    const html = renderMessage(messageWithParts)

    expect(html).toContain("bash")
    expect(html).toContain("tool-call")
  })

  test("renders multiple parts", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {},
      {
        text: "Let me check that for you",
        tools: [
          { tool: "bash", output: "output1" },
          { tool: "read", output: "content" },
        ],
      }
    )
    const html = renderMessage(messageWithParts)

    // Should have text part and tool parts
    expect(html).toContain("Let me check that for you")
    expect(html).toContain("bash")
    expect(html).toContain("read")
  })
})

// =============================================================================
// renderMessages - Multiple messages
// =============================================================================

describe("renderMessages", () => {
  test("renders empty array without errors", () => {
    const html = renderMessages([])

    expect(html).toContain('class="messages"')
  })

  test("renders multiple messages", () => {
    const messages = createConversation([
      { userText: "Hello", assistantText: "Hi there!" },
      { userText: "How are you?", assistantText: "I'm doing great!" },
    ])
    const html = renderMessages(messages)
    const doc = parseHtml(html)

    const messageElements = doc.querySelectorAll(".message")
    expect(messageElements.length).toBe(4) // 2 user + 2 assistant
  })

  test("renders messages in correct order", () => {
    const messages = createConversation([
      { userText: "First", assistantText: "Second" },
    ])
    const html = renderMessages(messages)

    const firstIndex = html.indexOf("First")
    const secondIndex = html.indexOf("Second")

    expect(firstIndex).toBeLessThan(secondIndex)
  })

  test("wraps messages in container div", () => {
    const messages = createConversation([
      { userText: "Test", assistantText: "Response" },
    ])
    const html = renderMessages(messages)

    expect(html).toMatch(/^<div class="messages">/)
    expect(html).toMatch(/<\/div>$/)
  })

  test("renders alternating user and assistant messages correctly", () => {
    const messages = createConversation([
      { userText: "Q1", assistantText: "A1" },
      { userText: "Q2", assistantText: "A2" },
    ])
    const html = renderMessages(messages)
    const doc = parseHtml(html)

    const userMessages = doc.querySelectorAll(".message-user")
    const assistantMessages = doc.querySelectorAll(".message-assistant")

    expect(userMessages.length).toBe(2)
    expect(assistantMessages.length).toBe(2)
  })
})

// =============================================================================
// Snapshot tests for regression detection
// =============================================================================

describe("renderMessage snapshots", () => {
  test("user message snapshot", () => {
    const messageWithParts = createUserMessageWithParts(
      {
        id: "msg_snapshot_user",
        time: { created: BASE_TIMESTAMP },
        model: { providerID: "anthropic", modelID: "claude-3" },
      },
      "Hello, can you help me?"
    )
    const html = renderMessage(messageWithParts)

    // Verify structure without timezone-dependent time values
    expect(html).toContain('id="msg_snapshot_user"')
    expect(html).toContain('class="message message-user"')
    expect(html).toContain("anthropic/claude-3")
    expect(html).toContain("Hello, can you help me?")
    expect(html).toContain('class="message-time"')
  })

  test("assistant message with stats snapshot", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {
        id: "msg_snapshot_assistant",
        time: { created: BASE_TIMESTAMP, completed: BASE_TIMESTAMP + 5000 },
        modelID: "claude-sonnet-4",
        tokens: { input: 100, output: 50, reasoning: 0 },
        cost: 0.001,
        finish: "stop",
      },
      { text: "Of course! I'd be happy to help." }
    )
    const html = renderMessage(messageWithParts)

    // Verify structure without timezone-dependent time values
    expect(html).toContain('id="msg_snapshot_assistant"')
    expect(html).toContain('class="message message-assistant"')
    expect(html).toContain("claude-sonnet-4")
    expect(html).toContain("Tokens: 100 in / 50 out")
    expect(html).toContain("Cost: $0.0010")
    expect(html).toContain("Finish: stop")
  })

  test("assistant message with tools snapshot", () => {
    const messageWithParts = createAssistantMessageWithParts(
      {
        id: "msg_snapshot_tools",
        time: { created: BASE_TIMESTAMP, completed: BASE_TIMESTAMP + 3000 },
      },
      {
        text: "Let me check that file for you.",
        tools: [{ tool: "read", output: "file contents here" }],
      }
    )
    const html = renderMessage(messageWithParts)

    // Verify structure without timezone-dependent time values
    expect(html).toContain('id="msg_snapshot_tools"')
    expect(html).toContain("Let me check that file for you.")
    expect(html).toContain("tool-read")
    expect(html).toContain("file contents here")
  })
})

// =============================================================================
// Edge cases
// =============================================================================

describe("renderMessage edge cases", () => {
  test("handles message with empty parts array", () => {
    const message = createUserMessage()
    const messageWithParts = createMessageWithParts(message, [])
    const html = renderMessage(messageWithParts)

    // Should still render the message structure
    expect(html).toContain('class="message message-user"')
    expect(html).toContain('class="message-content"')
  })

  test("handles message with zero cost", () => {
    const messageWithParts = createAssistantMessageWithParts(
      { cost: 0 },
      { text: "Response" }
    )
    const html = renderMessage(messageWithParts)

    // Zero cost should not be displayed
    expect(html).not.toContain("Cost:")
  })

  test("handles assistant message without model ID", () => {
    // Assistant messages can have empty modelID in some edge cases
    const message = createAssistantMessage({ modelID: "" })
    const messageWithParts = createMessageWithParts(message, [
      createTextPart({ messageID: message.id, text: "Test response" }),
    ])
    const html = renderMessage(messageWithParts)

    // Should render without crashing, model section should be empty or absent
    expect(html).toContain('class="message message-assistant"')
    expect(html).toContain("Test response")
  })

  test("handles special characters in content", () => {
    const messageWithParts = createUserMessageWithParts(
      {},
      "Test with <angle> & 'quotes' and \"double quotes\""
    )
    const html = renderMessage(messageWithParts)

    // All special chars should be escaped
    expect(html).toContain("&lt;angle&gt;")
    expect(html).toContain("&amp;")
    expect(html).toContain("&#39;quotes&#39;")
    expect(html).toContain("&quot;double quotes&quot;")
  })

  test("handles very long content", () => {
    const longContent = "x".repeat(10000)
    const messageWithParts = createUserMessageWithParts({}, longContent)
    const html = renderMessage(messageWithParts)

    // Should contain all content
    expect(html).toContain(longContent)
  })
})
