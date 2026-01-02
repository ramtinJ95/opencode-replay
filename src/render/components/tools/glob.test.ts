/**
 * Tests for glob tool renderer
 */

import { describe, test, expect } from "bun:test"
import { renderGlobTool } from "./glob"
import { createToolPart } from "../../../../tests/fixtures"

describe("renderGlobTool", () => {
  describe("basic rendering", () => {
    test("renders glob tool with pattern", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "**/*.ts" },
          output: "src/file1.ts\nsrc/file2.ts",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="tool-call tool-glob"')
      expect(html).toContain("**/*.ts")
      expect(html).toContain("src/file1.ts")
      expect(html).toContain("src/file2.ts")
    })

    test("renders with status attribute", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.js" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('data-status="completed"')
    })

    test("shows pattern in header", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "src/**/*.test.ts" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="glob-pattern"')
      expect(html).toContain("src/**/*.test.ts")
    })

    test("escapes HTML in pattern", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "<script>*.ts" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("search path", () => {
    test("shows search path when provided", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: {
            pattern: "*.ts",
            path: "/home/user/project",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="glob-path"')
      expect(html).toContain("/home/user/project")
    })

    test("uses default path when not provided", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="glob-path"')
      expect(html).toContain(".")
    })

    test("escapes HTML in path", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: {
            pattern: "*.ts",
            path: "/path/<script>",
          },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("file count", () => {
    test("shows file count", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          output: "file1.ts\nfile2.ts\nfile3.ts",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="glob-count"')
      expect(html).toContain("3 files")
    })

    test("shows zero files", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.nonexistent" },
          output: "",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain("0 files")
    })

    test("shows singular file", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          output: "single.ts",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain("1 files")
    })
  })

  describe("file list", () => {
    test("renders file list", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          output: "src/index.ts\nsrc/utils.ts\ntest.ts",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="glob-file-list"')
      expect(html).toContain('class="glob-file-item"')
      expect(html).toContain("src/index.ts")
      expect(html).toContain("src/utils.ts")
      expect(html).toContain("test.ts")
    })

    test("shows file icons", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*" },
          output: "file.ts\nfile.js\nfile.json",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="glob-file-icon"')
    })

    test("escapes HTML in file names", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*" },
          output: "<script>.ts",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).not.toContain("<script>")
      expect(html).toContain("&lt;script&gt;")
    })

    test("shows message when no matches", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.nonexistent" },
          output: "",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="glob-no-matches"')
      expect(html).toContain("No matching files")
    })

    test("marks long list as collapsed", () => {
      const longList = Array(25).fill("file.ts").map((f, i) => `${f}${i}`).join("\n")
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          output: longList,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">+</span>')
    })

    test("does not collapse short list", () => {
      const shortList = Array(10).fill("file.ts").map((f, i) => `${f}${i}`).join("\n")
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          output: shortList,
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).not.toContain('class="tool-body collapsed"')
      expect(html).toContain('class="tool-toggle">-</span>')
    })
  })

  describe("error handling", () => {
    test("renders error section when error exists", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "error",
          input: { pattern: "*.ts" },
          error: "Invalid pattern",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="glob-error"')
      expect(html).toContain("Invalid pattern")
      expect(html).toContain("&#9888;")
    })

    test("escapes HTML in error", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "error",
          input: { pattern: "*.ts" },
          error: "<script>alert('error')</script>",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).not.toContain("<script>alert")
      expect(html).toContain("&lt;script&gt;")
    })

    test("omits error section when no error", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          output: "file.ts",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).not.toContain('class="glob-error"')
    })
  })

  describe("interactive elements", () => {
    test("includes onclick handler for toggle", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('onclick="this.nextElementSibling.classList.toggle')
    })

    test("includes search icon", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="tool-icon">&#128269;</span>')
    })
  })

  describe("edge cases", () => {
    test("handles missing input gracefully", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="tool-call tool-glob"')
    })

    test("handles empty pattern", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "" },
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      expect(html).toContain('class="glob-pattern"></span>')
    })

    test("filters empty lines from output", () => {
      const part = createToolPart({
        tool: "glob",
        state: {
          status: "completed",
          input: { pattern: "*.ts" },
          output: "file1.ts\n\nfile2.ts\n\n",
          time: { start: 1000, end: 2000 },
        },
      })

      const html = renderGlobTool(part)

      // Should only count non-empty lines
      expect(html).toContain("2 files")
    })
  })
})
