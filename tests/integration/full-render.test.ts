/**
 * Integration tests for full rendering pipeline
 * Tests end-to-end HTML generation from session data
 */

import { describe, test, expect } from "bun:test"
import {
  renderIndexPage,
  renderSessionPage,
  renderConversationPage,
  type SessionCardData,
  type TimelineEntry,
} from "../../src/render/templates"
import {
  buildTimeline,
  paginateMessages,
  getFirstPrompt,
  countTools,
} from "../../src/render/html"
import {
  createProject,
  createSession,
  createUserMessageWithParts,
  createAssistantMessageWithParts,
  createConversation,
  createToolPart,
  BASE_TIMESTAMP,
} from "../fixtures"
import type { MessageWithParts } from "../../src/storage/types"

describe("Full Rendering Pipeline", () => {
  describe("getFirstPrompt", () => {
    test("extracts first user prompt from messages", () => {
      const messages = createConversation([
        { userText: "Hello, can you help me?", assistantText: "Sure!" },
        { userText: "Another question", assistantText: "Here's the answer" },
      ])

      const firstPrompt = getFirstPrompt(messages)

      expect(firstPrompt).toBe("Hello, can you help me?")
    })

    test("returns undefined for empty messages", () => {
      const firstPrompt = getFirstPrompt([])

      expect(firstPrompt).toBeUndefined()
    })

    test("returns undefined when no user messages", () => {
      const messages: MessageWithParts[] = [
        createAssistantMessageWithParts({}, { text: "System message" }),
      ]

      const firstPrompt = getFirstPrompt(messages)

      expect(firstPrompt).toBeUndefined()
    })
  })

  describe("countTools", () => {
    test("counts tool parts by type", () => {
      const parts = [
        createToolPart({ tool: "bash" }),
        createToolPart({ tool: "read" }),
        createToolPart({ tool: "bash" }),
        createToolPart({ tool: "edit" }),
      ]

      const counts = countTools(parts)

      expect(counts).toEqual({
        bash: 2,
        read: 1,
        edit: 1,
      })
    })

    test("returns empty object for no tool parts", () => {
      const counts = countTools([])

      expect(counts).toEqual({})
    })
  })

  describe("buildTimeline", () => {
    test("builds timeline from conversation", () => {
      const messages = createConversation([
        { userText: "First prompt", assistantText: "First response" },
        { userText: "Second prompt", assistantText: "Second response" },
      ])

      const timeline = buildTimeline(messages)

      expect(timeline).toHaveLength(2)
      expect(timeline[0]?.promptNumber).toBe(1)
      expect(timeline[0]?.promptPreview).toBe("First prompt")
      expect(timeline[0]?.pageNumber).toBe(1)
      expect(timeline[1]?.promptNumber).toBe(2)
      expect(timeline[1]?.promptPreview).toBe("Second prompt")
    })

    test("calculates page numbers correctly", () => {
      // Create enough prompts to span multiple pages
      const exchanges = Array.from({ length: 12 }, (_, i) => ({
        userText: `Prompt ${i + 1}`,
        assistantText: `Response ${i + 1}`,
      }))
      const messages = createConversation(exchanges)

      const timeline = buildTimeline(messages)

      expect(timeline).toHaveLength(12)
      // With PROMPTS_PER_PAGE = 5:
      // Prompts 1-5 -> page 1
      // Prompts 6-10 -> page 2
      // Prompts 11-12 -> page 3
      expect(timeline[0]?.pageNumber).toBe(1)
      expect(timeline[4]?.pageNumber).toBe(1)
      expect(timeline[5]?.pageNumber).toBe(2)
      expect(timeline[9]?.pageNumber).toBe(2)
      expect(timeline[10]?.pageNumber).toBe(3)
    })

    test("includes tool counts from assistant responses", () => {
      const userMsg = createUserMessageWithParts({ id: "user1" }, "Do something")
      const assistantMsg = createAssistantMessageWithParts(
        { id: "assistant1", parentID: "user1" },
        { tools: [{ tool: "bash" }, { tool: "bash" }, { tool: "read" }] }
      )

      const messages = [userMsg, assistantMsg]
      const timeline = buildTimeline(messages)

      expect(timeline).toHaveLength(1)
      expect(timeline[0]?.toolCounts).toEqual({ bash: 2, read: 1 })
    })

    test("returns empty timeline for no user messages", () => {
      const messages: MessageWithParts[] = []

      const timeline = buildTimeline(messages)

      expect(timeline).toEqual([])
    })
  })

  describe("paginateMessages", () => {
    test("groups messages by user prompts", () => {
      const messages = createConversation([
        { userText: "Prompt 1", assistantText: "Response 1" },
        { userText: "Prompt 2", assistantText: "Response 2" },
      ])

      const pages = paginateMessages(messages)

      expect(pages).toHaveLength(1) // Both fit in one page (PROMPTS_PER_PAGE = 5)
      expect(pages[0]).toHaveLength(4) // 2 user + 2 assistant messages
    })

    test("splits into multiple pages when exceeding limit", () => {
      // Create 7 prompts (should split into 2 pages)
      const exchanges = Array.from({ length: 7 }, (_, i) => ({
        userText: `Prompt ${i + 1}`,
        assistantText: `Response ${i + 1}`,
      }))
      const messages = createConversation(exchanges)

      const pages = paginateMessages(messages)

      expect(pages).toHaveLength(2)
      // First page: 5 prompts = 10 messages
      expect(pages[0]).toHaveLength(10)
      // Second page: 2 prompts = 4 messages
      expect(pages[1]).toHaveLength(4)
    })

    test("handles empty messages array", () => {
      const pages = paginateMessages([])

      expect(pages).toEqual([])
    })

    test("keeps assistant messages with their preceding user message", () => {
      const messages = createConversation([
        { userText: "First", assistantText: "Reply 1" },
      ])
      // Add more assistant responses (simulating follow-up)
      messages.push(
        createAssistantMessageWithParts({}, { text: "Additional reply" })
      )

      const pages = paginateMessages(messages)

      expect(pages).toHaveLength(1)
      expect(pages[0]).toHaveLength(3)
    })
  })

  describe("renderIndexPage integration", () => {
    test("renders complete index page with sessions", () => {
      const project = createProject({ name: "test-project" })
      const session = createSession({ title: "Test Session" })
      const sessions: SessionCardData[] = [
        {
          session,
          project,
          messageCount: 10,
          firstPrompt: "Hello, can you help me with testing?",
        },
      ]

      const html = renderIndexPage({
        title: "Test Sessions",
        sessions,
        isAllProjects: false,
        assetsPath: "./assets",
      })

      // Check page structure
      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("<html")
      expect(html).toContain("</html>")

      // Check title
      expect(html).toContain("<title>Test Sessions")

      // Check session card
      expect(html).toContain("Test Session")
      expect(html).toContain("10 messages")
      expect(html).toContain("Hello, can you help me with testing?")

      // Check assets
      expect(html).toContain("./assets/styles.css")
    })

    test("renders all-projects view with project names", () => {
      const project1 = createProject({ name: "project-one", id: "proj1" })
      const project2 = createProject({ name: "project-two", id: "proj2" })
      const session1 = createSession({ id: "ses1", projectID: "proj1" })
      const session2 = createSession({ id: "ses2", projectID: "proj2" })

      const sessions: SessionCardData[] = [
        { session: session1, project: project1, messageCount: 5 },
        { session: session2, project: project2, messageCount: 3 },
      ]

      const html = renderIndexPage({
        title: "All Projects",
        sessions,
        isAllProjects: true,
        assetsPath: "./assets",
      })

      expect(html).toContain("project-one")
      expect(html).toContain("project-two")
    })

    test("renders empty state when no sessions", () => {
      const html = renderIndexPage({
        title: "Empty",
        sessions: [],
        isAllProjects: false,
        assetsPath: "./assets",
      })

      expect(html).toContain("No sessions found")
    })
  })

  describe("renderSessionPage integration", () => {
    test("renders complete session page with timeline", () => {
      const session = createSession({
        title: "Debug Session",
        time: { created: BASE_TIMESTAMP, updated: BASE_TIMESTAMP + 3600000 },
      })
      const timeline: TimelineEntry[] = [
        {
          promptNumber: 1,
          messageId: "msg1",
          promptPreview: "First question about debugging",
          timestamp: BASE_TIMESTAMP,
          toolCounts: { bash: 2, read: 1 },
          pageNumber: 1,
        },
        {
          promptNumber: 2,
          messageId: "msg2",
          promptPreview: "Follow-up question",
          timestamp: BASE_TIMESTAMP + 60000,
          toolCounts: {},
          pageNumber: 1,
        },
      ]

      const html = renderSessionPage({
        session,
        projectName: "my-project",
        timeline,
        messageCount: 10,
        totalTokens: { input: 5000, output: 2000 },
        totalCost: 0.025,
        pageCount: 1,
        model: "claude-sonnet-4-20250514",
        assetsPath: "../../assets",
      })

      // Check page structure
      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("Debug Session")

      // Check stats
      expect(html).toContain("10") // message count
      expect(html).toContain("5.0k") // input tokens or similar
      expect(html).toContain("$0.025") // cost

      // Check timeline
      expect(html).toContain("First question about debugging")
      expect(html).toContain("Follow-up question")
      expect(html).toContain("bash") // tool count
    })

    test("renders session page without optional fields", () => {
      const session = createSession({ title: "Minimal Session" })

      const html = renderSessionPage({
        session,
        timeline: [],
        messageCount: 0,
        pageCount: 0,
        assetsPath: "../../assets",
      })

      expect(html).toContain("Minimal Session")
      // Should not crash with missing optional fields
      expect(html).toContain("<!DOCTYPE html>")
    })
  })

  describe("renderConversationPage integration", () => {
    test("renders complete conversation page with messages", () => {
      const session = createSession({ title: "Conversation Test" })
      const messages = createConversation([
        { userText: "Can you help me write a function?", assistantText: "Of course! What kind of function do you need?" },
      ])

      const html = renderConversationPage({
        session,
        messages,
        pageNumber: 1,
        totalPages: 1,
        assetsPath: "../../assets",
      })

      // Check page structure
      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("Conversation Test")

      // Check messages
      expect(html).toContain("Can you help me write a function?")
      expect(html).toContain("Of course! What kind of function do you need?")
    })

    test("renders pagination for multiple pages", () => {
      const session = createSession()
      const messages = createConversation([
        { userText: "Test", assistantText: "Reply" },
      ])

      const html = renderConversationPage({
        session,
        messages,
        pageNumber: 2,
        totalPages: 5,
        assetsPath: "../../assets",
      })

      // Check pagination
      expect(html).toContain('class="pagination"')
      expect(html).toContain("Previous")
      expect(html).toContain("Next")
      expect(html).toContain("page-001.html") // Link to page 1
      expect(html).toContain("page-003.html") // Link to page 3
    })

    test("disables Previous on first page", () => {
      const session = createSession()
      const messages = createConversation([
        { userText: "Test", assistantText: "Reply" },
      ])

      const html = renderConversationPage({
        session,
        messages,
        pageNumber: 1,
        totalPages: 3,
        assetsPath: "../../assets",
      })

      expect(html).toContain('class="pagination-prev disabled"')
    })

    test("disables Next on last page", () => {
      const session = createSession()
      const messages = createConversation([
        { userText: "Test", assistantText: "Reply" },
      ])

      const html = renderConversationPage({
        session,
        messages,
        pageNumber: 3,
        totalPages: 3,
        assetsPath: "../../assets",
      })

      expect(html).toContain('class="pagination-next disabled"')
    })
  })

  describe("cross-template consistency", () => {
    test("asset paths resolve correctly at different depths", () => {
      const session = createSession()
      const project = createProject()

      // Index at root level
      const indexHtml = renderIndexPage({
        title: "Test",
        sessions: [{ session, project, messageCount: 1 }],
        isAllProjects: false,
        assetsPath: "./assets",
      })
      expect(indexHtml).toContain("./assets/styles.css")

      // Session at sessions/[id]/ level
      const sessionHtml = renderSessionPage({
        session,
        timeline: [],
        messageCount: 1,
        pageCount: 1,
        assetsPath: "../../assets",
      })
      expect(sessionHtml).toContain("../../assets/styles.css")
    })

    test("breadcrumbs navigate correctly", () => {
      const session = createSession({ title: "Test Session" })
      const messages = createConversation([
        { userText: "Test", assistantText: "Reply" },
      ])

      const html = renderConversationPage({
        session,
        projectName: "my-project",
        messages,
        pageNumber: 1,
        totalPages: 1,
        assetsPath: "../../assets",
      })

      // Check breadcrumb links
      expect(html).toContain('href="../../index.html"') // Back to index
      expect(html).toContain('href="index.html"') // Back to session
      expect(html).toContain("my-project")
    })
  })

  describe("tool rendering in messages", () => {
    test("renders various tool types without errors", () => {
      const session = createSession()
      const userMsg = createUserMessageWithParts({}, "Run some commands")

      // Create assistant message with various tools
      const assistantMsg = createAssistantMessageWithParts(
        {},
        {
          text: "I'll run some commands for you.",
          tools: [
            { tool: "bash", output: "file1.ts\nfile2.ts" },
            { tool: "read", output: "const x = 1;" },
            { tool: "edit" },
            { tool: "write" },
            { tool: "glob" },
            { tool: "grep" },
          ],
        }
      )

      const html = renderConversationPage({
        session,
        messages: [userMsg, assistantMsg],
        pageNumber: 1,
        totalPages: 1,
        assetsPath: "../../assets",
      })

      // Should render without errors
      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("tool-call")
    })
  })

  describe("HTML safety across all templates", () => {
    test("escapes HTML in session title", () => {
      const session = createSession({
        title: "<script>alert('xss')</script>",
      })

      const html = renderSessionPage({
        session,
        timeline: [],
        messageCount: 0,
        pageCount: 0,
        assetsPath: "../../assets",
      })

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("escapes HTML in user message", () => {
      const session = createSession()
      const messages = createConversation([
        {
          userText: "<img src=x onerror=alert('xss')>",
          assistantText: "Safe response",
        },
      ])

      const html = renderConversationPage({
        session,
        messages,
        pageNumber: 1,
        totalPages: 1,
        assetsPath: "../../assets",
      })

      expect(html).not.toContain("<img src=x onerror")
    })

    test("escapes HTML in project name", () => {
      const project = createProject({
        name: "<script>evil()</script>",
      })
      const session = createSession()

      const html = renderIndexPage({
        title: "Test",
        sessions: [{ session, project, messageCount: 1 }],
        isAllProjects: true,
        assetsPath: "./assets",
      })

      expect(html).not.toContain("<script>evil()")
    })
  })

  describe("edge cases", () => {
    test("handles very long prompt text", () => {
      const longText = "A".repeat(500)
      const session = createSession()
      const messages = createConversation([
        { userText: longText, assistantText: "Response" },
      ])

      const html = renderConversationPage({
        session,
        messages,
        pageNumber: 1,
        totalPages: 1,
        assetsPath: "../../assets",
      })

      // Should render without issues
      expect(html).toContain("<!DOCTYPE html>")
    })

    test("handles session with many pages", () => {
      const session = createSession()
      const messages = createConversation([
        { userText: "Test", assistantText: "Reply" },
      ])

      const html = renderConversationPage({
        session,
        messages,
        pageNumber: 50,
        totalPages: 100,
        assetsPath: "../../assets",
      })

      // Should render pagination with ellipsis
      expect(html).toContain("...")
    })

    test("handles unicode in content", () => {
      const session = createSession({ title: "日本語セッション" })
      const messages = createConversation([
        { userText: "你好，世界！", assistantText: "Привет мир! 🌍" },
      ])

      const html = renderConversationPage({
        session,
        messages,
        pageNumber: 1,
        totalPages: 1,
        assetsPath: "../../assets",
      })

      expect(html).toContain("日本語セッション")
      expect(html).toContain("你好，世界！")
      expect(html).toContain("Привет мир!")
    })
  })
})
