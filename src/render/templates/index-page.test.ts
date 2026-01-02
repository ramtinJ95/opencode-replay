/**
 * Tests for index page template rendering
 */

import { describe, test, expect } from "bun:test"
import { renderIndexPage, type IndexPageData, type SessionCardData } from "./index-page"
import { createSession, createProject } from "../../../tests/fixtures"

describe("renderIndexPage", () => {
  describe("basic structure", () => {
    test("renders complete index page", () => {
      const data: IndexPageData = {
        title: "All Sessions",
        sessions: [],
      }

      const html = renderIndexPage(data)

      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("All Sessions - OpenCode Replay")
      expect(html).toContain('class="index-page"')
    })

    test("includes title in header", () => {
      const data: IndexPageData = {
        title: "My Project Sessions",
        sessions: [],
      }

      const html = renderIndexPage(data)

      expect(html).toContain("<h1>My Project Sessions</h1>")
    })

    test("includes subtitle when provided", () => {
      const data: IndexPageData = {
        title: "Sessions",
        subtitle: "Last updated 5 minutes ago",
        sessions: [],
      }

      const html = renderIndexPage(data)

      expect(html).toContain("Last updated 5 minutes ago")
    })

    test("escapes HTML in title and subtitle", () => {
      const data: IndexPageData = {
        title: "<script>alert('title')</script>",
        subtitle: "<script>alert('sub')</script>",
        sessions: [],
      }

      const html = renderIndexPage(data)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("breadcrumbs", () => {
    test("renders breadcrumbs when provided", () => {
      const data: IndexPageData = {
        title: "Project Sessions",
        breadcrumbs: [
          { label: "All Projects", href: "/" },
          { label: "MyProject" },
        ],
        sessions: [],
      }

      const html = renderIndexPage(data)

      expect(html).toContain("All Projects")
      expect(html).toContain("MyProject")
    })

    test("omits breadcrumbs when empty", () => {
      const data: IndexPageData = {
        title: "Sessions",
        sessions: [],
      }

      const html = renderIndexPage(data)

      expect(html).not.toContain('<nav class="breadcrumbs">')
    })
  })

  describe("stats summary", () => {
    test("displays total session count", () => {
      const sessions: SessionCardData[] = [
        { session: createSession({ id: "ses_1" }) },
        { session: createSession({ id: "ses_2" }) },
        { session: createSession({ id: "ses_3" }) },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).toContain("Sessions")
      expect(html).toContain("3")
    })

    test("displays total message count", () => {
      const sessions: SessionCardData[] = [
        { session: createSession(), messageCount: 10 },
        { session: createSession(), messageCount: 20 },
        { session: createSession(), messageCount: 5 },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).toContain("Messages")
      expect(html).toContain("35")
    })

    test("omits messages stat when all counts are zero or undefined", () => {
      const sessions: SessionCardData[] = [
        { session: createSession() },
        { session: createSession(), messageCount: 0 },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).not.toContain("Messages")
    })

    test("displays total code changes", () => {
      const sessions: SessionCardData[] = [
        {
          session: createSession({
            summary: { additions: 100, deletions: 20, files: 5 },
          }),
        },
        {
          session: createSession({
            summary: { additions: 50, deletions: 30, files: 3 },
          }),
        },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).toContain("Changes")
      expect(html).toContain("+150")
      expect(html).toContain("-50")
    })

    test("omits changes when no changes", () => {
      const sessions: SessionCardData[] = [
        { session: createSession() },
        { session: createSession({ summary: {} }) },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).not.toContain("Changes")
    })
  })

  describe("session cards", () => {
    test("renders session cards", () => {
      const sessions: SessionCardData[] = [
        { session: createSession({ title: "First Session" }) },
        { session: createSession({ title: "Second Session" }) },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).toContain("First Session")
      expect(html).toContain("Second Session")
      expect(html).toContain('class="session-card"')
    })

    test("session card links to correct session", () => {
      const sessions: SessionCardData[] = [
        { session: createSession({ id: "ses_abc123", title: "Test" }) },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).toContain('href="sessions/ses_abc123/index.html"')
      expect(html).toContain('data-session-id="ses_abc123"')
    })

    test("session card shows title", () => {
      const sessions: SessionCardData[] = [
        { session: createSession({ title: "My Coding Session" }) },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).toContain('class="session-title"')
      expect(html).toContain("My Coding Session")
    })

    test("session card escapes HTML in title", () => {
      const sessions: SessionCardData[] = [
        { session: createSession({ title: "<script>alert('xss')</script>" }) },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("session card shows relative time", () => {
      const sessions: SessionCardData[] = [
        {
          session: createSession({
            time: { created: Date.now() - 3600000, updated: Date.now() - 3600000 },
          }),
        },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      // Should show something like "1 hour ago"
      expect(html).toContain("ago")
    })

    test("session card shows message count", () => {
      const sessions: SessionCardData[] = [
        { session: createSession(), messageCount: 42 },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).toContain("42 messages")
    })

    test("session card omits message count when undefined", () => {
      const sessions: SessionCardData[] = [
        { session: createSession() },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).not.toContain("messages")
    })

    test("session card shows project name in all-projects view", () => {
      const project = createProject({ name: "MyProject" })
      const sessions: SessionCardData[] = [
        { session: createSession(), project },
      ]

      const data: IndexPageData = {
        title: "All Sessions",
        sessions,
        isAllProjects: true,
      }

      const html = renderIndexPage(data)

      expect(html).toContain("MyProject")
    })

    test("session card omits project name in single-project view", () => {
      const project = createProject({ name: "MyProject" })
      const sessions: SessionCardData[] = [
        { session: createSession(), project },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
        isAllProjects: false,
      }

      const html = renderIndexPage(data)

      // Should not show project name in meta
      const metaMatches = html.match(/<div class="session-meta">[\s\S]*?MyProject[\s\S]*?<\/div>/g)
      expect(metaMatches).toBeNull()
    })

    test("session card shows first prompt preview", () => {
      const sessions: SessionCardData[] = [
        {
          session: createSession(),
          firstPrompt: "Hello, can you help me with this?",
        },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).toContain("Hello, can you help me with this?")
      expect(html).toContain('class="session-summary"')
    })

    test("session card truncates long prompt preview", () => {
      const longPrompt = "A".repeat(250)
      const sessions: SessionCardData[] = [
        { session: createSession(), firstPrompt: longPrompt },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      // Should be truncated to ~200 chars
      expect(html).not.toContain(longPrompt)
      expect(html).toContain("AAA")
    })

    test("session card escapes HTML in prompt preview", () => {
      const sessions: SessionCardData[] = [
        {
          session: createSession(),
          firstPrompt: "<script>alert('xss')</script>",
        },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("session card shows file change stats", () => {
      const sessions: SessionCardData[] = [
        {
          session: createSession({
            summary: { additions: 150, deletions: 42, files: 8 },
          }),
        },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).toContain('class="session-stats"')
      expect(html).toContain('+150')
      expect(html).toContain('-42')
      expect(html).toContain('8 files')
    })

    test("session card omits stats when no changes", () => {
      const sessions: SessionCardData[] = [
        { session: createSession() },
      ]

      const data: IndexPageData = {
        title: "Sessions",
        sessions,
      }

      const html = renderIndexPage(data)

      expect(html).not.toContain('class="session-stats"')
    })

    test("shows message when no sessions", () => {
      const data: IndexPageData = {
        title: "Sessions",
        sessions: [],
      }

      const html = renderIndexPage(data)

      expect(html).toContain("No sessions found")
    })
  })

  describe("assets path", () => {
    test("uses default assets path", () => {
      const data: IndexPageData = {
        title: "Sessions",
        sessions: [],
      }

      const html = renderIndexPage(data)

      expect(html).toContain('href="./assets/styles.css"')
    })

    test("uses custom assets path", () => {
      const data: IndexPageData = {
        title: "Sessions",
        sessions: [],
        assetsPath: "../../custom/assets",
      }

      const html = renderIndexPage(data)

      expect(html).toContain('href="../../custom/assets/styles.css"')
    })
  })
})
