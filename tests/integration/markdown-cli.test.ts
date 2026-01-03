/**
 * Integration tests for markdown CLI features
 * Tests --format md, --stdout, and file output
 */

import { describe, test, expect } from "bun:test"
import { generateMarkdown, calculateSessionStats } from "../../src/render"
import {
  createSession,
  createConversation,
  createProject,
  createAssistantMessageWithParts,
  createUserMessageWithParts,
} from "../fixtures"

describe("Markdown CLI Integration", () => {
  describe("generateMarkdown", () => {
    test("generates markdown with header by default", () => {
      const session = createSession({ title: "Test Session" })
      const messages = createConversation([
        { userText: "Hello!", assistantText: "Hi there!" },
      ])
      const stats = calculateSessionStats(messages)

      const markdown = generateMarkdown({
        session,
        messages,
        projectName: "my-project",
        stats,
      })

      // Check header components
      expect(markdown).toContain("# Test Session")
      expect(markdown).toContain("**Session:** `ses_4957d04cdffeJwdujYPBCKpIsb`")
      expect(markdown).toContain("**Project:** my-project")
      expect(markdown).toContain("**Messages:** 2")

      // Check message content
      expect(markdown).toContain("### User")
      expect(markdown).toContain("Hello!")
      expect(markdown).toContain("### Assistant")
      expect(markdown).toContain("Hi there!")
    })

    test("generates markdown without header when includeHeader is false", () => {
      const session = createSession({ title: "Test Session" })
      const messages = createConversation([
        { userText: "Hello!", assistantText: "Hi there!" },
      ])
      const stats = calculateSessionStats(messages)

      const markdown = generateMarkdown({
        session,
        messages,
        stats,
        includeHeader: false,
      })

      // Should not have header
      expect(markdown).not.toContain("# Test Session")
      expect(markdown).not.toContain("**Session:**")

      // Should still have message content
      expect(markdown).toContain("### User")
      expect(markdown).toContain("Hello!")
    })

    test("includes cost and token stats in header", () => {
      const session = createSession()
      const messages = [
        createUserMessageWithParts({}, "Test prompt"),
        createAssistantMessageWithParts(
          {
            tokens: { input: 1000, output: 500, reasoning: 0, cache: { read: 0, write: 0 } },
            cost: 0.025,
          },
          { text: "Response" }
        ),
      ]
      const stats = calculateSessionStats(messages)

      const markdown = generateMarkdown({
        session,
        messages,
        stats,
      })

      expect(markdown).toContain("**Tokens:**")
      expect(markdown).toContain("**Cost:**")
    })

    test("handles empty messages", () => {
      const session = createSession()
      const messages: ReturnType<typeof createConversation> = []
      const stats = calculateSessionStats(messages)

      const markdown = generateMarkdown({
        session,
        messages,
        stats,
      })

      expect(markdown).toContain("# Test Session")
      expect(markdown).toContain("**Messages:** 0")
    })

    test("renders tool usage in assistant messages", () => {
      const session = createSession()
      const messages = [
        createUserMessageWithParts({}, "Run a command"),
        createAssistantMessageWithParts(
          {},
          {
            text: "I'll run that for you.",
            tools: [
              { tool: "bash", input: { command: "ls -la" }, output: "file1.txt\nfile2.txt" },
            ],
          }
        ),
      ]
      const stats = calculateSessionStats(messages)

      const markdown = generateMarkdown({
        session,
        messages,
        stats,
      })

      expect(markdown).toContain("**Bash:**")
      expect(markdown).toContain("ls -la")
      expect(markdown).toContain("file1.txt")
    })
  })

  describe("calculateSessionStats", () => {
    test("calculates correct stats for conversation", () => {
      const messages = createConversation([
        { userText: "First", assistantText: "Response 1" },
        { userText: "Second", assistantText: "Response 2" },
        { userText: "Third", assistantText: "Response 3" },
      ])

      const stats = calculateSessionStats(messages)

      expect(stats.messageCount).toBe(6) // 3 user + 3 assistant
      expect(stats.pageCount).toBe(1) // 3 prompts fits in 1 page (5 per page)
    })

    test("calculates multiple pages correctly", () => {
      // Create 6 exchanges = 6 user prompts = 2 pages (5 per page)
      const messages = createConversation([
        { userText: "1", assistantText: "R1" },
        { userText: "2", assistantText: "R2" },
        { userText: "3", assistantText: "R3" },
        { userText: "4", assistantText: "R4" },
        { userText: "5", assistantText: "R5" },
        { userText: "6", assistantText: "R6" },
      ])

      const stats = calculateSessionStats(messages)

      expect(stats.messageCount).toBe(12)
      expect(stats.pageCount).toBe(2)
    })

    test("aggregates tokens from assistant messages", () => {
      const messages = [
        createUserMessageWithParts({}, "Prompt 1"),
        createAssistantMessageWithParts(
          { tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } } },
          { text: "Response 1" }
        ),
        createUserMessageWithParts({ id: "msg_user_2" }, "Prompt 2"),
        createAssistantMessageWithParts(
          {
            id: "msg_asst_2",
            tokens: { input: 200, output: 100, reasoning: 0, cache: { read: 0, write: 0 } },
          },
          { text: "Response 2" }
        ),
      ]

      const stats = calculateSessionStats(messages)

      expect(stats.totalTokensInput).toBe(300)
      expect(stats.totalTokensOutput).toBe(150)
    })

    test("aggregates cost from assistant messages", () => {
      const messages = [
        createUserMessageWithParts({}, "Prompt"),
        createAssistantMessageWithParts({ cost: 0.01 }, { text: "R1" }),
        createUserMessageWithParts({ id: "msg_user_2" }, "Prompt 2"),
        createAssistantMessageWithParts({ id: "msg_asst_2", cost: 0.02 }, { text: "R2" }),
      ]

      const stats = calculateSessionStats(messages)

      expect(stats.totalCost).toBeCloseTo(0.03)
    })
  })
})
