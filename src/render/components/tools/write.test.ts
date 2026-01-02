/**
 * Tests for write tool renderer
 */

import { describe, test, expect } from "bun:test"
import { renderWriteTool } from "./write"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderWriteTool", () => {
  describe("basic rendering", () => {
    test("renders write tool with file path", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/home/user/file.txt",
            content: "Hello, world!",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="tool-call tool-write"')
      expect(html).toContain("file.txt")
      expect(html).toContain("Hello, world!")
    })

    test("renders with status attribute", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: "test",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("shows filename in header", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/path/to/new-file.ts",
            content: "const x = 1;",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="write-file-path"')
      expect(html).toContain("new-file.ts")
    })

    test("shows full path", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/home/user/project/src/index.ts",
            content: "code",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="write-full-path"')
      expect(html).toContain("/home/user/project/src/index.ts")
    })

    test("escapes HTML in file path", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/path/<script>.txt",
            content: "test",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("status badge", () => {
    test("shows success badge when completed", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: "test",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="write-badge badge-success"')
      expect(html).toContain("Created")
    })

    test("shows error badge when failed", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "error",
          input: {
            filePath: "/file.txt",
            content: "test",
          },
          error: "Permission denied",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="write-badge badge-error"')
      expect(html).toContain("Failed")
    })

    test("shows writing badge for other statuses", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "pending",
          input: {
            filePath: "/file.txt",
            content: "test",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="write-badge"')
      expect(html).toContain("Writing...")
    })
  })

  describe("content stats", () => {
    test("shows line count", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: "line 1\nline 2\nline 3",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="write-lines"')
      expect(html).toContain("3 lines")
    })

    test("shows character count", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: "Hello, world!",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="write-chars"')
      // 13 bytes formatted
      expect(html).toContain("13 B")
    })

    test("formats large file sizes", () => {
      const largeContent = "x".repeat(2048)
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: largeContent,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain("2.0 KB")
    })
  })

  describe("content display", () => {
    test("renders content in pre/code block", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.js",
            content: "function test() {\n  return true;\n}",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="write-content"')
      expect(html).toContain("<pre><code>")
      expect(html).toContain("function test()")
    })

    test("escapes HTML in content", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.html",
            content: "<script>alert('xss')</script>",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits content section when no content", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: "",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      // Empty content does not create a content section
      expect(html).not.toContain('class="write-content"')
    })

    test("marks long content as collapsed", () => {
      const longContent = Array(40).fill("line").join("\n")
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: longContent,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">+</span>')
    })

    test("does not collapse short content", () => {
      const shortContent = Array(20).fill("line").join("\n")
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: shortContent,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).not.toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">-</span>')
    })
  })

  describe("error handling", () => {
    test("renders error section when error exists", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "error",
          input: {
            filePath: "/protected/file.txt",
            content: "test",
          },
          error: "Permission denied",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="write-error"')
      expect(html).toContain("Permission denied")
      expect(html).toContain("&#9888;")
    })

    test("escapes HTML in error", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "error",
          input: {
            filePath: "/file.txt",
            content: "test",
          },
          error: "<script>alert('error')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits error section when no error", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: "test",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).not.toContain('class="write-error"')
    })
  })

  describe("interactive elements", () => {
    test("includes onclick handler for toggle", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: "test",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('onclick="this.nextElementSibling.classList.toggle')
    })

    test("includes write icon", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: "test",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="tool-icon">&#128221;</span>')
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain('class="tool-call tool-write"')
    })

    test("falls back to state.title for file path", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          title: "my-file.txt",
          input: {
            content: "test",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain("my-file.txt")
    })

    test("handles empty content", () => {
      const part = createToolPart({
        tool: "write",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            content: "",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderWriteTool(part)

      expect(html).toContain("0 lines")
      expect(html).toContain("0 B")
    })
  })
})
