/**
 * Tests for read tool renderer
 */

import { describe, test, expect } from "bun:test"
import { renderReadTool } from "./read"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderReadTool", () => {
  describe("basic rendering", () => {
    test("renders read tool with file path", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/home/user/file.txt" },
          output: "file contents here",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="tool-call tool-read"')
      expect(html).toContain("file.txt")
      expect(html).toContain("file contents here")
    })

    test("renders with status attribute", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("shows filename in header", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/path/to/my-component.tsx" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="read-file-path"')
      expect(html).toContain("my-component.tsx")
    })

    test("shows full path", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/home/user/project/src/index.ts" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="read-full-path"')
      expect(html).toContain("/home/user/project/src/index.ts")
    })

    test("escapes HTML in file path", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/path/<script>.txt" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("range info", () => {
    test("shows offset info when provided", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            offset: 100,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="read-range"')
      expect(html).toContain("from line 100")
    })

    test("shows limit info when provided", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            limit: 50,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain("50 lines")
    })

    test("shows both offset and limit", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            offset: 10,
            limit: 20,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain("from line 10")
      expect(html).toContain("20 lines")
    })

    test("omits range info when not provided", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).not.toContain('class="read-range"')
    })
  })

  describe("line count", () => {
    test("shows line count in output", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          output: "line 1\nline 2\nline 3",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="read-lines"')
      expect(html).toContain("3 lines")
    })

    test("shows singular line", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          output: "single line",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain("1 lines")
    })

    test("omits line info when no output", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).not.toContain('class="read-lines"')
    })
  })

  describe("content display", () => {
    test("renders content in pre/code block", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          output: "   1\tfunction test() {\n   2\t  return true;\n   3\t}",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="read-content"')
      expect(html).toContain("<pre><code>")
      expect(html).toContain("function test()")
    })

    test("escapes HTML in content", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.html" },
          output: "<script>alert('xss')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits content section when no output", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).not.toContain('class="read-content"')
    })

    test("marks long output as collapsed", () => {
      const longOutput = Array(60).fill("line").join("\n")
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          output: longOutput,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">+</span>')
    })

    test("does not collapse short output", () => {
      const shortOutput = Array(30).fill("line").join("\n")
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          output: shortOutput,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).not.toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">-</span>')
    })
  })

  describe("error handling", () => {
    test("renders error section when error exists", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "error",
          input: { filePath: "/nonexistent.txt" },
          error: "File not found",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="read-error"')
      expect(html).toContain("File not found")
      expect(html).toContain("&#9888;")
    })

    test("escapes HTML in error", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "error",
          input: { filePath: "/file.txt" },
          error: "<script>alert('error')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits error section when no error", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          output: "content",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).not.toContain('class="read-error"')
    })
  })

  describe("interactive elements", () => {
    test("includes onclick handler for toggle", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('onclick="this.nextElementSibling.classList.toggle')
    })

    test("includes read icon", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          input: { filePath: "/file.txt" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="tool-icon">&#128196;</span>')
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain('class="tool-call tool-read"')
    })

    test("falls back to state.title for file path", () => {
      const part = createToolPart({
        tool: "read",
        state: {
          status: "completed",
          title: "my-file.txt",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderReadTool(part)

      expect(html).toContain("my-file.txt")
    })
  })
})
