/**
 * WebFetch tool renderer tests
 * Tests URL safety, truncateUrl, format badges, and content display
 */

import { describe, test, expect } from "bun:test"
import { renderWebFetchTool } from "./webfetch"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderWebFetchTool", () => {
  describe("basic rendering", () => {
    test("renders with tool-webfetch class", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('class="tool-call tool-webfetch"')
    })

    test("renders with correct data-status attribute", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("renders globe icon", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
        },
      })

      const html = renderWebFetchTool(part)

      // Globe icon: 🌐 (&#127760;)
      expect(html).toContain("&#127760;")
    })

    test("renders toggle button", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('class="tool-toggle"')
    })
  })

  describe("URL rendering", () => {
    test("renders URL as clickable link for safe URLs", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com/api/docs",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('<a href="https://example.com/api/docs"')
      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noopener noreferrer"')
      expect(html).toContain('class="webfetch-url"')
    })

    test("renders URL as span for unsafe URLs", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "javascript:alert('xss')",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain("<a href=")
      expect(html).toContain('<span class="webfetch-url">')
    })

    test("escapes HTML in URL", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com/<script>",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })

    test("renders empty URL as span", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('<span class="webfetch-url"></span>')
    })
  })

  describe("URL truncation", () => {
    test("does not truncate short URLs (<=60 chars)", () => {
      const shortUrl = "https://example.com/short"
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: shortUrl,
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain(shortUrl)
      expect(html).not.toContain("...")
    })

    test("truncates long URLs with ellipsis", () => {
      const longUrl = "https://example.com/very/long/path/to/some/resource/that/exceeds/sixty/characters/definitely.html"
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: longUrl,
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain("...")
      // Should still have full URL in href
      expect(html).toContain(`href="${longUrl}"`)
    })

    test("shows domain in truncated URL", () => {
      const longUrl = "https://docs.example.com/v1/api/resources/users/authentication/oauth2/tokens/refresh"
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: longUrl,
          },
        },
      })

      const html = renderWebFetchTool(part)

      // Displayed (truncated) version should include domain
      expect(html).toContain("docs.example.com")
    })
  })

  describe("URL safety (isSafeUrl)", () => {
    test("allows https URLs", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('<a href="https://example.com"')
    })

    test("allows http URLs", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "http://example.com",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('<a href="http://example.com"')
    })

    test("blocks javascript: URLs", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "javascript:alert(document.cookie)",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain("<a href=")
      expect(html).toContain("<span")
    })

    test("blocks vbscript: URLs", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "vbscript:msgbox('xss')",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain("<a href=")
    })

    test("blocks data: URLs (non-image)", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "data:text/html,<script>alert(1)</script>",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain("<a href=")
    })
  })

  describe("format badge", () => {
    test("renders markdown format badge by default", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('class="webfetch-format"')
      expect(html).toContain(">markdown</span>")
    })

    test("renders text format badge", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
            format: "text",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain(">text</span>")
    })

    test("renders html format badge", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
            format: "html",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain(">html</span>")
    })
  })

  describe("content size", () => {
    test("displays content size in bytes", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: "Hello World", // 11 bytes
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('class="webfetch-size"')
      expect(html).toContain("11 B")
    })

    test("displays content size in KB for larger content", () => {
      const content = "x".repeat(2048) // 2 KB
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: content,
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain("2.0 KB")
    })

    test("does not display size when no content", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: "",
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain('class="webfetch-size"')
    })
  })

  describe("content collapsing", () => {
    test("short content is not collapsed", () => {
      const content = "Line 1\nLine 2\nLine 3"
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: content,
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">-</span>')
    })

    test("long content (>30 lines) is collapsed", () => {
      const content = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join("\n")
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: content,
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">+</span>')
    })

    test("exactly 30 lines is not collapsed", () => {
      const content = Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`).join("\n")
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: content,
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain('class="tool-body collapsed"')
    })
  })

  describe("content rendering", () => {
    test("renders content in pre/code block", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: "Page content here",
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('class="webfetch-content"')
      expect(html).toContain("<pre><code>")
      expect(html).toContain("Page content here")
    })

    test("escapes HTML in content", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: "<script>alert('xss')</script>",
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("does not render content section when empty", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: "",
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain('class="webfetch-content"')
    })
  })

  describe("error handling", () => {
    test("renders error section when error present", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "error",
          input: {
            url: "https://example.com",
          },
          error: "Failed to fetch: Connection refused",
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('class="webfetch-error"')
      expect(html).toContain("Failed to fetch: Connection refused")
      expect(html).toContain('class="error-icon"')
      // Warning icon: ⚠ (&#9888;)
      expect(html).toContain("&#9888;")
    })

    test("does not render error section when no error", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain('class="webfetch-error"')
    })

    test("escapes HTML in error message", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "error",
          input: {
            url: "https://example.com",
          },
          error: "<script>alert('xss')</script>",
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("HTML escaping", () => {
    test("escapes format attribute", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
            format: "<script>bad</script>" as any,
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain("<script>bad")
      expect(html).toContain("&lt;script&gt;")
    })

    test("escapes status attribute", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: '"><script>alert(1)</script>' as any,
          input: {
            url: "https://example.com",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain("<script>alert(1)")
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain('class="tool-call tool-webfetch"')
      expect(html).toContain(">markdown</span>") // Default format
    })

    test("handles undefined output", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: undefined,
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).not.toContain('class="webfetch-content"')
      expect(html).not.toContain('class="webfetch-size"')
    })

    test("handles URL with special characters", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com/search?q=hello%20world&lang=en",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain("https://example.com/search?q=hello%20world")
    })

    test("handles URL with unicode characters", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com/文档",
          },
        },
      })

      const html = renderWebFetchTool(part)

      expect(html).toContain("https://example.com/文档")
    })

    test("handles timeout in input", () => {
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
            timeout: 30,
          },
        },
      })

      const html = renderWebFetchTool(part)

      // Timeout shouldn't affect rendering, just ensure no errors
      expect(html).toContain('class="tool-call tool-webfetch"')
    })

    test("handles very long single-line content", () => {
      const content = "x".repeat(10000)
      const part = createToolPart({
        tool: "webfetch",
        state: {
          status: "completed",
          input: {
            url: "https://example.com",
          },
          output: content,
        },
      })

      const html = renderWebFetchTool(part)

      // Single line = not collapsed
      expect(html).not.toContain('class="tool-body collapsed"')
      expect(html).toContain("9.8 KB")
    })
  })
})
