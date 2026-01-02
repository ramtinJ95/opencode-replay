/**
 * Tests for conversation page template rendering
 */

import { describe, test, expect } from "bun:test"
import { renderConversationPage, type ConversationPageData } from "./page"
import { createSession, createUserMessageWithParts, createAssistantMessageWithParts } from "../../../tests/fixtures"

describe("renderConversationPage", () => {
  describe("basic structure", () => {
    test("renders complete conversation page", () => {
      const data: ConversationPageData = {
        session: createSession({ title: "Test Session" }),
        messages: [],
        pageNumber: 1,
        totalPages: 1,
      }

      const html = renderConversationPage(data)

      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("Test Session - Page 1 - OpenCode Replay")
      expect(html).toContain('class="conversation-page"')
    })

    test("includes session title in header", () => {
      const data: ConversationPageData = {
        session: createSession({ title: "My Session" }),
        messages: [],
        pageNumber: 1,
        totalPages: 1,
      }

      const html = renderConversationPage(data)

      expect(html).toContain("<h1>My Session</h1>")
    })

    test("shows page number in subtitle", () => {
      const data: ConversationPageData = {
        session: createSession({ title: "Test" }),
        messages: [],
        pageNumber: 3,
        totalPages: 10,
      }

      const html = renderConversationPage(data)

      expect(html).toContain("Page 3 of 10")
    })

    test("escapes HTML in session title", () => {
      const data: ConversationPageData = {
        session: createSession({ title: "<script>alert('xss')</script>" }),
        messages: [],
        pageNumber: 1,
        totalPages: 1,
      }

      const html = renderConversationPage(data)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("breadcrumbs", () => {
    test("includes breadcrumb navigation", () => {
      const data: ConversationPageData = {
        session: createSession({ title: "Test Session" }),
        messages: [],
        pageNumber: 1,
        totalPages: 1,
      }

      const html = renderConversationPage(data)

      expect(html).toContain("Sessions")
      expect(html).toContain("Test Session")
      expect(html).toContain("Page 1")
      expect(html).toContain('href="../../index.html"')
      expect(html).toContain('href="index.html"')
    })

    test("uses custom project name in breadcrumbs", () => {
      const data: ConversationPageData = {
        session: createSession({ title: "Test" }),
        projectName: "MyProject",
        messages: [],
        pageNumber: 1,
        totalPages: 1,
      }

      const html = renderConversationPage(data)

      expect(html).toContain("MyProject")
    })
  })

  describe("messages rendering", () => {
    test("renders messages", () => {
      const messages = [
        createUserMessageWithParts({}, "Hello, how are you?"),
        createAssistantMessageWithParts({}, { text: "I am doing well!" }),
      ]

      const data: ConversationPageData = {
        session: createSession(),
        messages,
        pageNumber: 1,
        totalPages: 1,
      }

      const html = renderConversationPage(data)

      expect(html).toContain("Hello, how are you?")
      expect(html).toContain("I am doing well!")
    })

    test("renders empty page when no messages", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 1,
        totalPages: 1,
      }

      const html = renderConversationPage(data)

      // Should still render the page structure
      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain('class="conversation-page"')
    })
  })

  describe("pagination", () => {
    test("shows pagination on both top and bottom", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 2,
        totalPages: 5,
      }

      const html = renderConversationPage(data)

      // Should have two pagination sections
      const paginationMatches = html.match(/<nav class="pagination">/g)
      expect(paginationMatches?.length).toBe(2)
    })

    test("omits pagination for single page", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 1,
        totalPages: 1,
      }

      const html = renderConversationPage(data)

      expect(html).not.toContain('class="pagination"')
    })

    test("shows previous link when not on first page", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 3,
        totalPages: 5,
      }

      const html = renderConversationPage(data)

      expect(html).toContain('href="page-002.html"')
      expect(html).toContain('class="pagination-prev"')
      expect(html).toContain("Previous")
    })

    test("disables previous link on first page", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 1,
        totalPages: 5,
      }

      const html = renderConversationPage(data)

      expect(html).toContain('class="pagination-prev disabled"')
      expect(html).not.toMatch(/pagination-prev"[^>]*href=/)
    })

    test("shows next link when not on last page", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 3,
        totalPages: 5,
      }

      const html = renderConversationPage(data)

      expect(html).toContain('href="page-004.html"')
      expect(html).toContain('class="pagination-next"')
      expect(html).toContain("Next")
    })

    test("disables next link on last page", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 5,
        totalPages: 5,
      }

      const html = renderConversationPage(data)

      expect(html).toContain('class="pagination-next disabled"')
      expect(html).not.toMatch(/pagination-next"[^>]*href=/)
    })

    test("highlights current page number", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 3,
        totalPages: 5,
      }

      const html = renderConversationPage(data)

      expect(html).toContain('class="pagination-page current">3</span>')
    })

    test("pads page numbers with zeros in filenames", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 5,
        totalPages: 10,
      }

      const html = renderConversationPage(data)

      expect(html).toContain('href="page-001.html"')
      expect(html).toContain('href="page-004.html"')
      expect(html).toContain('href="page-006.html"')
    })

    test("shows all page numbers when 7 or fewer pages", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 3,
        totalPages: 7,
      }

      const html = renderConversationPage(data)

      // Should show pages 1-7
      expect(html).toContain(">1</")
      expect(html).toContain(">2</")
      expect(html).toContain(">3</")
      expect(html).toContain(">4</")
      expect(html).toContain(">5</")
      expect(html).toContain(">6</")
      expect(html).toContain(">7</")
      // Should not have ellipsis
      expect(html).not.toContain("&hellip;")
    })

    test("uses ellipsis for many pages near beginning", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 1,
        totalPages: 20,
      }

      const html = renderConversationPage(data)

      // Should show: 1, 2, ..., 20
      expect(html).toContain(">1</")
      expect(html).toContain(">2</")
      expect(html).toContain(">20</")
      expect(html).toContain("&hellip;")
    })

    test("uses ellipsis for many pages in middle", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 10,
        totalPages: 20,
      }

      const html = renderConversationPage(data)

      // Should show: 1, ..., 9, 10, 11, ..., 20
      expect(html).toContain(">1</")
      expect(html).toContain(">9</")
      expect(html).toContain(">10</")
      expect(html).toContain(">11</")
      expect(html).toContain(">20</")
      
      // Should have two ellipses
      const ellipsisMatches = html.match(/&hellip;/g)
      expect(ellipsisMatches?.length).toBeGreaterThanOrEqual(2)
    })

    test("uses ellipsis for many pages near end", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 20,
        totalPages: 20,
      }

      const html = renderConversationPage(data)

      // Should show: 1, ..., 19, 20
      expect(html).toContain(">1</")
      expect(html).toContain(">19</")
      expect(html).toContain(">20</")
      expect(html).toContain("&hellip;")
    })

    test("shows window around current page", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 15,
        totalPages: 30,
      }

      const html = renderConversationPage(data)

      // Should show window of pages around 15
      expect(html).toContain(">14</")
      expect(html).toContain(">15</")
      expect(html).toContain(">16</")
    })
  })

  describe("assets path", () => {
    test("uses default assets path", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 1,
        totalPages: 1,
      }

      const html = renderConversationPage(data)

      expect(html).toContain('href="../../assets/styles.css"')
    })

    test("uses custom assets path", () => {
      const data: ConversationPageData = {
        session: createSession(),
        messages: [],
        pageNumber: 1,
        totalPages: 1,
        assetsPath: "../custom/path/assets",
      }

      const html = renderConversationPage(data)

      expect(html).toContain('href="../custom/path/assets/styles.css"')
    })
  })
})
