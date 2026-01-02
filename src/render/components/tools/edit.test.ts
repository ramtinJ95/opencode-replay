/**
 * Tests for edit tool renderer
 */

import { describe, test, expect } from "bun:test"
import { renderEditTool } from "./edit"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderEditTool", () => {
  describe("basic rendering", () => {
    test("renders edit tool with file path", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/home/user/file.txt",
            oldString: "hello",
            newString: "world",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="tool-call tool-edit"')
      expect(html).toContain("file.txt")
      expect(html).toContain("hello")
      expect(html).toContain("world")
    })

    test("renders with status attribute", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "a",
            newString: "b",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("shows filename in header", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/path/to/my-file.ts",
            oldString: "old",
            newString: "new",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="edit-file-path"')
      expect(html).toContain("my-file.ts")
    })

    test("shows full path in header", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/home/user/project/src/index.ts",
            oldString: "old",
            newString: "new",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="edit-full-path"')
      expect(html).toContain("/home/user/project/src/index.ts")
    })

    test("escapes HTML in file path", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/path/<script>.txt",
            oldString: "old",
            newString: "new",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("diff stats", () => {
    test("shows line counts for old and new strings", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "line1\nline2\nline3",
            newString: "line1\nline2",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="edit-stats"')
      expect(html).toContain("3 lines")
      expect(html).toContain("2 lines")
    })

    test("shows single line count", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "single line",
            newString: "also single",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain("1 lines")
    })

    test("includes arrow between old and new", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "old",
            newString: "new",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="edit-arrow"')
      expect(html).toContain("&#8594;") // right arrow
    })
  })

  describe("replaceAll handling", () => {
    test("shows replaceAll badge when true", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "foo",
            newString: "bar",
            replaceAll: true,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="edit-replace-all"')
      expect(html).toContain("Replace All")
    })

    test("omits replaceAll badge when false", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "foo",
            newString: "bar",
            replaceAll: false,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).not.toContain('class="edit-replace-all"')
    })

    test("omits replaceAll badge when undefined", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "foo",
            newString: "bar",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).not.toContain('class="edit-replace-all"')
    })
  })

  describe("side-by-side diff", () => {
    test("renders side-by-side diff for short strings", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "const x = 1;",
            newString: "const x = 2;",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="edit-diff"')
      expect(html).toContain('class="diff-old"')
      expect(html).toContain('class="diff-new"')
      expect(html).toContain('class="diff-label">Old</div>')
      expect(html).toContain('class="diff-label">New</div>')
    })

    test("escapes HTML in old string", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.html",
            oldString: "<script>alert('old')</script>",
            newString: "safe text",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("escapes HTML in new string", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.html",
            oldString: "old text",
            newString: "<img src=x onerror=alert(1)>",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).not.toContain("<img src=x")
      expect(html).toContain("&lt;img")
    })
  })

  describe("collapsible diff for long content", () => {
    test("uses collapsible sections for long strings", () => {
      const longOld = Array(60).fill("line").join("\n")
      const longNew = Array(55).fill("updated").join("\n")

      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: longOld,
            newString: longNew,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="edit-diff-long"')
      expect(html).toContain("<details")
      expect(html).toContain("<summary")
      expect(html).toContain("60 lines")
      expect(html).toContain("55 lines")
    })

    test("new section is open by default for long diff", () => {
      const longOld = Array(60).fill("line").join("\n")
      const longNew = Array(55).fill("updated").join("\n")

      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: longOld,
            newString: longNew,
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      // New section should have "open" attribute
      expect(html).toMatch(/<details[^>]*class="diff-section diff-new-section"[^>]*open/)
    })

    test("uses side-by-side for strings at threshold", () => {
      const at50Lines = Array(50).fill("line").join("\n")

      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: at50Lines,
            newString: "new",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      // 50 lines should use side-by-side
      expect(html).toContain('class="edit-diff"')
      expect(html).not.toContain('class="edit-diff-long"')
    })
  })

  describe("error handling", () => {
    test("renders error section when error exists", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "error",
          input: {
            filePath: "/file.txt",
            oldString: "old",
            newString: "new",
          },
          error: "File not found",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="edit-error"')
      expect(html).toContain("File not found")
      expect(html).toContain("&#9888;") // warning icon
    })

    test("escapes HTML in error message", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "error",
          input: {
            filePath: "/file.txt",
            oldString: "old",
            newString: "new",
          },
          error: "<script>alert('error')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits error section when no error", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "old",
            newString: "new",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).not.toContain('class="edit-error"')
    })
  })

  describe("interactive elements", () => {
    test("includes onclick handler for toggle", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "old",
            newString: "new",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('onclick="this.nextElementSibling.classList.toggle')
    })

    test("includes edit icon", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "old",
            newString: "new",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="tool-icon">&#9998;</span>')
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="tool-call tool-edit"')
    })

    test("falls back to state.title for file path", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          title: "my-file.txt",
          input: {
            oldString: "old",
            newString: "new",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain("my-file.txt")
    })

    test("handles empty strings", () => {
      const part = createToolPart({
        tool: "edit",
        state: {
          status: "completed",
          input: {
            filePath: "/file.txt",
            oldString: "",
            newString: "",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderEditTool(part)

      expect(html).toContain('class="tool-call tool-edit"')
      // Empty string counts as 1 line
      expect(html).toContain("1 lines")
    })
  })
})
