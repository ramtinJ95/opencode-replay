/**
 * Tests for session page template rendering
 */

import { describe, test, expect } from "bun:test"
import { renderSessionPage, type SessionPageData, type TimelineEntry } from "./session"
import { createSession } from "../../../tests/fixtures"

describe("renderSessionPage", () => {
  describe("basic structure", () => {
    test("renders complete session page", () => {
      const data: SessionPageData = {
        session: createSession({ title: "Test Session" }),
        timeline: [],
        messageCount: 5,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("Test Session - OpenCode Replay")
      expect(html).toContain('class="session-page"')
    })

    test("includes session title in header", () => {
      const data: SessionPageData = {
        session: createSession({ title: "My Coding Session" }),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("<h1>My Coding Session</h1>")
    })

    test("shows session ID as subtitle", () => {
      const data: SessionPageData = {
        session: createSession({ id: "ses_abc123", title: "Test" }),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("Session ses_abc123")
    })

    test("escapes HTML in session title", () => {
      const data: SessionPageData = {
        session: createSession({ title: "<script>alert('xss')</script>" }),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("breadcrumbs", () => {
    test("includes breadcrumb navigation with default label", () => {
      const data: SessionPageData = {
        session: createSession({ title: "Test Session" }),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("Sessions")
      expect(html).toContain("Test Session")
    })

    test("uses custom project name in breadcrumbs", () => {
      const data: SessionPageData = {
        session: createSession({ title: "Test Session" }),
        projectName: "MyProject",
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("MyProject")
      expect(html).toContain('href="../../index.html"')
    })
  })

  describe("session stats", () => {
    test("displays message count", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 42,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("Messages")
      expect(html).toContain("42")
    })

    test("displays creation date", () => {
      const data: SessionPageData = {
        session: createSession({
          time: { created: 1705329000000, updated: 1705329000000 },
        }),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("Created")
      // Should contain a formatted date
      expect(html).toContain("2024")
    })

    test("displays duration when session was updated", () => {
      const data: SessionPageData = {
        session: createSession({
          time: {
            created: 1705329000000,
            updated: 1705329000000 + 3600000, // 1 hour later
          },
        }),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("Duration")
    })

    test("displays model when provided", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
        model: "claude-sonnet-4-20250514",
      }

      const html = renderSessionPage(data)

      expect(html).toContain("Model")
      expect(html).toContain("claude-sonnet-4-20250514")
    })

    test("displays token usage", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
        totalTokens: { input: 1500, output: 800 },
      }

      const html = renderSessionPage(data)

      expect(html).toContain("Tokens")
      expect(html).toContain("1.5k in")
      expect(html).toContain("800 out")
    })

    test("displays cost when provided", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
        totalCost: 0.0125,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("Cost")
      expect(html).toContain("$0.01")
    })

    test("omits cost when zero", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
        totalCost: 0,
      }

      const html = renderSessionPage(data)

      expect(html).not.toContain("Cost")
    })

    test("displays file changes from summary", () => {
      const data: SessionPageData = {
        session: createSession({
          summary: {
            additions: 150,
            deletions: 42,
            files: 8,
          },
        }),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("Changes")
      expect(html).toContain("+150")
      expect(html).toContain("-42")
      expect(html).toContain("Files")
      expect(html).toContain("8")
    })
  })

  describe("timeline", () => {
    test("displays timeline entries", () => {
      const timeline: TimelineEntry[] = [
        {
          promptNumber: 1,
          messageId: "msg_1",
          promptPreview: "Hello, can you help me?",
          timestamp: 1705329000000,
          toolCounts: { bash: 2, read: 3 },
          pageNumber: 1,
        },
        {
          promptNumber: 2,
          messageId: "msg_2",
          promptPreview: "Now do this other thing",
          timestamp: 1705329060000,
          toolCounts: {},
          pageNumber: 1,
        },
      ]

      const data: SessionPageData = {
        session: createSession(),
        timeline,
        messageCount: 4,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("<h2>Timeline</h2>")
      expect(html).toContain("Hello, can you help me?")
      expect(html).toContain("Now do this other thing")
    })

    test("timeline entry shows prompt number", () => {
      const timeline: TimelineEntry[] = [
        {
          promptNumber: 5,
          messageId: "msg_5",
          promptPreview: "Fifth prompt",
          timestamp: 1705329000000,
          toolCounts: {},
          pageNumber: 2,
        },
      ]

      const data: SessionPageData = {
        session: createSession(),
        timeline,
        messageCount: 10,
        pageCount: 2,
      }

      const html = renderSessionPage(data)

      expect(html).toContain('class="timeline-marker">5</div>')
    })

    test("timeline entry links to correct page", () => {
      const timeline: TimelineEntry[] = [
        {
          promptNumber: 1,
          messageId: "msg_abc123",
          promptPreview: "Test prompt",
          timestamp: 1705329000000,
          toolCounts: {},
          pageNumber: 3,
        },
      ]

      const data: SessionPageData = {
        session: createSession(),
        timeline,
        messageCount: 2,
        pageCount: 3,
      }

      const html = renderSessionPage(data)

      expect(html).toContain('href="page-003.html#msg_abc123"')
    })

    test("timeline entry shows tool counts", () => {
      const timeline: TimelineEntry[] = [
        {
          promptNumber: 1,
          messageId: "msg_1",
          promptPreview: "Test",
          timestamp: 1705329000000,
          toolCounts: { bash: 3, read: 2, write: 1 },
          pageNumber: 1,
        },
      ]

      const data: SessionPageData = {
        session: createSession(),
        timeline,
        messageCount: 2,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("3 bash")
      expect(html).toContain("2 read")
      expect(html).toContain("1 write")
    })

    test("timeline entry omits tools when none used", () => {
      const timeline: TimelineEntry[] = [
        {
          promptNumber: 1,
          messageId: "msg_1",
          promptPreview: "Test",
          timestamp: 1705329000000,
          toolCounts: {},
          pageNumber: 1,
        },
      ]

      const data: SessionPageData = {
        session: createSession(),
        timeline,
        messageCount: 2,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).not.toContain('class="timeline-stats"')
    })

    test("truncates long prompt previews", () => {
      const longPrompt = "A".repeat(200)
      const timeline: TimelineEntry[] = [
        {
          promptNumber: 1,
          messageId: "msg_1",
          promptPreview: longPrompt,
          timestamp: 1705329000000,
          toolCounts: {},
          pageNumber: 1,
        },
      ]

      const data: SessionPageData = {
        session: createSession(),
        timeline,
        messageCount: 2,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      // Should be truncated to ~150 chars
      expect(html).not.toContain(longPrompt)
      expect(html).toContain("AAA")
    })

    test("escapes HTML in prompt preview", () => {
      const timeline: TimelineEntry[] = [
        {
          promptNumber: 1,
          messageId: "msg_1",
          promptPreview: "<script>alert('xss')</script>",
          timestamp: 1705329000000,
          toolCounts: {},
          pageNumber: 1,
        },
      ]

      const data: SessionPageData = {
        session: createSession(),
        timeline,
        messageCount: 2,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("shows message when timeline is empty", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain("No messages in this session")
    })
  })

  describe("pagination", () => {
    test("shows pagination when multiple pages", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 100,
        pageCount: 5,
      }

      const html = renderSessionPage(data)

      expect(html).toContain('class="pagination"')
      expect(html).toContain('href="page-001.html"')
      expect(html).toContain('href="page-002.html"')
      expect(html).toContain('href="page-005.html"')
    })

    test("omits pagination for single page", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 10,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      // Should not have pagination nav element for page links
      const paginationMatches = html.match(/<nav class="pagination">/g)
      expect(paginationMatches).toBeNull()
    })

    test("pads page numbers with zeros", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 200,
        pageCount: 15,
      }

      const html = renderSessionPage(data)

      expect(html).toContain('href="page-001.html"')
      expect(html).toContain('href="page-010.html"')
      expect(html).toContain('href="page-015.html"')
    })
  })

  describe("assets path", () => {
    test("uses default assets path", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
      }

      const html = renderSessionPage(data)

      expect(html).toContain('href="../../assets/styles.css"')
    })

    test("uses custom assets path", () => {
      const data: SessionPageData = {
        session: createSession(),
        timeline: [],
        messageCount: 0,
        pageCount: 1,
        assetsPath: "../custom/assets",
      }

      const html = renderSessionPage(data)

      expect(html).toContain('href="../custom/assets/styles.css"')
    })
  })
})
