/**
 * Tests for HTML generation helper functions
 */

import { describe, test, expect } from "bun:test"
import {
  getFirstPrompt,
  countTools,
  buildTimeline,
  paginateMessages,
  PROMPTS_PER_PAGE,
} from "./html"
import {
  createUserMessageWithParts,
  createAssistantMessageWithParts,
  createConversation,
  createTextPart,
  createToolPart,
  createMessageWithParts,
  createUserMessage,
  BASE_TIMESTAMP,
} from "../../tests/fixtures"
import type { MessageWithParts } from "../storage/types"

// =============================================================================
// getFirstPrompt
// =============================================================================

describe("getFirstPrompt", () => {
  test("returns first user message text", () => {
    const messages = createConversation([
      { userText: "Hello there!", assistantText: "Hi!" },
    ])

    const result = getFirstPrompt(messages)
    expect(result).toBe("Hello there!")
  })

  test("returns undefined for empty messages array", () => {
    const result = getFirstPrompt([])
    expect(result).toBeUndefined()
  })

  test("returns undefined when no user messages", () => {
    const messages: MessageWithParts[] = [
      createAssistantMessageWithParts({}, { text: "I'm here to help" }),
    ]

    const result = getFirstPrompt(messages)
    expect(result).toBeUndefined()
  })

  test("returns first user message even if assistant comes first", () => {
    // Create an unusual order where assistant message comes first
    const assistantMsg = createAssistantMessageWithParts(
      { id: "msg_asst_1" },
      { text: "Welcome!" }
    )
    const userMsg = createUserMessageWithParts(
      { id: "msg_user_1" },
      "Hello from user"
    )

    const messages: MessageWithParts[] = [assistantMsg, userMsg]

    const result = getFirstPrompt(messages)
    expect(result).toBe("Hello from user")
  })

  test("returns undefined when user message has no text parts", () => {
    const message = createUserMessage()
    const toolPart = createToolPart({
      messageID: message.id,
      sessionID: message.sessionID,
    })
    const messageWithParts = createMessageWithParts(message, [toolPart])

    const result = getFirstPrompt([messageWithParts])
    expect(result).toBeUndefined()
  })

  test("returns text from first text part found", () => {
    const message = createUserMessage()
    const textPart1 = createTextPart({
      id: "prt_first",
      messageID: message.id,
      sessionID: message.sessionID,
      text: "First text",
    })
    const textPart2 = createTextPart({
      id: "prt_second",
      messageID: message.id,
      sessionID: message.sessionID,
      text: "Second text",
    })
    const messageWithParts = createMessageWithParts(message, [
      textPart1,
      textPart2,
    ])

    const result = getFirstPrompt([messageWithParts])
    expect(result).toBe("First text")
  })
})

// =============================================================================
// countTools
// =============================================================================

describe("countTools", () => {
  test("returns empty object for empty parts array", () => {
    const result = countTools([])
    expect(result).toEqual({})
  })

  test("returns empty object for parts with no tools", () => {
    const textPart = createTextPart({ text: "Just text" })
    const result = countTools([textPart])
    expect(result).toEqual({})
  })

  test("counts single tool usage", () => {
    const bashTool = createToolPart({ tool: "bash" })
    const result = countTools([bashTool])
    expect(result).toEqual({ bash: 1 })
  })

  test("counts multiple different tools", () => {
    const bashTool = createToolPart({ tool: "bash", id: "prt_1" })
    const readTool = createToolPart({ tool: "read", id: "prt_2" })
    const editTool = createToolPart({ tool: "edit", id: "prt_3" })

    const result = countTools([bashTool, readTool, editTool])
    expect(result).toEqual({ bash: 1, read: 1, edit: 1 })
  })

  test("counts multiple uses of same tool", () => {
    const bash1 = createToolPart({ tool: "bash", id: "prt_1" })
    const bash2 = createToolPart({ tool: "bash", id: "prt_2" })
    const bash3 = createToolPart({ tool: "bash", id: "prt_3" })

    const result = countTools([bash1, bash2, bash3])
    expect(result).toEqual({ bash: 3 })
  })

  test("correctly handles mixed parts", () => {
    const textPart = createTextPart({ id: "prt_text" })
    const bash1 = createToolPart({ tool: "bash", id: "prt_bash1" })
    const bash2 = createToolPart({ tool: "bash", id: "prt_bash2" })
    const readTool = createToolPart({ tool: "read", id: "prt_read" })

    const result = countTools([textPart, bash1, bash2, readTool])
    expect(result).toEqual({ bash: 2, read: 1 })
  })
})

// =============================================================================
// buildTimeline
// =============================================================================

describe("buildTimeline", () => {
  test("returns empty array for empty messages", () => {
    const result = buildTimeline([])
    expect(result).toEqual([])
  })

  test("returns empty array when no user messages", () => {
    const messages: MessageWithParts[] = [
      createAssistantMessageWithParts({}, { text: "Hi" }),
    ]

    const result = buildTimeline(messages)
    expect(result).toEqual([])
  })

  test("creates timeline entry for each user message", () => {
    const messages = createConversation([
      { userText: "First question", assistantText: "First answer" },
      { userText: "Second question", assistantText: "Second answer" },
    ])

    const result = buildTimeline(messages)
    expect(result).toHaveLength(2)
  })

  test("assigns correct prompt numbers", () => {
    const messages = createConversation([
      { userText: "Q1", assistantText: "A1" },
      { userText: "Q2", assistantText: "A2" },
      { userText: "Q3", assistantText: "A3" },
    ])

    const result = buildTimeline(messages)
    expect(result[0]?.promptNumber).toBe(1)
    expect(result[1]?.promptNumber).toBe(2)
    expect(result[2]?.promptNumber).toBe(3)
  })

  test("includes message ID", () => {
    const messages = createConversation([
      { userText: "Question", assistantText: "Answer" },
    ])

    const result = buildTimeline(messages)
    expect(result[0]?.messageId).toBe(messages[0]?.message.id)
  })

  test("includes prompt preview text", () => {
    const messages = createConversation([
      { userText: "What is TypeScript?", assistantText: "A typed superset..." },
    ])

    const result = buildTimeline(messages)
    expect(result[0]?.promptPreview).toBe("What is TypeScript?")
  })

  test("includes timestamp from user message", () => {
    const messages = createConversation([
      { userText: "Question", assistantText: "Answer" },
    ])

    const result = buildTimeline(messages)
    expect(result[0]?.timestamp).toBe(messages[0]?.message.time.created)
  })

  test("counts tools from following assistant messages", () => {
    // Create a user message followed by assistant with tools
    const userMsg = createUserMessageWithParts(
      { id: "msg_user_1", time: { created: BASE_TIMESTAMP } },
      "Do something"
    )
    const assistantMsg = createAssistantMessageWithParts(
      {
        id: "msg_asst_1",
        parentID: "msg_user_1",
        time: { created: BASE_TIMESTAMP + 1000 },
      },
      {
        text: "Done",
        tools: [
          { tool: "bash", output: "ok" },
          { tool: "bash", output: "ok2" },
          { tool: "read", output: "content" },
        ],
      }
    )

    const messages: MessageWithParts[] = [userMsg, assistantMsg]
    const result = buildTimeline(messages)

    expect(result[0]?.toolCounts).toEqual({ bash: 2, read: 1 })
  })

  test("calculates correct page numbers based on PROMPTS_PER_PAGE", () => {
    // Create more than PROMPTS_PER_PAGE user prompts
    const exchanges = Array.from({ length: 12 }, (_, i) => ({
      userText: `Question ${i + 1}`,
      assistantText: `Answer ${i + 1}`,
    }))
    const messages = createConversation(exchanges)

    const result = buildTimeline(messages)

    // With PROMPTS_PER_PAGE = 5:
    // Prompts 1-5 -> Page 1
    // Prompts 6-10 -> Page 2
    // Prompts 11-12 -> Page 3
    expect(result[0]?.pageNumber).toBe(1) // Prompt 1
    expect(result[4]?.pageNumber).toBe(1) // Prompt 5
    expect(result[5]?.pageNumber).toBe(2) // Prompt 6
    expect(result[9]?.pageNumber).toBe(2) // Prompt 10
    expect(result[10]?.pageNumber).toBe(3) // Prompt 11
  })
})

// =============================================================================
// paginateMessages
// =============================================================================

describe("paginateMessages", () => {
  test("returns empty array for empty messages", () => {
    const result = paginateMessages([])
    expect(result).toEqual([])
  })

  test("returns single page for messages under limit", () => {
    const messages = createConversation([
      { userText: "Q1", assistantText: "A1" },
      { userText: "Q2", assistantText: "A2" },
    ])

    const result = paginateMessages(messages)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(4) // 2 user + 2 assistant
  })

  test("paginates at PROMPTS_PER_PAGE boundary", () => {
    // Create exactly PROMPTS_PER_PAGE + 1 user prompts
    const exchanges = Array.from({ length: PROMPTS_PER_PAGE + 1 }, (_, i) => ({
      userText: `Q${i + 1}`,
      assistantText: `A${i + 1}`,
    }))
    const messages = createConversation(exchanges)

    const result = paginateMessages(messages)

    expect(result).toHaveLength(2)
    // First page should have PROMPTS_PER_PAGE user messages (plus their assistant responses)
    // Second page should have 1 user message (plus its assistant response)
  })

  test("keeps assistant messages with their preceding user message", () => {
    const messages = createConversation([
      { userText: "Q1", assistantText: "A1" },
      { userText: "Q2", assistantText: "A2" },
    ])

    const result = paginateMessages(messages)

    // Check that each user message is followed by its assistant response
    const page = result[0]!
    expect(page[0]?.message.role).toBe("user")
    expect(page[1]?.message.role).toBe("assistant")
    expect(page[2]?.message.role).toBe("user")
    expect(page[3]?.message.role).toBe("assistant")
  })

  test("handles large conversations correctly", () => {
    // Create 15 user prompts (should result in 3 pages with PROMPTS_PER_PAGE = 5)
    const exchanges = Array.from({ length: 15 }, (_, i) => ({
      userText: `Question ${i + 1}`,
      assistantText: `Answer ${i + 1}`,
    }))
    const messages = createConversation(exchanges)

    const result = paginateMessages(messages)

    expect(result).toHaveLength(3)
  })

  test("counts only user messages for pagination", () => {
    // Create a conversation where assistant has multiple messages between user messages
    const userMsg1 = createUserMessageWithParts(
      { id: "msg_u1", time: { created: BASE_TIMESTAMP } },
      "Q1"
    )
    const assistantMsg1 = createAssistantMessageWithParts(
      { id: "msg_a1", time: { created: BASE_TIMESTAMP + 1000 } },
      { text: "A1 part 1" }
    )
    const assistantMsg2 = createAssistantMessageWithParts(
      { id: "msg_a2", time: { created: BASE_TIMESTAMP + 2000 } },
      { text: "A1 part 2" }
    )
    const userMsg2 = createUserMessageWithParts(
      { id: "msg_u2", time: { created: BASE_TIMESTAMP + 3000 } },
      "Q2"
    )
    const assistantMsg3 = createAssistantMessageWithParts(
      { id: "msg_a3", time: { created: BASE_TIMESTAMP + 4000 } },
      { text: "A2" }
    )

    const messages: MessageWithParts[] = [
      userMsg1,
      assistantMsg1,
      assistantMsg2,
      userMsg2,
      assistantMsg3,
    ]

    const result = paginateMessages(messages)

    // Should be 1 page since only 2 user messages
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(5) // All 5 messages in one page
  })
})

// =============================================================================
// PROMPTS_PER_PAGE constant
// =============================================================================

describe("PROMPTS_PER_PAGE", () => {
  test("is a positive number", () => {
    expect(PROMPTS_PER_PAGE).toBeGreaterThan(0)
  })

  test("is 5 (current configuration)", () => {
    expect(PROMPTS_PER_PAGE).toBe(5)
  })
})
