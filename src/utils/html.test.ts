/**
 * Tests for HTML escaping and rendering utilities
 */

import { describe, test, expect } from "bun:test"
import {
  escapeHtml,
  escapeAttr,
  nl2br,
  isSafeUrl,
  renderMarkdown,
  truncate,
  slugify,
} from "./html"

// =============================================================================
// escapeHtml
// =============================================================================

describe("escapeHtml", () => {
  test("escapes ampersand", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry")
  })

  test("escapes less than", () => {
    expect(escapeHtml("a < b")).toBe("a &lt; b")
  })

  test("escapes greater than", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b")
  })

  test("escapes double quotes", () => {
    expect(escapeHtml('Say "hello"')).toBe("Say &quot;hello&quot;")
  })

  test("escapes single quotes", () => {
    expect(escapeHtml("It's fine")).toBe("It&#39;s fine")
  })

  test("escapes all special characters together", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    )
  })

  test("returns empty string for null", () => {
    expect(escapeHtml(null)).toBe("")
  })

  test("returns empty string for undefined", () => {
    expect(escapeHtml(undefined)).toBe("")
  })

  test("handles empty string", () => {
    expect(escapeHtml("")).toBe("")
  })

  test("preserves safe text", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World")
    expect(escapeHtml("abc123")).toBe("abc123")
  })
})

// =============================================================================
// escapeAttr
// =============================================================================

describe("escapeAttr", () => {
  test("escapes attribute values", () => {
    expect(escapeAttr('value with "quotes"')).toBe(
      "value with &quot;quotes&quot;"
    )
  })

  test("escapes HTML entities in attributes", () => {
    expect(escapeAttr("<script>")).toBe("&lt;script&gt;")
  })
})

// =============================================================================
// nl2br
// =============================================================================

describe("nl2br", () => {
  test("converts newlines to br tags", () => {
    expect(nl2br("line1\nline2")).toBe("line1<br>line2")
  })

  test("handles multiple newlines", () => {
    expect(nl2br("a\nb\nc")).toBe("a<br>b<br>c")
  })

  test("escapes HTML before converting newlines", () => {
    expect(nl2br("<script>\nalert('xss')\n</script>")).toBe(
      "&lt;script&gt;<br>alert(&#39;xss&#39;)<br>&lt;/script&gt;"
    )
  })

  test("handles empty string", () => {
    expect(nl2br("")).toBe("")
  })

  test("handles string without newlines", () => {
    expect(nl2br("no newlines here")).toBe("no newlines here")
  })
})

// =============================================================================
// isSafeUrl
// =============================================================================

describe("isSafeUrl", () => {
  describe("allows safe URLs", () => {
    test("allows http URLs", () => {
      expect(isSafeUrl("http://example.com")).toBe(true)
      expect(isSafeUrl("http://example.com/path")).toBe(true)
    })

    test("allows https URLs", () => {
      expect(isSafeUrl("https://example.com")).toBe(true)
      expect(isSafeUrl("https://example.com/path?query=1")).toBe(true)
    })

    test("allows relative URLs starting with /", () => {
      expect(isSafeUrl("/path/to/page")).toBe(true)
      expect(isSafeUrl("/")).toBe(true)
    })

    test("allows hash links", () => {
      expect(isSafeUrl("#section")).toBe(true)
      expect(isSafeUrl("#")).toBe(true)
    })

    test("allows relative paths with ./", () => {
      expect(isSafeUrl("./file.html")).toBe(true)
    })

    test("allows relative paths with ../", () => {
      expect(isSafeUrl("../file.html")).toBe(true)
    })

    test("allows data:image URLs", () => {
      expect(isSafeUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true)
      expect(isSafeUrl("data:image/jpeg;base64,/9j/4AAQ")).toBe(true)
      expect(isSafeUrl("data:image/gif;base64,R0lGOD")).toBe(true)
    })

    test("allows simple filenames without protocol", () => {
      expect(isSafeUrl("file.html")).toBe(true)
      expect(isSafeUrl("path/to/file")).toBe(true)
    })
  })

  describe("blocks dangerous URLs", () => {
    test("blocks javascript: protocol", () => {
      expect(isSafeUrl("javascript:alert('xss')")).toBe(false)
      expect(isSafeUrl("JAVASCRIPT:alert('xss')")).toBe(false)
    })

    test("blocks vbscript: protocol", () => {
      expect(isSafeUrl("vbscript:msgbox('xss')")).toBe(false)
    })

    test("blocks data: URLs that are not images", () => {
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false)
      expect(isSafeUrl("data:application/javascript,alert(1)")).toBe(false)
    })

    test("blocks other protocol URLs", () => {
      expect(isSafeUrl("file:///etc/passwd")).toBe(false)
      expect(isSafeUrl("ftp://example.com")).toBe(false)
    })
  })
})

// =============================================================================
// renderMarkdown
// =============================================================================

describe("renderMarkdown", () => {
  describe("code blocks", () => {
    test("renders fenced code blocks with language", () => {
      const input = "```javascript\nconst x = 1;\n```"
      const result = renderMarkdown(input)
      expect(result).toContain('class="code-block-wrapper"')
      expect(result).toContain('class="code-language"')
      expect(result).toContain("javascript")
      expect(result).toContain('class="language-javascript"')
      expect(result).toContain("const x = 1;")
    })

    test("renders code blocks without language as text", () => {
      const input = "```\nplain code\n```"
      const result = renderMarkdown(input)
      expect(result).toContain('class="language-text"')
      expect(result).toContain("plain code")
    })

    test("handles code blocks with special language names", () => {
      const input = "```c++\nint main() {}\n```"
      const result = renderMarkdown(input)
      // Language display should show c++
      expect(result).toContain("c++")
      // CSS class should be sanitized
      expect(result).toContain('class="language-c"')
    })
  })

  describe("inline code", () => {
    test("renders inline code", () => {
      const input = "Use `const` for constants"
      const result = renderMarkdown(input)
      expect(result).toContain("<code>const</code>")
    })

    test("handles multiple inline code spans", () => {
      const input = "Use `let` or `const`"
      const result = renderMarkdown(input)
      expect(result).toContain("<code>let</code>")
      expect(result).toContain("<code>const</code>")
    })
  })

  describe("text formatting", () => {
    test("renders bold text", () => {
      const input = "This is **bold** text"
      const result = renderMarkdown(input)
      expect(result).toContain("<strong>bold</strong>")
    })

    test("renders italic text", () => {
      const input = "This is *italic* text"
      const result = renderMarkdown(input)
      expect(result).toContain("<em>italic</em>")
    })

    test("handles bold and italic separately", () => {
      // Note: The current implementation uses simple regex and doesn't support
      // true nested formatting. This tests the actual behavior.
      const input = "**bold** and *italic*"
      const result = renderMarkdown(input)
      expect(result).toContain("<strong>bold</strong>")
      expect(result).toContain("<em>italic</em>")
    })
  })

  describe("links", () => {
    test("renders links with safe URLs", () => {
      const input = "Visit [GitHub](https://github.com)"
      const result = renderMarkdown(input)
      expect(result).toContain('href="https://github.com"')
      expect(result).toContain(">GitHub</a>")
      expect(result).toContain('target="_blank"')
      expect(result).toContain('rel="noopener noreferrer"')
    })

    test("sanitizes dangerous URLs in links", () => {
      const input = "[Click](javascript:alert('xss'))"
      const result = renderMarkdown(input)
      expect(result).toContain('href="#"')
      expect(result).not.toContain("javascript:")
    })
  })

  describe("paragraphs", () => {
    test("wraps content in paragraphs", () => {
      const input = "First paragraph\n\nSecond paragraph"
      const result = renderMarkdown(input)
      expect(result).toContain("<p>First paragraph</p>")
      expect(result).toContain("<p>Second paragraph</p>")
    })

    test("converts single newlines to br", () => {
      const input = "Line 1\nLine 2"
      const result = renderMarkdown(input)
      expect(result).toContain("Line 1<br>Line 2")
    })
  })

  describe("HTML escaping", () => {
    test("escapes HTML in regular text", () => {
      const input = "Use <div> tags"
      const result = renderMarkdown(input)
      expect(result).toContain("&lt;div&gt;")
      expect(result).not.toContain("<div>")
    })

    test("escapes HTML in code blocks", () => {
      const input = "```html\n<script>alert('xss')</script>\n```"
      const result = renderMarkdown(input)
      expect(result).toContain("&lt;script&gt;")
    })
  })
})

// =============================================================================
// truncate
// =============================================================================

describe("truncate", () => {
  test("returns string as-is when shorter than max length", () => {
    expect(truncate("hello", 10)).toBe("hello")
  })

  test("returns string as-is when equal to max length", () => {
    expect(truncate("hello", 5)).toBe("hello")
  })

  test("truncates and adds ellipsis when longer than max length", () => {
    expect(truncate("hello world", 8)).toBe("hello...")
  })

  test("handles very short max length", () => {
    expect(truncate("hello", 4)).toBe("h...")
  })

  test("returns empty string for null", () => {
    expect(truncate(null, 10)).toBe("")
  })

  test("returns empty string for undefined", () => {
    expect(truncate(undefined, 10)).toBe("")
  })

  test("handles empty string", () => {
    expect(truncate("", 10)).toBe("")
  })
})

// =============================================================================
// slugify
// =============================================================================

describe("slugify", () => {
  test("converts to lowercase", () => {
    expect(slugify("HELLO")).toBe("hello")
  })

  test("replaces spaces with hyphens", () => {
    expect(slugify("hello world")).toBe("hello-world")
  })

  test("replaces multiple spaces with single hyphen", () => {
    expect(slugify("hello   world")).toBe("hello-world")
  })

  test("removes special characters", () => {
    expect(slugify("hello@world!")).toBe("hello-world")
  })

  test("removes leading and trailing hyphens", () => {
    expect(slugify("  hello world  ")).toBe("hello-world")
    expect(slugify("---hello---")).toBe("hello")
  })

  test("handles complex strings", () => {
    expect(slugify("Hello, World! How are you?")).toBe("hello-world-how-are-you")
  })

  test("preserves numbers", () => {
    expect(slugify("Test 123")).toBe("test-123")
  })

  test("handles empty string", () => {
    expect(slugify("")).toBe("")
  })
})
