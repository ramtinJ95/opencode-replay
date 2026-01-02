/**
 * Tests for base template rendering
 */

import { describe, test, expect } from "bun:test"
import { renderBasePage, renderHeader, renderFooter } from "./base"

describe("renderBasePage", () => {
  describe("basic structure", () => {
    test("renders complete HTML structure", () => {
      const html = renderBasePage({
        title: "Test Page",
        content: "<main>Content</main>",
      })

      expect(html).toContain("<!DOCTYPE html>")
      expect(html).toContain("<html lang=\"en\">")
      expect(html).toContain("<head>")
      expect(html).toContain("<body>")
      expect(html).toContain("</html>")
    })

    test("includes required meta tags", () => {
      const html = renderBasePage({
        title: "Test Page",
        content: "",
      })

      expect(html).toContain('<meta charset="UTF-8">')
      expect(html).toContain('<meta name="viewport"')
      expect(html).toContain('<meta name="generator" content="opencode-replay">')
      expect(html).toContain('<meta name="color-scheme" content="light dark">')
    })

    test("renders title with suffix", () => {
      const html = renderBasePage({
        title: "My Session",
        content: "",
      })

      expect(html).toContain("<title>My Session - OpenCode Replay</title>")
    })

    test("escapes HTML in title", () => {
      const html = renderBasePage({
        title: "<script>alert('xss')</script>",
        content: "",
      })

      // The title should be escaped (though FOUC script tags will exist)
      expect(html).toContain("<title>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; - OpenCode Replay</title>")
    })

    test("renders content in container", () => {
      const html = renderBasePage({
        title: "Test",
        content: "<main>Hello World</main>",
      })

      expect(html).toContain('<div class="container">')
      expect(html).toContain("<main>Hello World</main>")
    })
  })

  describe("assets path", () => {
    test("uses default assets path", () => {
      const html = renderBasePage({
        title: "Test",
        content: "",
      })

      expect(html).toContain('href="./assets/styles.css"')
      expect(html).toContain('href="./assets/prism.css"')
      expect(html).toContain('src="./assets/theme.js"')
      expect(html).toContain('src="./assets/highlight.js"')
      expect(html).toContain('src="./assets/search.js"')
    })

    test("uses custom assets path", () => {
      const html = renderBasePage({
        title: "Test",
        content: "",
        assetsPath: "../../assets",
      })

      expect(html).toContain('href="../../assets/styles.css"')
      expect(html).toContain('href="../../assets/prism.css"')
      expect(html).toContain('src="../../assets/theme.js"')
    })
  })

  describe("optional features", () => {
    test("includes extra head content", () => {
      const html = renderBasePage({
        title: "Test",
        content: "",
        headExtra: '<meta name="author" content="John Doe">',
      })

      expect(html).toContain('<meta name="author" content="John Doe">')
    })

    test("adds body class when provided", () => {
      const html = renderBasePage({
        title: "Test",
        content: "",
        bodyClass: "session-page dark-mode",
      })

      expect(html).toContain('<body class="session-page dark-mode">')
    })

    test("omits class attribute when no bodyClass", () => {
      const html = renderBasePage({
        title: "Test",
        content: "",
      })

      expect(html).toMatch(/<body>/)
      expect(html).not.toMatch(/<body class=""/)
    })
  })

  describe("FOUC prevention", () => {
    test("includes FOUC prevention script in head", () => {
      const html = renderBasePage({
        title: "Test",
        content: "",
      })

      expect(html).toContain("opencode-replay-theme")
      expect(html).toContain("localStorage.getItem")
      expect(html).toContain("prefers-color-scheme: dark")
      expect(html).toContain("data-theme")
    })

    test("FOUC script appears before CSS", () => {
      const html = renderBasePage({
        title: "Test",
        content: "",
      })

      const scriptIndex = html.indexOf("opencode-replay-theme")
      const cssIndex = html.indexOf("styles.css")

      expect(scriptIndex).toBeGreaterThan(0)
      expect(cssIndex).toBeGreaterThan(scriptIndex)
    })
  })
})

describe("renderHeader", () => {
  describe("basic rendering", () => {
    test("renders title", () => {
      const html = renderHeader({
        title: "Session Overview",
      })

      expect(html).toContain("<h1>Session Overview</h1>")
      expect(html).toContain('class="page-header"')
    })

    test("escapes HTML in title", () => {
      const html = renderHeader({
        title: "<script>alert('xss')</script>",
      })

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })

    test("renders subtitle when provided", () => {
      const html = renderHeader({
        title: "Session",
        subtitle: "Created 2 hours ago",
      })

      expect(html).toContain('<p class="subtitle">Created 2 hours ago</p>')
    })

    test("escapes HTML in subtitle", () => {
      const html = renderHeader({
        title: "Test",
        subtitle: "<b>Bold</b>",
      })

      expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt;")
    })

    test("omits subtitle when not provided", () => {
      const html = renderHeader({
        title: "Test",
      })

      expect(html).not.toContain('<p class="subtitle">')
    })
  })

  describe("breadcrumbs", () => {
    test("renders breadcrumb navigation", () => {
      const html = renderHeader({
        title: "Test",
        breadcrumbs: [
          { label: "Home", href: "/" },
          { label: "Sessions", href: "/sessions" },
          { label: "Current" },
        ],
      })

      expect(html).toContain('<nav class="breadcrumbs">')
      expect(html).toContain('<a href="/" class="breadcrumb-item">Home</a>')
      expect(html).toContain('<a href="/sessions" class="breadcrumb-item">Sessions</a>')
      expect(html).toContain('<span class="breadcrumb-item current">Current</span>')
    })

    test("uses separators between breadcrumbs", () => {
      const html = renderHeader({
        title: "Test",
        breadcrumbs: [
          { label: "A", href: "/a" },
          { label: "B" },
        ],
      })

      expect(html).toContain('<span class="breadcrumb-separator">/</span>')
    })

    test("last breadcrumb is not a link", () => {
      const html = renderHeader({
        title: "Test",
        breadcrumbs: [
          { label: "First", href: "/first" },
          { label: "Last", href: "/last" },
        ],
      })

      expect(html).toContain('<span class="breadcrumb-item current">Last</span>')
      expect(html).not.toContain('href="/last"')
    })

    test("escapes breadcrumb labels", () => {
      const html = renderHeader({
        title: "Test",
        breadcrumbs: [{ label: "<script>", href: "/" }],
      })

      expect(html).toContain("&lt;script&gt;")
    })

    test("validates and escapes href URLs", () => {
      const html = renderHeader({
        title: "Test",
        breadcrumbs: [
          { label: "Safe", href: "/path/to/page" },
          { label: "Middle", href: "javascript:alert('xss')" },
          { label: "Last" },
        ],
      })

      expect(html).toContain('href="/path/to/page"')
      expect(html).toContain('href="#"')
      expect(html).not.toContain("javascript:")
    })

    test("omits breadcrumbs when empty", () => {
      const html = renderHeader({
        title: "Test",
        breadcrumbs: [],
      })

      expect(html).not.toContain('<nav class="breadcrumbs">')
    })
  })

  describe("search and theme toggle", () => {
    test("shows search trigger by default", () => {
      const html = renderHeader({
        title: "Test",
      })

      expect(html).toContain('class="search-trigger"')
      expect(html).toContain("Search...")
      expect(html).toContain("<kbd>Ctrl+K</kbd>")
    })

    test("shows theme toggle by default", () => {
      const html = renderHeader({
        title: "Test",
      })

      expect(html).toContain('id="theme-toggle"')
      expect(html).toContain('class="theme-toggle"')
      expect(html).toContain('aria-label="Toggle dark mode"')
    })

    test("theme toggle includes sun and moon icons", () => {
      const html = renderHeader({
        title: "Test",
      })

      expect(html).toContain('class="icon-sun"')
      expect(html).toContain('class="icon-moon"')
    })

    test("hides search when showSearch is false", () => {
      const html = renderHeader({
        title: "Test",
        showSearch: false,
      })

      expect(html).not.toContain('class="search-trigger"')
    })

    test("hides theme toggle when showThemeToggle is false", () => {
      const html = renderHeader({
        title: "Test",
        showThemeToggle: false,
      })

      expect(html).not.toContain('id="theme-toggle"')
    })

    test("omits header-actions when both disabled", () => {
      const html = renderHeader({
        title: "Test",
        showSearch: false,
        showThemeToggle: false,
      })

      expect(html).not.toContain('class="header-actions"')
    })
  })
})

describe("renderFooter", () => {
  test("renders footer with link", () => {
    const html = renderFooter()

    expect(html).toContain('<footer class="page-footer">')
    expect(html).toContain("Generated by")
    expect(html).toContain('<a href="https://github.com/opencode-replay"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener"')
    expect(html).toContain("opencode-replay</a>")
  })

  test("footer link is safe", () => {
    const html = renderFooter()

    expect(html).toContain('rel="noopener"')
  })
})
